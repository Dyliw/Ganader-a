from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from datetime import date, timedelta


class MedicamentosService:
    
    @staticmethod
    def calcular_dosis(db: Session, id_medicamento: int, arete: str) -> dict:
        """Calcula la dosis automática según tipo de medicamento y peso del animal"""
        
        # Obtener medicamento
        med = db.execute(text("""
            SELECT id_medicamento, nombre, tipo_dosis, dosis_fija, dosis_kg, unidad_medida
            FROM medicamentos
            WHERE id_medicamento = :id AND activo = true
        """), {"id": id_medicamento}).fetchone()
        
        if not med:
            raise HTTPException(status_code=404, detail="Medicamento no encontrado")
        
        # Obtener peso del animal
        peso = db.execute(text("""
            SELECT COALESCE(
                (SELECT hp.peso FROM historial_peso hp 
                 WHERE hp.arete = :arete ORDER BY hp.fecha DESC LIMIT 1),
                a.peso_entrada
            ) as peso
            FROM animales a
            WHERE a.arete = :arete AND a.fecha_muerte IS NULL
        """), {"arete": arete}).fetchone()
        
        if not peso:
            raise HTTPException(status_code=404, detail="Animal no encontrado")
        
        dosis_calculada = None
        if med.tipo_dosis == 'Fija':
            dosis_calculada = float(med.dosis_fija)
        elif med.tipo_dosis == 'Proporcional':
            dosis_calculada = round(float(med.dosis_kg) * float(peso.peso), 2)
        
        return {
            "id_medicamento": med.id_medicamento,
            "nombre": med.nombre,
            "tipo_dosis": med.tipo_dosis,
            "dosis_fija": float(med.dosis_fija) if med.dosis_fija else None,
            "dosis_kg": float(med.dosis_kg) if med.dosis_kg else None,
            "peso_animal": float(peso.peso),
            "dosis_calculada": dosis_calculada,
            "unidad_medida": med.unidad_medida
        }
    
    @staticmethod
    def aplicar_tratamiento(db: Session, data: dict) -> dict:
        """Aplica un tratamiento individual"""
        
        # Validar medicamento
        med = db.execute(text("""
            SELECT * FROM medicamentos WHERE id_medicamento = :id AND activo = true
        """), {"id": data["id_medicamento"]}).fetchone()
        
        if not med:
            raise HTTPException(status_code=404, detail="Medicamento no encontrado")
        
        # Validar animal
        animal = db.execute(text("""
            SELECT arete FROM animales WHERE arete = :arete AND fecha_muerte IS NULL
        """), {"arete": data["arete"]}).fetchone()
        
        if not animal:
            raise HTTPException(status_code=404, detail="Animal no encontrado o ya fallecido")
        
        # Validar stock
        dosis = float(data["dosis_aplicada"])
        if float(med.stock_actual) < dosis:
            raise HTTPException(status_code=400, detail="Stock insuficiente")
        
        # Insertar tratamiento
        resultado = db.execute(text("""
            INSERT INTO tratamientos 
            (arete, id_medicamento, dosis_aplicada, fecha_aplicacion, id_empleado, observaciones)
            VALUES (:arete, :med, :dosis, COALESCE(:fecha, CURRENT_DATE), :emp, :obs)
            RETURNING id_tratamiento, fecha_disponible
        """), {
            "arete": data["arete"],
            "med": data["id_medicamento"],
            "dosis": dosis,
            "fecha": data.get("fecha_aplicacion"),
            "emp": data.get("id_empleado", 4),
            "obs": data.get("observaciones", "")
        })
        
        tratamiento = resultado.fetchone()
        
        # Descontar stock
        db.execute(text("""
            UPDATE medicamentos 
            SET stock_actual = stock_actual - :dosis
            WHERE id_medicamento = :id
        """), {"id": data["id_medicamento"], "dosis": dosis})
        
        # Registrar en historial
        db.execute(text("""
            INSERT INTO historial_eventos (arete, id_tipo, descripcion, id_empleado)
            VALUES (:arete, 
                    (SELECT id_tipo FROM tipo_evento WHERE nombre = 'Tratamiento'),
                    :desc, :emp)
        """), {
            "arete": data["arete"],
            "desc": f"Tratamiento: {med.nombre} - Dosis: {dosis} {med.unidad_medida}",
            "emp": data.get("id_empleado", 4)
        })
        
        db.commit()
        
        return {
            "mensaje": "Tratamiento aplicado exitosamente",
            "id_tratamiento": tratamiento.id_tratamiento,
            "fecha_disponible": str(tratamiento.fecha_disponible) if tratamiento.fecha_disponible else None,
            "medicamento": med.nombre
        }
    
    @staticmethod
    def aplicar_tratamiento_masivo(db: Session, data: dict) -> dict:
        """Aplica tratamiento a todos los animales de un corral"""
        
        id_corral = data["id_corral"]
        id_medicamento = data["id_medicamento"]
        
        # Obtener animales del corral
        animales = db.execute(text("""
            SELECT a.arete,
                   COALESCE(
                       (SELECT hp.peso FROM historial_peso hp 
                        WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                       a.peso_entrada
                   ) as peso
            FROM animales a
            WHERE a.id_corral_actual = :corral
            AND a.fecha_muerte IS NULL
        """), {"corral": id_corral}).fetchall()
        
        if not animales:
            raise HTTPException(status_code=404, detail="No hay animales en este corral")
        
        # Obtener medicamento
        med = db.execute(text("""
            SELECT * FROM medicamentos WHERE id_medicamento = :id
        """), {"id": id_medicamento}).fetchone()
        
        tratados = 0
        errores = []
        
        for animal in animales:
            try:
                # Calcular dosis
                if med.tipo_dosis == 'Fija':
                    dosis = float(med.dosis_fija)
                else:
                    dosis = round(float(med.dosis_kg) * float(animal.peso), 2)
                
                # Aplicar tratamiento individual
                MedicamentosService.aplicar_tratamiento(db, {
                    "arete": animal.arete,
                    "id_medicamento": id_medicamento,
                    "dosis_aplicada": dosis,
                    "fecha_aplicacion": data.get("fecha_aplicacion"),
                    "id_empleado": data.get("id_empleado", 4),
                    "observaciones": data.get("observaciones", "")
                })
                tratados += 1
            except Exception as e:
                errores.append(f"{animal.arete}: {str(e)}")
        
        return {
            "mensaje": f"Tratamiento masivo completado",
            "animales_totales": len(animales),
            "animales_tratados": tratados,
            "errores": errores,
            "medicamento": med.nombre
        }
    
    @staticmethod
    def obtener_animales_en_retiro(db: Session) -> list:
        """Obtiene animales que están en periodo de retiro"""
        
        animales = db.execute(text("""
            SELECT 
                a.arete,
                a.clasificacion,
                a.sexo,
                COALESCE(
                    (SELECT hp.peso FROM historial_peso hp 
                     WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                ) as peso_actual,
                t.fecha_disponible,
                (t.fecha_disponible - CURRENT_DATE) as dias_restantes,
                m.nombre as medicamento_nombre,
                c.nombre as corral_nombre
            FROM animales a
            JOIN (
                SELECT DISTINCT ON (arete) 
                    arete, 
                    fecha_disponible, 
                    id_medicamento
                FROM tratamientos
                WHERE fecha_disponible > CURRENT_DATE
                ORDER BY arete, fecha_disponible DESC
            ) t ON a.arete = t.arete
            JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
            LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
            WHERE a.fecha_muerte IS NULL
            ORDER BY t.fecha_disponible ASC
        """)).fetchall()
        
        # Construir lista de diccionarios manualmente
        resultado = []
        for a in animales:
            resultado.append({
                "arete": a.arete,
                "clasificacion": a.clasificacion,
                "sexo": a.sexo,
                "peso_actual": float(a.peso_actual) if a.peso_actual else 0,
                "fecha_disponible": str(a.fecha_disponible) if a.fecha_disponible else None,
                "dias_restantes": int(a.dias_restantes) if a.dias_restantes else 0,
                "medicamento_nombre": a.medicamento_nombre,
                "corral_nombre": a.corral_nombre
            })
        
        return resultado
    
    @staticmethod
    def obtener_animales_disponibles_venta(db: Session) -> list:
        """Animales que NO están en retiro y están vivos"""
        
        animales = db.execute(text("""
            SELECT 
                a.arete,
                a.clasificacion,
                a.sexo,
                a.meses,
                COALESCE(
                    (SELECT hp.peso FROM historial_peso hp 
                     WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                ) as peso_actual,
                c.nombre as corral_nombre,
                e.nombre as estado_nombre
            FROM animales a
            LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
            JOIN estado e ON a.id_estado = e.id_estado
            WHERE a.fecha_muerte IS NULL
            AND e.nombre NOT IN ('Vendido', 'Muerto')
            AND a.arete NOT IN (
                SELECT DISTINCT arete 
                FROM tratamientos 
                WHERE fecha_disponible > CURRENT_DATE
            )
            ORDER BY a.arete
        """)).fetchall()
        
        # Construir lista de diccionarios manualmente
        resultado = []
        for a in animales:
            resultado.append({
                "arete": a.arete,
                "clasificacion": a.clasificacion,
                "sexo": a.sexo,
                "meses": a.meses,
                "peso_actual": float(a.peso_actual) if a.peso_actual else 0,
                "corral_nombre": a.corral_nombre,
                "estado_nombre": a.estado_nombre
            })
        
        return resultado
    
    @staticmethod
    def obtener_caducados(db: Session) -> list:
        """Medicamentos caducados con stock"""
        
        caducados = db.execute(text("""
            SELECT 
                m.id_medicamento,
                m.nombre,
                m.stock_actual,
                m.unidad_medida,
                ea.fecha_caducidad
            FROM entrada_almacen ea
            JOIN medicamentos m ON ea.id_medicamento = m.id_medicamento
            WHERE ea.fecha_caducidad < CURRENT_DATE
            AND m.stock_actual > 0
            AND m.activo = true
            ORDER BY ea.fecha_caducidad ASC
        """)).fetchall()
        
        # Construir lista de diccionarios manualmente
        resultado = []
        for c in caducados:
            resultado.append({
                "id_medicamento": c.id_medicamento,
                "nombre": c.nombre,
                "stock_actual": float(c.stock_actual) if c.stock_actual else 0,
                "unidad_medida": c.unidad_medida,
                "fecha_caducidad": str(c.fecha_caducidad) if c.fecha_caducidad else None
            })
        
        return resultado
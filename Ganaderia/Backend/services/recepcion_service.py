import re
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.schemas.recepcion import AnimalCreate, AnimalesRango, RecepcionCompletaCreate
from typing import List, Dict

router = APIRouter()

class RecepcionService:
    
    @staticmethod
    def registrar_recepcion_completa(db: Session, datos: RecepcionCompletaCreate, empleado_id: int) -> dict:
        """
        Registra GUÍA + RECEPCIÓN + ANIMALES en una sola operación
        """
        
        # 1. REGISTRAR GUÍA DE TRÁNSITO
        existe_guia = db.execute(
            text("SELECT id_guia FROM guias_transito WHERE numero_guia = :num"),
            {"num": datos.numero_guia}
        ).fetchone()
        
        if existe_guia:
            raise HTTPException(status_code=400, detail=f"La guía {datos.numero_guia} ya existe")
        
        resultado_guia = db.execute(text("""
            INSERT INTO guias_transito (numero_guia, id_proveedor, motivo, fecha, observaciones)
            VALUES (:num, :prov, :motivo, COALESCE(:fecha, CURRENT_DATE), :obs)
            RETURNING id_guia
        """), {
            "num": datos.numero_guia,
            "prov": datos.id_proveedor,
            "motivo": datos.motivo,
            "fecha": datos.fecha_guia,
            "obs": datos.observaciones_guia
        })
        id_guia = resultado_guia.fetchone().id_guia
        
        # 2. REGISTRAR RECEPCIÓN
        resultado_recepcion = db.execute(text("""
            INSERT INTO recepcion_lotes (
                id_guia, fecha_recepcion, fecha_guia,
                animales_programados, animales_recibidos,
                animales_muertos, animales_enfermos,
                id_empleado, corral_asignado, observaciones
            ) VALUES (
                :id_guia, CURRENT_DATE, COALESCE(:fecha_guia, CURRENT_DATE),
                :programados, :recibidos,
                :muertos, :enfermos,
                :empleado, :corral, :obs
            )
            RETURNING id_recepcion
        """), {
            "id_guia": id_guia,
            "fecha_guia": datos.fecha_guia,
            "programados": datos.animales_programados,
            "recibidos": datos.animales_recibidos,
            "muertos": datos.animales_muertos,
            "enfermos": datos.animales_enfermos,
            "empleado": empleado_id,
            "corral": datos.id_corral,
            "obs": datos.observaciones_recepcion
        })
        id_recepcion = resultado_recepcion.fetchone().id_recepcion
        
        # 3. REGISTRAR ANIMALES (si vienen en la solicitud)
        animales_registrados = 0
        errores_animales = []
        
        if datos.animales:
            # Registrar lista de animales individuales
            for animal in datos.animales:
                try:
                    animal.id_guia = id_guia
                    animal.id_proveedor = datos.id_proveedor
                    animal.id_corral = datos.id_corral
                    RecepcionService._insertar_animal(db, animal, empleado_id)
                    animales_registrados += 1
                except HTTPException as e:
                    errores_animales.append(f"{animal.arete}: {e.detail}")
        
        elif datos.rango_animales:
            # Registrar rango de animales
            resultado_rango = RecepcionService._registrar_rango_interno(
                db, datos.rango_animales, empleado_id, id_guia, datos.id_proveedor
            )
            animales_registrados = resultado_rango['registrados']
            errores_animales = resultado_rango['errores']
        
        db.commit()
        
        # 4. Obtener datos completos para respuesta
        recepcion_completa = db.execute(text("""
            SELECT * FROM v_recepciones_completas
            WHERE id_recepcion = :id_rec
        """), {"id_rec": id_recepcion}).fetchone()
        
        # CORRECCIÓN AQUÍ: usar ._mapping para convertir a dict
        recepcion_dict = dict(recepcion_completa._mapping) if recepcion_completa else None
        
        return {
            "mensaje": "Recepción registrada exitosamente",
            "id_recepcion": id_recepcion,
            "id_guia": id_guia,
            "numero_guia": datos.numero_guia,
            "animales_registrados": animales_registrados,
            "errores_animales": errores_animales,
            "recepcion": recepcion_dict
        }
    
    @staticmethod
    def _insertar_animal(db: Session, datos: AnimalCreate, empleado_id: int):
        """Inserta un animal en la BD"""
        existe = db.execute(
            text("SELECT arete FROM animales WHERE arete = :arete"),
            {"arete": datos.arete}
        ).fetchone()
        
        if existe:
            raise HTTPException(status_code=400, detail=f"Arete duplicado: {datos.arete}")
        
        # Verificar capacidad del corral
        if datos.id_corral:
            corral = db.execute(text("""
                SELECT c.capacidad, COUNT(a.arete) as ocupacion
                FROM corrales c
                LEFT JOIN animales a ON a.id_corral_actual = c.id_corral AND a.fecha_muerte IS NULL
                WHERE c.id_corral = :id_corral
                GROUP BY c.capacidad
            """), {"id_corral": datos.id_corral}).fetchone()
            
            if corral and corral.ocupacion >= corral.capacidad:
                raise HTTPException(status_code=400, detail="Corral lleno")
        
        # Obtener estado "Comprado"
        estado = db.execute(
            text("SELECT id_estado FROM estado WHERE nombre = 'Comprado'")
        ).fetchone()
        
        # Insertar
        db.execute(text("""
            INSERT INTO animales (
                arete, id_estado, sexo, peso_entrada, meses,
                precio_compra, id_proveedor, id_corral_actual,
                id_guia, creado_por, observaciones
            ) VALUES (
                :arete, :estado, :sexo, :peso, :meses,
                :precio, :proveedor, :corral,
                :guia, :empleado, :obs
            )
        """), {
            "arete": datos.arete,
            "estado": estado.id_estado,
            "sexo": datos.sexo,
            "peso": datos.peso_entrada,
            "meses": datos.meses,
            "precio": datos.precio_compra,
            "proveedor": datos.id_proveedor,
            "corral": datos.id_corral,
            "guia": datos.id_guia,
            "empleado": empleado_id,
            "obs": datos.observaciones
        })
    
    @staticmethod
    def _registrar_rango_interno(db: Session, datos: AnimalesRango, empleado_id: int, id_guia: int, id_proveedor: int) -> dict:
        """Registra rango de animales"""
        prefijo = re.sub(r'\d+$', '', datos.arete_inicial)
        num_inicial = int(re.search(r'(\d+)$', datos.arete_inicial).group(1))
        num_final = int(re.search(r'(\d+)$', datos.arete_final).group(1))
        
        registrados = 0
        errores = []
        
        for i in range(num_inicial, num_final + 1):
            arete = f"{prefijo}{i:0{len(str(num_inicial))}d}"
            try:
                animal = AnimalCreate(
                    arete=arete,
                    sexo=datos.sexo,
                    peso_entrada=datos.peso_promedio,
                    meses=datos.meses_promedio,
                    precio_compra=datos.precio_compra,
                    id_proveedor=id_proveedor,
                    id_corral=datos.id_corral,
                    id_guia=id_guia
                )
                RecepcionService._insertar_animal(db, animal, empleado_id)
                registrados += 1
            except HTTPException as e:
                errores.append(f"{arete}: {e.detail}")
            except Exception as e:
                errores.append(f"{arete}: {str(e)}")
        
        return {"registrados": registrados, "errores": errores}
    
    @staticmethod
    def registrar_animal_individual(db: Session, datos: AnimalCreate, empleado_id: int) -> dict:
        """Registra un animal individual"""
        RecepcionService._insertar_animal(db, datos, empleado_id)
        db.commit()
        return {"mensaje": f"Animal {datos.arete} registrado", "arete": datos.arete}
    
    @staticmethod
    def listar_recepciones(db: Session, pagina: int = 1, limite: int = 20) -> dict:
        """Lista todas las recepciones con paginación"""
        offset = (pagina - 1) * limite
        
        # Verificar si la vista existe, si no, usar query directa
        try:
            total = db.execute(text(
                "SELECT COUNT(*) as total FROM v_recepciones_completas"
            )).fetchone().total
            
            recepciones = db.execute(text("""
                SELECT * FROM v_recepciones_completas
                ORDER BY fecha_recepcion DESC
                LIMIT :limite OFFSET :offset
            """), {"limite": limite, "offset": offset}).fetchall()
        except Exception:
            # Si la vista no existe, usar JOIN directo
            total = db.execute(text("""
                SELECT COUNT(*) as total 
                FROM recepcion_lotes rl
                JOIN guias_transito gt ON rl.id_guia = gt.id_guia
            """)).fetchone().total
            
            recepciones = db.execute(text("""
                SELECT 
                    rl.id_recepcion,
                    gt.id_guia,
                    gt.numero_guia,
                    gt.motivo,
                    gt.fecha as fecha_guia,
                    p.nombre as proveedor,
                    rl.animales_programados,
                    rl.animales_recibidos,
                    rl.animales_muertos,
                    rl.animales_enfermos,
                    rl.fecha_recepcion,
                    rl.observaciones,
                    e.nombre || ' ' || e.apellido_paterno as recibido_por,
                    (SELECT COUNT(*) FROM animales a WHERE a.id_guia = gt.id_guia) as animales_registrados
                FROM recepcion_lotes rl
                JOIN guias_transito gt ON rl.id_guia = gt.id_guia
                JOIN proveedores p ON gt.id_proveedor = p.id_proveedor
                JOIN empleados e ON rl.id_empleado = e.id_empleado
                ORDER BY rl.fecha_recepcion DESC
                LIMIT :limite OFFSET :offset
            """), {"limite": limite, "offset": offset}).fetchall()
        # Convertir cada fila a diccionario manualmente
        recepciones_lista = []
        for r in recepciones:
            recepciones_lista.append({
                "id_recepcion": r.id_recepcion,
                "id_guia": r.id_guia,
                "numero_guia": r.numero_guia,
                "motivo": r.motivo,
                "fecha_guia": str(r.fecha_guia) if r.fecha_guia else None,
                "proveedor": r.proveedor,
                "animales_programados": r.animales_programados,
                "animales_recibidos": r.animales_recibidos,
                "animales_muertos": r.animales_muertos,
                "animales_enfermos": r.animales_enfermos,
                "fecha_recepcion": str(r.fecha_recepcion) if r.fecha_recepcion else None,
                "observaciones": r.observaciones,
                "recibido_por": r.recibido_por,
                "animales_registrados": r.animales_registrados,
            })

        return {
            "total": total,
            "pagina": pagina,
            "limite": limite,
            "total_paginas": (total + limite - 1) // limite if total > 0 else 1,
            "recepciones": recepciones_lista
        }
    
    @staticmethod
    def obtener_recepcion(db: Session, id_recepcion: int) -> dict:
    # Verificar si la vista existe, si no, usar query directa
        try:
            recepcion = db.execute(text("""
                SELECT * FROM v_recepciones_completas
                WHERE id_recepcion = :id_rec
            """), {"id_rec": id_recepcion}).fetchone()
        except:
            # Si la vista no existe, hacer join manual
            recepcion = db.execute(text("""
                SELECT 
                    rl.id_recepcion,
                    gt.id_guia,
                    gt.numero_guia,
                    gt.motivo,
                    gt.fecha as fecha_guia,
                    p.id_proveedor,
                    p.nombre as proveedor,
                    rl.animales_programados,
                    rl.animales_recibidos,
                    rl.animales_muertos,
                    rl.animales_enfermos,
                    rl.fecha_recepcion,
                    rl.corral_asignado,
                    c.nombre as corral_nombre,
                    e.nombre || ' ' || e.apellido_paterno as recibido_por,
                    rl.observaciones,
                    (SELECT COUNT(*) FROM animales a WHERE a.id_guia = gt.id_guia) as animales_registrados
                FROM recepcion_lotes rl
                JOIN guias_transito gt ON rl.id_guia = gt.id_guia
                JOIN proveedores p ON gt.id_proveedor = p.id_proveedor
                LEFT JOIN corrales c ON rl.corral_asignado = c.id_corral
                JOIN empleados e ON rl.id_empleado = e.id_empleado
                WHERE rl.id_recepcion = :id_rec
            """), {"id_rec": id_recepcion}).fetchone()
        
        if not recepcion:
            raise HTTPException(status_code=404, detail="Recepción no encontrada")
        
        # Obtener animales de esta guía (SIN la columna condicion_llegada por si no existe)
        try:
            animales = db.execute(text("""
                SELECT a.arete, a.sexo, a.peso_entrada, a.meses, 
                    a.precio_compra, a.clasificacion,
                    c.nombre as corral
                FROM animales a
                LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
                WHERE a.id_guia = :id_guia
                ORDER BY a.arete
            """), {"id_guia": recepcion.id_guia}).fetchall()
        except:
            # Si falla, intentar sin clasificacion
            animales = db.execute(text("""
                SELECT a.arete, a.sexo, a.peso_entrada, a.meses, 
                    a.precio_compra,
                    c.nombre as corral
                FROM animales a
                LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
                WHERE a.id_guia = :id_guia
                ORDER BY a.arete
            """), {"id_guia": recepcion.id_guia}).fetchall()
        
        return {
            "recepcion": dict(recepcion._mapping) if recepcion else None,
            "animales": [dict(a._mapping) for a in animales]
        }
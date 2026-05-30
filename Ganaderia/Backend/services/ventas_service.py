# backend/app/services/ventas_service.py
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

class VentasService:
    
    @staticmethod
    def get_animales_disponibles(db: Session) -> list:
        """Animales vivos, no vendidos, sin retiro activo"""
        
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
                a.peso_entrada,
                c.nombre as corral_nombre,
                e.nombre as estado,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM tratamientos 
                        WHERE arete = a.arete AND fecha_disponible > CURRENT_DATE
                    ) THEN true 
                    ELSE false 
                END as en_retiro,
                (SELECT MAX(fecha_disponible) FROM tratamientos 
                 WHERE arete = a.arete AND fecha_disponible > CURRENT_DATE) as fecha_disponible
            FROM animales a
            LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
            JOIN estado e ON a.id_estado = e.id_estado
            WHERE a.fecha_muerte IS NULL
            AND e.nombre NOT IN ('Vendido', 'Muerto')
            ORDER BY a.arete
        """)).fetchall()
        
        # ✅ CORRECTO: Convertir Row objects a diccionario
        resultado = []
        for a in animales:
            resultado.append({
                "arete": a.arete,
                "clasificacion": a.clasificacion,
                "sexo": a.sexo,
                "peso_actual": float(a.peso_actual) if a.peso_actual else float(a.peso_entrada),
                "peso_entrada": float(a.peso_entrada),
                "corral_nombre": a.corral_nombre,
                "estado": a.estado,
                "en_retiro": a.en_retiro,
                "fecha_disponible": str(a.fecha_disponible) if a.fecha_disponible else None
            })
        
        return resultado
    
    @staticmethod
    def crear_venta(db: Session, data: dict) -> dict:
        """Procesa una venta nueva"""
        
        animales = data.get("animales", [])
        id_comprador = data.get("id_comprador")
        precio_kg = float(data.get("precio_kg", 0))
        
        if not animales:
            raise HTTPException(status_code=400, detail="Debe seleccionar al menos un animal")
        
        # Validar retiro para cada animal
        for a in animales:
            en_retiro = db.execute(text("""
                SELECT 1 FROM tratamientos 
                WHERE arete = :arete AND fecha_disponible > CURRENT_DATE
                LIMIT 1
            """), {"arete": a["arete"]}).fetchone()
            
            if en_retiro:
                raise HTTPException(
                    status_code=400,
                    detail=f"El animal {a['arete']} está en periodo de retiro"
                )
        
        # Calcular peso total
        peso_total = sum(float(a.get("peso", 0)) for a in animales)
        total = peso_total * precio_kg
        
        # Obtener estado "Vendido"
        estado_vendido = db.execute(text(
            "SELECT id_estado FROM estado WHERE nombre = 'Vendido'"
        )).fetchone()
        
        if not estado_vendido:
            raise HTTPException(status_code=500, detail="Estado 'Vendido' no encontrado en la BD")
        
        # Crear venta
        venta = db.execute(text("""
            INSERT INTO ventas (id_comprador, fecha_venta, precio_kg, peso_total, estatus)
            VALUES (:comprador, COALESCE(:fecha, CURRENT_DATE), :precio, :peso, 'Completado')
            RETURNING id_venta
        """), {
            "comprador": id_comprador,
            "fecha": data.get("fecha_venta"),
            "precio": precio_kg,
            "peso": peso_total
        }).fetchone()
        
        id_venta = venta.id_venta
        
        # Insertar detalle y actualizar animales
        for a in animales:
            precio_animal = float(a.get("peso", 0)) * precio_kg
            
            db.execute(text("""
                INSERT INTO venta_detalle (id_venta, arete, precio)
                VALUES (:venta, :arete, :precio)
            """), {
                "venta": id_venta,
                "arete": a["arete"],
                "precio": precio_animal
            })
            
            # Marcar animal como vendido
            db.execute(text("""
                UPDATE animales 
                SET id_estado = :estado,
                    id_corral_actual = NULL
                WHERE arete = :arete
            """), {
                "estado": estado_vendido.id_estado,
                "arete": a["arete"]
            })
        
        db.commit()
        
        # Obtener nombre del comprador
        comprador = db.execute(text(
            "SELECT nombre FROM compradores WHERE id_comprador = :id"
        ), {"id": id_comprador}).fetchone()
        
        return {
            "mensaje": "Venta procesada exitosamente",
            "id_venta": id_venta,
            "comprador": comprador.nombre if comprador else "",
            "cantidad_animales": len(animales),
            "peso_total": round(peso_total, 2),
            "precio_kg": round(precio_kg, 2),
            "total": round(total, 2)
        }
    
    @staticmethod
    def get_detalle_venta(db: Session, id_venta: int) -> dict:
        """Obtiene detalle completo de una venta"""
        
        venta = db.execute(text("""
            SELECT v.*, c.nombre as comprador, c.rfc, c.direccion, c.telefono
            FROM ventas v
            JOIN compradores c ON v.id_comprador = c.id_comprador
            WHERE v.id_venta = :id
        """), {"id": id_venta}).fetchone()
        
        if not venta:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        animales = db.execute(text("""
            SELECT vd.*, a.clasificacion, a.sexo,
                   COALESCE(
                       (SELECT hp.peso FROM historial_peso hp 
                        WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                       a.peso_entrada
                   ) as peso
            FROM venta_detalle vd
            JOIN animales a ON vd.arete = a.arete
            WHERE vd.id_venta = :id
        """), {"id": id_venta}).fetchall()
        
        # Convertir a diccionarios correctamente
        venta_dict = {
            "id_venta": venta.id_venta,
            "fecha_venta": str(venta.fecha_venta),
            "precio_kg": float(venta.precio_kg),
            "peso_total": float(venta.peso_total),
            "total": float(venta.total),
            "estatus": venta.estatus,
            "comprador": venta.comprador,
            "rfc": venta.rfc,
            "direccion": venta.direccion,
            "telefono": venta.telefono
        }
        
        animales_list = []
        for a in animales:
            animales_list.append({
                "arete": a.arete,
                "clasificacion": a.clasificacion,
                "sexo": a.sexo,
                "peso": float(a.peso) if a.peso else 0,
                "precio": float(a.precio) if a.precio else 0
            })
        
        return {
            "venta": venta_dict,
            "animales": animales_list
        }
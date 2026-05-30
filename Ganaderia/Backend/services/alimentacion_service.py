# backend/app/services/alimentacion_service.py
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

class AlimentacionService:
    
    @staticmethod
    def calcular_comida_sugerida(db: Session, id_corral: int) -> dict:
        """Calcula los kg de comida sugeridos para un corral"""
        
        corral = db.execute(text("""
            SELECT c.capacidad, c.dieta_actual, d.factor, d.nombre as dieta_nombre
            FROM corrales c
            JOIN dietas d ON c.dieta_actual = d.id_dieta
            WHERE c.id_corral = :id
        """), {"id": id_corral}).fetchone()
        
        if not corral:
            raise HTTPException(status_code=404, detail="Corral no encontrado")
        if corral.factor is None:
            return {
                "id_corral": id_corral,
                "peso_total_corral": 0,
                "factor_dieta": 0,
                "kg_sugeridos": 0,
                "dieta_nombre": corral.dieta_nombre or "Sin dieta"
            }
    
        peso_total = db.execute(text("""
            SELECT COALESCE(SUM(
                COALESCE(
                    (SELECT hp.peso FROM historial_peso hp 
                     WHERE hp.arete = a.arete 
                     ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                )
            ), 0) as peso_total
            FROM animales a
            WHERE a.id_corral_actual = :id
            AND a.fecha_muerte IS NULL
        """), {"id": id_corral}).fetchone()
        
        kg_sugeridos = float(peso_total.peso_total) * float(corral.factor) if corral.factor else 0
        
        return {
            "id_corral": id_corral,
            "peso_total_corral": round(float(peso_total.peso_total), 2),
            "factor_dieta": float(corral.factor) if corral.factor else 0,
            "kg_sugeridos": round(kg_sugeridos, 2),
            "dieta_nombre": corral.dieta_nombre
        }
    
    @staticmethod
    def verificar_stock_ingredientes(db: Session, id_dieta: int, cantidad_kg: float) -> list:
        """Verifica si hay stock suficiente para servir una cantidad de comida"""
        
        faltantes = db.execute(text("""
            SELECT 
                i.id_ingredientes,
                i.nombre,
                i.unidad_medida,
                i.stock_actual,
                ROUND((di.porcentaje / 100.0) * CAST(:cantidad AS NUMERIC), 2) as necesario,
                ROUND(i.stock_actual - (di.porcentaje / 100.0) * CAST(:cantidad AS NUMERIC), 2) as sobrante
            FROM dieta_ingredientes di
            JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
            WHERE di.id_dieta = :dieta
            AND i.stock_actual < ROUND((di.porcentaje / 100.0) * CAST(:cantidad AS NUMERIC), 2)
        """), {
            "dieta": id_dieta,
            "cantidad": cantidad_kg
        }).fetchall()
        
        resultado = []
        for f in faltantes:
            resultado.append({
                "id_ingrediente": f.id_ingredientes,
                "nombre": f.nombre,
                "unidad_medida": f.unidad_medida,
                "necesario": float(f.necesario),
                "disponible": float(f.stock_actual),
                "faltante": float(f.necesario) - float(f.stock_actual)
            })
        
        return resultado
    
    @staticmethod
    def servir_comida(db: Session, data: dict) -> dict:
        """Registra un servicio de comida y descuenta ingredientes"""
        
        id_corral = data["id_corral"]
        cantidad_kg = data["cantidad_kg"]
        id_empleado = data.get("id_empleado", 4)
        fecha = data.get("fecha")
        observaciones = data.get("observaciones", "")
        
        corral = db.execute(text("""
            SELECT c.id_corral, c.nombre, c.dieta_actual
            FROM corrales c
            WHERE c.id_corral = :id
        """), {"id": id_corral}).fetchone()
        
        if not corral:
            raise HTTPException(status_code=404, detail="Corral no encontrado")
        
        id_dieta = corral.dieta_actual
        
        # Verificar stock
        faltantes = AlimentacionService.verificar_stock_ingredientes(db, id_dieta, cantidad_kg)
        
        if faltantes:
            raise HTTPException(
                status_code=409,
                detail={
                    "mensaje": "Stock insuficiente para algunos ingredientes",
                    "faltantes": faltantes
                }
            )
        
        # Registrar servicio
        resultado = db.execute(text("""
            INSERT INTO servicios_alimentacion 
            (id_corral, id_dieta, cantidad_kg, fecha_servicio, id_empleado, observaciones)
            VALUES (:corral, :dieta, :kg, COALESCE(CAST(:fecha AS DATE), CURRENT_DATE), :emp, :obs)
            RETURNING id_servicios
        """), {
            "corral": id_corral,
            "dieta": id_dieta,
            "kg": cantidad_kg,
            "fecha": fecha if fecha else None,
            "emp": id_empleado,
            "obs": observaciones
        })
        
        id_servicio = resultado.fetchone().id_servicios
        
        # Descontar ingredientes
        db.execute(text("""
            UPDATE ingredientes i
            SET stock_actual = stock_actual - (di.porcentaje / 100.0) * CAST(:cantidad AS NUMERIC)
            FROM dieta_ingredientes di
            WHERE di.id_dieta = :dieta
            AND di.id_ingredientes = i.id_ingredientes
        """), {
            "dieta": id_dieta,
            "cantidad": cantidad_kg
        })
        
        db.commit()
        
        return {
            "mensaje": f"Servicio registrado. {cantidad_kg} kg servidos al corral {corral.nombre}",
            "id_servicio": id_servicio,
            "kg_servidos": cantidad_kg,
            "corral": corral.nombre
        }
    
    @staticmethod
    def obtener_historial(db: Session, filtros: dict) -> dict:
        """Obtiene historial de servicios con filtros"""
        
        condiciones = ["1=1"]
        params = {}
        
        if filtros.get("corral") and filtros["corral"] != "":
            condiciones.append("s.id_corral = :corral")
            params["corral"] = int(filtros["corral"])
        
        if filtros.get("fecha_desde") and filtros["fecha_desde"] != "":
            condiciones.append("s.fecha_servicio >= CAST(:desde AS DATE)")
            params["desde"] = filtros["fecha_desde"]
        
        if filtros.get("fecha_hasta") and filtros["fecha_hasta"] != "":
            condiciones.append("s.fecha_servicio <= CAST(:hasta AS DATE)")
            params["hasta"] = filtros["fecha_hasta"]
        
        if filtros.get("empleado") and filtros["empleado"] != "":
            condiciones.append("s.id_empleado = :emp")
            params["emp"] = int(filtros["empleado"])
        
        where = " AND ".join(condiciones)
        pagina = int(filtros.get("pagina", 1))
        limite = 20
        offset = (pagina - 1) * limite
        
        # Contar total
        total_result = db.execute(text(f"""
            SELECT COUNT(*) as total
            FROM servicios_alimentacion s
            WHERE {where}
        """), params).fetchone()
        total = total_result.total
        
        # Obtener servicios
        servicios = db.execute(text(f"""
            SELECT 
                s.id_servicios,
                s.cantidad_kg,
                s.fecha_servicio,
                COALESCE(s.observaciones, '') as observaciones,
                c.nombre as corral_nombre,
                d.nombre as dieta_nombre,
                e.nombre || ' ' || e.apellido_paterno as empleado_nombre
            FROM servicios_alimentacion s
            JOIN corrales c ON s.id_corral = c.id_corral
            JOIN dietas d ON s.id_dieta = d.id_dieta
            JOIN empleados e ON s.id_empleado = e.id_empleado
            WHERE {where}
            ORDER BY s.fecha_servicio DESC, s.id_servicios DESC
            LIMIT :limite OFFSET :offset
        """), {**params, "limite": limite, "offset": offset}).fetchall()
        
        resultado = []
        for s in servicios:
            resultado.append({
                "id_servicios": s.id_servicios,
                "cantidad_kg": float(s.cantidad_kg),
                "fecha_servicio": str(s.fecha_servicio),
                "observaciones": s.observaciones,
                "corral_nombre": s.corral_nombre,
                "dieta_nombre": s.dieta_nombre,
                "empleado_nombre": s.empleado_nombre
            })
        
        return {
            "servicios": resultado,
            "total": total,
            "pagina": pagina,
            "total_paginas": max(1, (total + limite - 1) // limite)
        }
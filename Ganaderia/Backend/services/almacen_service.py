# backend/app/services/almacen_service.py

from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date

def row_to_dict(row):
    """Convierte una fila de SQLAlchemy a diccionario"""
    if row is None:
        return None
    try:
        return dict(row._mapping)
    except (AttributeError, TypeError):
        try:
            return dict(zip(row._fields, row))
        except (AttributeError, TypeError):
            return dict(row)


class AlmacenService:
    
    @staticmethod
    def get_dashboard(db: Session) -> dict:
        """Dashboard del almacén con KPIs"""
        
        hoy = date.today()
        inicio_mes = hoy.replace(day=1)
        
        # Entradas del mes
        entradas = db.execute(text(
            "SELECT COUNT(*) as total FROM entrada_almacen WHERE fecha_entrada >= :inicio"
        ), {"inicio": inicio_mes}).fetchone()
        
        valor_entradas = db.execute(text(
            "SELECT COALESCE(SUM(cantidad * precio_unitario), 0) as total FROM entrada_almacen WHERE fecha_entrada >= :inicio"
        ), {"inicio": inicio_mes}).fetchone()
        
        # Salidas del mes
        salidas = db.execute(text(
            "SELECT COUNT(*) as total FROM servicios_alimentacion WHERE fecha_servicio >= :inicio"
        ), {"inicio": inicio_mes}).fetchone()
        
        # Productos con stock bajo
        stock_bajo_count = db.execute(text("""
            SELECT COUNT(*) as total FROM (
                SELECT id_ingredientes FROM ingredientes 
                WHERE stock_actual <= stock_minimo AND activo = true
                UNION ALL
                SELECT id_medicamento FROM medicamentos 
                WHERE stock_actual <= stock_minimo AND activo = true
            ) t
        """)).fetchone()
        
        # Productos caducados
        caducados = db.execute(text("""
            SELECT COUNT(DISTINCT COALESCE(ea.id_ingrediente, ea.id_medicamento)) as total
            FROM entrada_almacen ea
            WHERE ea.fecha_caducidad IS NOT NULL 
            AND ea.fecha_caducidad < CURRENT_DATE
        """)).fetchone()
        
        return {
            "entradas_periodo": entradas.total if entradas else 0,
            "valor_entradas": f"${valor_entradas.total:,.2f}" if valor_entradas and valor_entradas.total else "$0",
            "salidas_periodo": salidas.total if salidas else 0,
            "valor_salidas": "$0",
            "productos_stock_bajo": stock_bajo_count.total if stock_bajo_count else 0,
            "productos_caducados": caducados.total if caducados else 0,
            "stock_bajo": AlmacenService._get_stock_bajo(db),
            "consumo_reciente": AlmacenService._get_consumo_reciente(db)
        }
    
    @staticmethod
    def _get_stock_bajo(db: Session) -> list:
        """Obtiene productos con stock bajo"""
        
        resultado = db.execute(text("""
            SELECT * FROM (
                SELECT 
                    id_ingredientes as id, 
                    nombre, 
                    stock_actual, 
                    stock_minimo, 
                    'Ingrediente' as tipo, 
                    unidad_medida,
                    CASE 
                        WHEN stock_minimo > 0 THEN (stock_actual::float / stock_minimo::float)
                        ELSE 0 
                    END as porcentaje_stock
                FROM ingredientes 
                WHERE stock_actual <= stock_minimo AND activo = true
                
                UNION ALL
                
                SELECT 
                    id_medicamento as id, 
                    nombre, 
                    stock_actual, 
                    stock_minimo, 
                    'Medicamento' as tipo, 
                    unidad_medida,
                    CASE 
                        WHEN stock_minimo > 0 THEN (stock_actual::float / stock_minimo::float)
                        ELSE 0 
                    END as porcentaje_stock
                FROM medicamentos 
                WHERE stock_actual <= stock_minimo AND activo = true
            ) AS productos_bajo
            ORDER BY porcentaje_stock ASC
        """)).fetchall()
        
        return [row_to_dict(row) for row in resultado]
    
    @staticmethod
    def _get_consumo_reciente(db: Session, dias: int = 30) -> list:
        """Obtiene consumo reciente de ingredientes"""
        
        resultado = db.execute(text("""
            SELECT 
                i.nombre,
                i.unidad_medida as unidad,
                COALESCE(SUM(s.cantidad_kg * COALESCE(di.porcentaje, 0) / 100.0), 0) as consumo_total,
                ROUND(COALESCE(SUM(s.cantidad_kg * COALESCE(di.porcentaje, 0) / 100.0) / :dias, 0), 2) as promedio_diario,
                CASE 
                    WHEN COALESCE(SUM(s.cantidad_kg * COALESCE(di.porcentaje, 0) / 100.0), 0) > 0 
                    THEN CAST(ROUND(i.stock_actual / (SUM(s.cantidad_kg * COALESCE(di.porcentaje, 0) / 100.0) / :dias)) AS INTEGER)
                    ELSE 999
                END as dias_restantes
            FROM ingredientes i
            LEFT JOIN dieta_ingredientes di ON i.id_ingredientes = di.id_ingredientes
            LEFT JOIN servicios_alimentacion s ON s.id_dieta = di.id_dieta 
                AND s.fecha_servicio >= CURRENT_DATE - :dias
            WHERE i.activo = true
            GROUP BY i.id_ingredientes, i.nombre, i.unidad_medida, i.stock_actual
            ORDER BY dias_restantes ASC
        """), {"dias": dias}).fetchall()
        
        return [row_to_dict(row) for row in resultado]
    
    @staticmethod
    def registrar_entrada(db: Session, data: dict) -> dict:
        """Registra entrada al almacén y actualiza stock"""
        
        tipo = data["tipo_producto"]
        id_producto = int(data["id_producto"])
        cantidad = float(data["cantidad"])
        precio = float(data["precio_unitario"])
        id_proveedor = int(data["id_proveedor"])
        
        resultado = db.execute(text("""
            INSERT INTO entrada_almacen 
            (id_ingrediente, id_medicamento, cantidad, precio_unitario, 
             fecha_caducidad, fecha_entrada, id_proveedor)
            VALUES (:ing, :med, :cant, :precio, :cad, COALESCE(:fecha, CURRENT_DATE), :prov)
            RETURNING id_entrada
        """), {
            "ing": id_producto if tipo == 'ingrediente' else None,
            "med": id_producto if tipo == 'medicamento' else None,
            "cant": cantidad,
            "precio": precio,
            "cad": data.get("fecha_caducidad") or None,
            "fecha": data.get("fecha_entrada") or date.today(),
            "prov": id_proveedor
        })
        
        id_entrada = resultado.fetchone().id_entrada
        
        if tipo == 'ingrediente':
            db.execute(text("""
                UPDATE ingredientes 
                SET stock_actual = stock_actual + :cant,
                    precio_unitario = :precio
                WHERE id_ingredientes = :id
            """), {"cant": cantidad, "precio": precio, "id": id_producto})
        else:
            db.execute(text("""
                UPDATE medicamentos 
                SET stock_actual = stock_actual + :cant
                WHERE id_medicamento = :id
            """), {"cant": cantidad, "id": id_producto})
        
        db.commit()
        
        return {
            "mensaje": "Entrada registrada exitosamente",
            "id_entrada": id_entrada
        }
    
    @staticmethod
    def sugerir_compras(db: Session) -> list:
        """Sugiere compras basado en stock mínimo"""
        
        resultado = db.execute(text("""
            SELECT * FROM (
                SELECT 
                    id_ingredientes as id,
                    nombre,
                    'ingrediente' as tipo,
                    unidad_medida as unidad,
                    stock_actual,
                    stock_minimo,
                    precio_unitario,
                    CASE 
                        WHEN stock_actual = 0 THEN stock_minimo * 2
                        ELSE GREATEST((stock_minimo * 2) - stock_actual, 0)
                    END as cantidad_sugerida,
                    stock_actual <= (stock_minimo / 2.0) as nivel_critico
                FROM ingredientes
                WHERE activo = true AND stock_actual < stock_minimo * 1.5
                
                UNION ALL
                
                SELECT 
                    id_medicamento as id,
                    nombre,
                    'medicamento' as tipo,
                    unidad_medida as unidad,
                    stock_actual,
                    stock_minimo,
                    0 as precio_unitario,
                    CASE 
                        WHEN stock_actual = 0 THEN stock_minimo * 2
                        ELSE GREATEST((stock_minimo * 2) - stock_actual, 0)
                    END as cantidad_sugerida,
                    stock_actual <= (stock_minimo / 2.0) as nivel_critico
                FROM medicamentos
                WHERE activo = true AND stock_actual < stock_minimo * 1.5
            ) AS sugerencias
            ORDER BY nivel_critico DESC, cantidad_sugerida DESC
        """)).fetchall()
        
        return [row_to_dict(row) for row in resultado]
    
    @staticmethod
    def get_historial(db: Session, filtros: dict) -> dict:
        """Historial de movimientos con filtros dinámicos"""
        
        # Construir condiciones dinámicas
        params = {}
        condiciones = []
        
        if filtros.get("producto_id"):
            condiciones.append("tipo_producto || '_' || id_producto = :prod_id")
            params["prod_id"] = filtros["producto_id"]
        
        if filtros.get("tipo_producto"):
            condiciones.append("tipo_producto = :tipo_prod")
            params["tipo_prod"] = filtros["tipo_producto"]
        
        if filtros.get("tipo_movimiento"):
            condiciones.append("tipo_movimiento = :tipo_mov")
            params["tipo_mov"] = filtros["tipo_movimiento"]
        
        if filtros.get("fecha_desde"):
            condiciones.append("fecha >= :desde")
            params["desde"] = filtros["fecha_desde"]
        
        if filtros.get("fecha_hasta"):
            condiciones.append("fecha <= :hasta")
            params["hasta"] = filtros["fecha_hasta"]
        
        where_clause = " AND ".join(condiciones) if condiciones else "1=1"
        
        pagina = int(filtros.get("pagina", 1))
        limite = 20
        offset = (pagina - 1) * limite
        params["limite"] = limite
        params["offset"] = offset
        
        # Query del historial
        query = f"""
            SELECT * FROM (
                -- Entradas de almacén
                SELECT 
                    ea.id_entrada as id_movimiento,
                    ea.fecha_entrada as fecha,
                    'entrada' as tipo_movimiento,
                    COALESCE(i.nombre, m.nombre) as producto_nombre,
                    CASE WHEN ea.id_ingrediente IS NOT NULL THEN 'ingrediente' ELSE 'medicamento' END as tipo_producto,
                    COALESCE(ea.id_ingrediente, ea.id_medicamento) as id_producto,
                    ea.cantidad,
                    COALESCE(i.unidad_medida, m.unidad_medida) as unidad,
                    ea.precio_unitario,
                    (ea.cantidad * ea.precio_unitario) as subtotal,
                    p.nombre as proveedor_nombre,
                    'Entrada de almacén' as descripcion,
                    NULL as empleado_nombre
                FROM entrada_almacen ea
                LEFT JOIN ingredientes i ON ea.id_ingrediente = i.id_ingredientes
                LEFT JOIN medicamentos m ON ea.id_medicamento = m.id_medicamento
                LEFT JOIN proveedores p ON ea.id_proveedor = p.id_proveedor
                
                UNION ALL
                
                -- Salidas por alimentación
                SELECT 
                    s.id_servicios as id_movimiento,
                    s.fecha_servicio as fecha,
                    'salida' as tipo_movimiento,
                    i.nombre as producto_nombre,
                    'ingrediente' as tipo_producto,
                    di.id_ingredientes as id_producto,
                    ROUND(s.cantidad_kg * di.porcentaje / 100.0, 2) as cantidad,
                    i.unidad_medida as unidad,
                    i.precio_unitario,
                    ROUND(s.cantidad_kg * di.porcentaje / 100.0 * i.precio_unitario, 2) as subtotal,
                    NULL as proveedor_nombre,
                    CONCAT('Servicio - Corral: ', c.nombre) as descripcion,
                    emp.nombre || ' ' || emp.apellido_paterno as empleado_nombre
                FROM servicios_alimentacion s
                JOIN corrales c ON s.id_corral = c.id_corral
                JOIN dieta_ingredientes di ON s.id_dieta = di.id_dieta
                JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
                JOIN empleados emp ON s.id_empleado = emp.id_empleado
                
                UNION ALL
                
                -- Salidas por tratamientos
                SELECT 
                    t.id_tratamiento as id_movimiento,
                    t.fecha_aplicacion as fecha,
                    'salida' as tipo_movimiento,
                    m.nombre as producto_nombre,
                    'medicamento' as tipo_producto,
                    t.id_medicamento as id_producto,
                    t.dosis_aplicada as cantidad,
                    m.unidad_medida as unidad,
                    0 as precio_unitario,
                    0 as subtotal,
                    NULL as proveedor_nombre,
                    CONCAT('Tratamiento - Animal: ', t.arete) as descripcion,
                    emp.nombre || ' ' || emp.apellido_paterno as empleado_nombre
                FROM tratamientos t
                JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
                JOIN empleados emp ON t.id_empleado = emp.id_empleado
                
            ) AS todos_movimientos
            WHERE {where_clause}
            ORDER BY fecha DESC, id_movimiento DESC
            LIMIT :limite OFFSET :offset
        """
        
        movimientos = db.execute(text(query), params).fetchall()
        
        # Contar total (simplificado)
        total = len(movimientos)
        if total == limite:
            count_query = f"""
                SELECT COUNT(*) as total FROM (
                    SELECT 1 FROM entrada_almacen WHERE 1=1
                    UNION ALL
                    SELECT 1 FROM servicios_alimentacion WHERE 1=1
                    UNION ALL
                    SELECT 1 FROM tratamientos WHERE 1=1
                ) t
            """
            total = db.execute(text(count_query)).fetchone().total
        
        return {
            "movimientos": [row_to_dict(m) for m in movimientos],
            "total": total,
            "pagina": pagina,
            "total_paginas": max(1, (total + limite - 1) // limite)
        }
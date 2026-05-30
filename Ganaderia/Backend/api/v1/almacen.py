from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.services.almacen_service import AlmacenService
from datetime import date

router = APIRouter()

def row_to_dict(row):
    """Convierte una fila a diccionario"""
    if row is None:
        return None
    try:
        return dict(row._mapping)
    except AttributeError:
        return dict(row)

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    try:
        return AlmacenService.get_dashboard(db)
    except Exception as e:
        return {
            "error": str(e),
            "entradas_periodo": 0,
            "valor_entradas": "$0",
            "salidas_periodo": 0,
            "productos_stock_bajo": 0,
            "productos_caducados": 0,
            "stock_bajo": [],
            "consumo_reciente": []
        }

@router.get("/productos")
def listar_productos(tipo: str = Query("todos"), db: Session = Depends(get_db)):
    if tipo == 'ingrediente':
        productos = db.execute(text("""
            SELECT 
                id_ingredientes as id, 
                nombre, 
                'ingrediente' as tipo, 
                stock_actual, 
                stock_minimo, 
                unidad_medida,
                precio_unitario
            FROM ingredientes 
            WHERE activo = true
            ORDER BY nombre
        """)).fetchall()
        
    elif tipo == 'medicamento':
        productos = db.execute(text("""
            SELECT 
                id_medicamento as id, 
                nombre, 
                'medicamento' as tipo, 
                stock_actual, 
                stock_minimo, 
                unidad_medida,
                0 as precio_unitario
            FROM medicamentos 
            WHERE activo = true
            ORDER BY nombre
        """)).fetchall()
        
    else:
        productos = db.execute(text("""
            SELECT * FROM (
                SELECT 
                    id_ingredientes as id, 
                    nombre, 
                    'ingrediente' as tipo, 
                    stock_actual, 
                    stock_minimo, 
                    unidad_medida,
                    precio_unitario
                FROM ingredientes 
                WHERE activo = true
                UNION ALL
                SELECT 
                    id_medicamento as id, 
                    nombre, 
                    'medicamento' as tipo, 
                    stock_actual, 
                    stock_minimo, 
                    unidad_medida,
                    0 as precio_unitario
                FROM medicamentos 
                WHERE activo = true
            ) AS todos_productos
            ORDER BY nombre
        """)).fetchall()
    
    return [row_to_dict(p) for p in productos]


@router.get("/proveedores")
def proveedores(db: Session = Depends(get_db)):
    provs = db.execute(text(
        "SELECT id_proveedor, nombre FROM proveedores WHERE activo = true ORDER BY nombre"
    )).fetchall()
    return [row_to_dict(p) for p in provs]

@router.post("/entrada")
def registrar_entrada(data: dict, db: Session = Depends(get_db)):
    return AlmacenService.registrar_entrada(db, data)


@router.get("/entradas")
def listar_entradas(
    tipo: str = Query(None),
    fecha_desde: str = Query(None),
    fecha_hasta: str = Query(None),
    proveedor: str = Query(None),
    pagina: int = Query(1, ge=1),
    db: Session = Depends(get_db)
):
    condiciones = ["1=1"]
    params = {}
    
    if tipo == 'ingrediente':
        condiciones.append("ea.id_ingrediente IS NOT NULL")
    elif tipo == 'medicamento':
        condiciones.append("ea.id_medicamento IS NOT NULL")
    
    if fecha_desde:
        condiciones.append("ea.fecha_entrada >= :desde")
        params["desde"] = fecha_desde
    
    if fecha_hasta:
        condiciones.append("ea.fecha_entrada <= :hasta")
        params["hasta"] = fecha_hasta
    
    if proveedor:
        condiciones.append("ea.id_proveedor = :prov")
        params["prov"] = int(proveedor)
    
    where = " AND ".join(condiciones)
    limite = 20
    offset = (pagina - 1) * limite
    
    total = db.execute(text(f"""
        SELECT COUNT(*) as total FROM entrada_almacen ea WHERE {where}
    """), params).fetchone().total
    
    entradas = db.execute(text(f"""
        SELECT 
            ea.id_entrada,
            ea.cantidad,
            ea.precio_unitario,
            ea.fecha_entrada,
            ea.fecha_caducidad,
            COALESCE(i.nombre, m.nombre) as producto_nombre,
            CASE WHEN ea.id_ingrediente IS NOT NULL THEN 'ingrediente' ELSE 'medicamento' END as tipo,
            p.nombre as proveedor_nombre
        FROM entrada_almacen ea
        LEFT JOIN ingredientes i ON ea.id_ingrediente = i.id_ingredientes
        LEFT JOIN medicamentos m ON ea.id_medicamento = m.id_medicamento
        LEFT JOIN proveedores p ON ea.id_proveedor = p.id_proveedor
        WHERE {where}
        ORDER BY ea.fecha_entrada DESC, ea.id_entrada DESC
        LIMIT :limite OFFSET :offset
    """), {**params, "limite": limite, "offset": offset}).fetchall()
    
    return {
        "entradas": [row_to_dict(e) for e in entradas],
        "total": total,
        "pagina": pagina,
        "total_paginas": max(1, (total + limite - 1) // limite)
    }

@router.post("/ajuste")
def registrar_ajuste(data: dict, db: Session = Depends(get_db)):
    """Registra un ajuste manual de inventario"""
    tipo_producto = data.get("tipo_producto", "ingrediente")
    id_producto = int(data["id_producto"])
    tipo_ajuste = data.get("tipo_ajuste", "conteo")
    cantidad = float(data["cantidad_ajuste"])
    motivo = data.get("motivo", "")
    
    try:
        if tipo_ajuste == "conteo":
            if tipo_producto == "ingrediente":
                db.execute(text("""
                    UPDATE ingredientes SET stock_actual = :cant
                    WHERE id_ingredientes = :id
                """), {"cant": cantidad, "id": id_producto})
            else:
                db.execute(text("""
                    UPDATE medicamentos SET stock_actual = :cant
                    WHERE id_medicamento = :id
                """), {"cant": cantidad, "id": id_producto})
        else:
            if tipo_producto == "ingrediente":
                db.execute(text("""
                    UPDATE ingredientes 
                    SET stock_actual = GREATEST(0, stock_actual - :cant)
                    WHERE id_ingredientes = :id
                """), {"cant": cantidad, "id": id_producto})
            else:
                db.execute(text("""
                    UPDATE medicamentos 
                    SET stock_actual = GREATEST(0, stock_actual - :cant)
                    WHERE id_medicamento = :id
                """), {"cant": cantidad, "id": id_producto})
        
        db.commit()
        return {"mensaje": f"Ajuste '{tipo_ajuste}' registrado correctamente"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

@router.get("/historial")
def historial_movimientos(
    producto_id: str = Query(None),
    tipo_producto: str = Query(None),
    tipo_movimiento: str = Query(None),
    fecha_desde: str = Query(None),
    fecha_hasta: str = Query(None),
    pagina: int = Query(1, ge=1),
    db: Session = Depends(get_db)
):
    """
    Historial completo de movimientos del almacén.
    """
    filtros = {
        "producto_id": producto_id,
        "tipo_producto": tipo_producto,
        "tipo_movimiento": tipo_movimiento,
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta,
        "pagina": pagina
    }
    
    filtros = {k: v for k, v in filtros.items() if v is not None}
    
    return AlmacenService.get_historial(db, filtros)
@router.get("/alertas-stock")
def alertas_stock(db: Session = Depends(get_db)):
    resultado = AlmacenService._get_stock_bajo(db)
    return resultado


@router.get("/caducidades")
def caducidades(dias: int = Query(30, ge=1), db: Session = Depends(get_db)):
    cad = db.execute(text("""
        SELECT 
            ea.id_entrada,
            COALESCE(i.nombre, m.nombre) as producto_nombre,
            COALESCE(i.unidad_medida, m.unidad_medida) as unidad,
            ea.cantidad,
            ea.fecha_caducidad,
            (ea.fecha_caducidad - CURRENT_DATE) as dias_restantes
        FROM entrada_almacen ea
        LEFT JOIN ingredientes i ON ea.id_ingrediente = i.id_ingredientes
        LEFT JOIN medicamentos m ON ea.id_medicamento = m.id_medicamento
        WHERE ea.fecha_caducidad IS NOT NULL
        AND ea.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + :dias
        AND ea.cantidad > 0
        ORDER BY ea.fecha_caducidad ASC
    """), {"dias": dias}).fetchall()
    
    return [row_to_dict(c) for c in cad]


@router.get("/sugerir-compra")
def sugerir_compras(db: Session = Depends(get_db)):
    return AlmacenService.sugerir_compras(db)


@router.post("/generar-orden")
def generar_orden(data: dict, db: Session = Depends(get_db)):
    from datetime import datetime
    
    productos = data.get("productos", [])
    total = sum(
        p.get("cantidad_sugerida", 0) * p.get("precio_unitario", 0) 
        for p in productos
    )
    
    return {
        "numero_orden": f"OC-{datetime.now().strftime('%Y%m%d')}-{datetime.now().strftime('%H%M%S')}",
        "fecha": date.today().isoformat(),
        "total_estimado": round(total, 2),
        "productos": productos
    }

@router.get("/estadisticas")
def estadisticas(periodo: str = Query("mes"), db: Session = Depends(get_db)):
    return {"periodo": periodo, "datos": []}


@router.get("/consumo-promedio/{id_producto}")
def consumo_promedio(id_producto: int, dias: int = Query(30), db: Session = Depends(get_db)):
    return {"id_producto": id_producto, "dias": dias, "promedio": 0}
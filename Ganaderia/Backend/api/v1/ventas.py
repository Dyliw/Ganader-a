# backend/app/api/v1/ventas.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.services.ventas_service import VentasService

router = APIRouter()

# ========== ANIMALES DISPONIBLES ==========
@router.get("/animales-disponibles")
def animales_disponibles(db: Session = Depends(get_db)):
    """Lista animales disponibles para venta (vivos, sin retiro)"""
    return VentasService.get_animales_disponibles(db)

# ========== VENTAS ==========
@router.post("")
def crear_venta(data: dict, db: Session = Depends(get_db)):
    """Procesa una nueva venta"""
    return VentasService.crear_venta(db, data)

@router.get("")
def listar_ventas(
    fecha_desde: str = Query(None),
    fecha_hasta: str = Query(None),
    comprador: str = Query(None),
    pagina: int = Query(1),
    db: Session = Depends(get_db)
):
    """Lista ventas con filtros"""
    condiciones = ["1=1"]
    params = {}
    
    if fecha_desde:
        condiciones.append("v.fecha_venta >= :desde")
        params["desde"] = fecha_desde
    if fecha_hasta:
        condiciones.append("v.fecha_venta <= :hasta")
        params["hasta"] = fecha_hasta
    if comprador:
        condiciones.append("v.id_comprador = :comp")
        params["comp"] = int(comprador)
    
    where = " AND ".join(condiciones)
    limite = 20
    offset = (pagina - 1) * limite
    
    total = db.execute(text(f"SELECT COUNT(*) FROM ventas v WHERE {where}"), params).fetchone()[0]
    
    ventas = db.execute(text(f"""
        SELECT v.*, c.nombre as comprador,
               (SELECT COUNT(*) FROM venta_detalle WHERE id_venta = v.id_venta) as cantidad_animales
        FROM ventas v
        JOIN compradores c ON v.id_comprador = c.id_comprador
        WHERE {where}
        ORDER BY v.fecha_venta DESC, v.id_venta DESC
        LIMIT :limite OFFSET :offset
    """), {**params, "limite": limite, "offset": offset}).fetchall()
    
    # Convertir a diccionarios
    ventas_list = []
    for v in ventas:
        ventas_list.append({
            "id_venta": v.id_venta,
            "fecha_venta": str(v.fecha_venta),
            "precio_kg": float(v.precio_kg),
            "peso_total": float(v.peso_total),
            "total": float(v.total),
            "estatus": v.estatus,
            "comprador": v.comprador,
            "cantidad_animales": v.cantidad_animales
        })
    
    return {
        "ventas": ventas_list,
        "total": total,
        "pagina": pagina,
        "total_paginas": max(1, (total + limite - 1) // limite)
    }

@router.get("/{id_venta}/detalle")
def detalle_venta(id_venta: int, db: Session = Depends(get_db)):
    """Obtiene detalle completo de venta con animales"""
    return VentasService.get_detalle_venta(db, id_venta)

# ========== COMPRADORES ==========
@router.get("/compradores")
def listar_compradores(db: Session = Depends(get_db)):
    """Lista todos los compradores"""
    comps = db.execute(text("SELECT * FROM compradores ORDER BY nombre")).fetchall()
    
    resultado = []
    for c in comps:
        resultado.append({
            "id_comprador": c.id_comprador,
            "nombre": c.nombre,
            "rfc": c.rfc,
            "telefono": c.telefono,
            "direccion": c.direccion
        })
    
    return resultado

@router.post("/compradores")
def crear_comprador(data: dict, db: Session = Depends(get_db)):
    """Crea un nuevo comprador"""
    result = db.execute(text("""
        INSERT INTO compradores (nombre, rfc, telefono, direccion)
        VALUES (:nombre, :rfc, :telefono, :direccion)
        RETURNING id_comprador
    """), {
        "nombre": data.get("nombre"),
        "rfc": data.get("rfc"),
        "telefono": data.get("telefono"),
        "direccion": data.get("direccion")
    })
    db.commit()
    
    return {
        "id_comprador": result.fetchone().id_comprador,
        "nombre": data.get("nombre"),
        "rfc": data.get("rfc"),
        "telefono": data.get("telefono"),
        "direccion": data.get("direccion")
    }
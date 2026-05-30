from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

router = APIRouter()

@router.get("")
def listar_ingredientes(db: Session = Depends(get_db)):
    """Lista todos los ingredientes"""
    resultado = db.execute(text("""
        SELECT 
            id_ingredientes,
            nombre,
            unidad_medida,
            stock_actual,
            stock_minimo,
            precio_unitario,
            activo
        FROM ingredientes 
        ORDER BY nombre
    """)).fetchall()
    ingredientes = []
    for row in resultado:
        ingredientes.append({
            "id_ingredientes": row[0],
            "nombre": row[1],
            "unidad_medida": row[2],
            "stock_actual": float(row[3]) if row[3] is not None else 0,
            "stock_minimo": float(row[4]) if row[4] is not None else 0,
            "precio_unitario": float(row[5]) if row[5] is not None else 0,
            "activo": row[6]
        })
    
    return ingredientes


@router.post("")
def crear_ingrediente(data: dict, db: Session = Depends(get_db)):
    """Crea un nuevo ingrediente"""
    try:
        resultado = db.execute(text("""
            INSERT INTO ingredientes (nombre, unidad_medida, stock_actual, stock_minimo, precio_unitario)
            VALUES (:nombre, :unidad, :stock, :minimo, :precio)
            RETURNING id_ingredientes
        """), {
            "nombre": data["nombre"],
            "unidad": data["unidad_medida"],
            "stock": data.get("stock_actual", 0),
            "minimo": data.get("stock_minimo", 0),
            "precio": data.get("precio_unitario", 0)
        })
        db.commit()
        return {"mensaje": "Ingrediente creado", "id": resultado.fetchone()[0]}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{id_ingrediente}")
def actualizar_ingrediente(id_ingrediente: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza datos del ingrediente"""
    db.execute(text("""
        UPDATE ingredientes 
        SET nombre = COALESCE(:nombre, nombre),
            unidad_medida = COALESCE(:unidad, unidad_medida),
            precio_unitario = COALESCE(:precio, precio_unitario),
            stock_minimo = COALESCE(:minimo, stock_minimo),
            activo = COALESCE(:activo, activo)
        WHERE id_ingredientes = :id
    """), {
        "id": id_ingrediente,
        "nombre": data.get("nombre"),
        "unidad": data.get("unidad_medida"),
        "precio": data.get("precio_unitario"),
        "minimo": data.get("stock_minimo"),
        "activo": data.get("activo")
    })
    db.commit()
    return {"mensaje": "Ingrediente actualizado"}


@router.patch("/{id_ingrediente}/stock")
def actualizar_stock(id_ingrediente: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza el stock (suma o resta)"""
    
    operacion = data.get("operacion", "sumar")
    cantidad = abs(data["cantidad"])
    
    if operacion == "restar":
        cantidad = -cantidad
    
    db.execute(text("""
        UPDATE ingredientes 
        SET stock_actual = stock_actual + :cantidad
        WHERE id_ingredientes = :id
    """), {"id": id_ingrediente, "cantidad": cantidad})
    
    db.commit()
    
    # Verificar si quedó bajo stock
    ingrediente = db.execute(text("""
        SELECT nombre, stock_actual, stock_minimo 
        FROM ingredientes WHERE id_ingredientes = :id
    """), {"id": id_ingrediente}).fetchone()
    
    nombre = ingrediente[0]
    stock_actual = float(ingrediente[1]) if ingrediente[1] is not None else 0
    stock_minimo = float(ingrediente[2]) if ingrediente[2] is not None else 0
    
    mensaje = "Stock actualizado"
    if stock_actual <= stock_minimo:
        mensaje += f" ⚠️ {nombre} está en nivel mínimo!"
    
    return {"mensaje": mensaje, "stock_actual": stock_actual}


@router.get("/stock-bajo")
def ingredientes_stock_bajo(db: Session = Depends(get_db)):
    """Lista ingredientes con stock bajo"""
    resultado = db.execute(text("""
        SELECT 
            id_ingredientes,
            nombre,
            unidad_medida,
            stock_actual,
            stock_minimo,
            precio_unitario,
            activo
        FROM ingredientes 
        WHERE stock_actual <= stock_minimo AND activo = true
        ORDER BY (stock_actual - stock_minimo) ASC
    """)).fetchall()
    
    bajos = []
    for row in resultado:
        bajos.append({
            "id_ingredientes": row[0],
            "nombre": row[1],
            "unidad_medida": row[2],
            "stock_actual": float(row[3]) if row[3] is not None else 0,
            "stock_minimo": float(row[4]) if row[4] is not None else 0,
            "precio_unitario": float(row[5]) if row[5] is not None else 0,
            "activo": row[6]
        })
    
    return bajos
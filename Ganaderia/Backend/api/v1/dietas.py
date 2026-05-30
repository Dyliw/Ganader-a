from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

router = APIRouter()


def row_to_dict(row, columns):
    """Helper para convertir una fila a diccionario"""
    return {col: row[i] for i, col in enumerate(columns)}


@router.get("")
def listar_dietas(db: Session = Depends(get_db)):
    """Lista todas las dietas con su costo calculado"""
    
    resultado = db.execute(text("""
        SELECT 
            d.id_dieta,
            d.nombre,
            d.factor,
            d.descripcion,
            d.activo,
            COUNT(di.id_ingredientes) as total_ingredientes,
            COALESCE(SUM(di.porcentaje), 0) as suma_porcentajes,
            ROUND(COALESCE(SUM((di.porcentaje/100.0) * i.precio_unitario), 0)::numeric, 2) as costo_kg
        FROM dietas d
        LEFT JOIN dieta_ingredientes di ON d.id_dieta = di.id_dieta
        LEFT JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
        GROUP BY d.id_dieta
        ORDER BY d.nombre
    """)).fetchall()
   
    dietas = []
    for row in resultado:
        dietas.append({
            "id_dieta": row[0],
            "nombre": row[1],
            "factor": float(row[2]) if row[2] is not None else None,
            "descripcion": row[3],
            "activo": row[4],
            "total_ingredientes": int(row[5]) if row[5] is not None else 0,
            "suma_porcentajes": float(row[6]) if row[6] is not None else 0,
            "costo_kg": float(row[7]) if row[7] is not None else 0
        })
    
    return dietas


@router.get("/{id_dieta}")
def detalle_dieta(id_dieta: int, db: Session = Depends(get_db)):
    """Obtiene dieta con sus ingredientes y porcentajes"""
    
    # Obtener la dieta
    dieta_row = db.execute(text("""
        SELECT id_dieta, nombre, factor, descripcion, activo
        FROM dietas WHERE id_dieta = :id
    """), {"id": id_dieta}).fetchone()
    
    if not dieta_row:
        raise HTTPException(status_code=404, detail="Dieta no encontrada")
    
    dieta = {
        "id_dieta": dieta_row[0],
        "nombre": dieta_row[1],
        "factor": float(dieta_row[2]) if dieta_row[2] is not None else None,
        "descripcion": dieta_row[3],
        "activo": dieta_row[4]
    }
    
    ingredientes_rows = db.execute(text("""
        SELECT 
            di.porcentaje,
            i.id_ingredientes,
            i.nombre,
            i.unidad_medida,
            i.precio_unitario,
            i.stock_actual,
            ROUND((di.porcentaje/100.0) * i.precio_unitario, 2) as costo_porcentaje
        FROM dieta_ingredientes di
        JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
        WHERE di.id_dieta = :id
        ORDER BY di.porcentaje DESC
    """), {"id": id_dieta}).fetchall()
    
    ingredientes = []
    suma_porcentajes = 0
    for row in ingredientes_rows:
        porcentaje = float(row[0]) if row[0] is not None else 0
        suma_porcentajes += porcentaje
        ingredientes.append({
            "porcentaje": porcentaje,
            "id_ingredientes": row[1],
            "nombre": row[2],
            "unidad_medida": row[3],
            "precio_unitario": float(row[4]) if row[4] is not None else 0,
            "stock_actual": float(row[5]) if row[5] is not None else 0,
            "costo_porcentaje": float(row[6]) if row[6] is not None else 0
        })
    
    return {
        "dieta": dieta,
        "ingredientes": ingredientes,
        "suma_porcentajes": round(suma_porcentajes, 1)
    }


@router.post("")
def crear_dieta(data: dict, db: Session = Depends(get_db)):
    """Crea una nueva dieta"""
    try:
        resultado = db.execute(text("""
            INSERT INTO dietas (nombre, factor, descripcion)
            VALUES (:nombre, :factor, :desc)
            RETURNING id_dieta
        """), {
            "nombre": data["nombre"],
            "factor": data.get("factor", 0.03),
            "desc": data.get("descripcion", "")
        })
        db.commit()
        return {"mensaje": "Dieta creada", "id_dieta": resultado.fetchone()[0]}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{id_dieta}")
def actualizar_dieta(id_dieta: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza datos básicos de la dieta"""
    db.execute(text("""
        UPDATE dietas 
        SET nombre = COALESCE(:nombre, nombre),
            factor = COALESCE(:factor, factor),
            descripcion = COALESCE(:desc, descripcion),
            activo = COALESCE(:activo, activo)
        WHERE id_dieta = :id
    """), {
        "id": id_dieta,
        "nombre": data.get("nombre"),
        "factor": data.get("factor"),
        "desc": data.get("descripcion"),
        "activo": data.get("activo")
    })
    db.commit()
    return {"mensaje": "Dieta actualizada"}


@router.patch("/{id_dieta}/desactivar")
def desactivar_dieta(id_dieta: int, db: Session = Depends(get_db)):
    """Desactiva una dieta"""
    db.execute(text("""
        UPDATE dietas SET activo = false WHERE id_dieta = :id
    """), {"id": id_dieta})
    db.commit()
    return {"mensaje": "Dieta desactivada"}


@router.post("/{id_dieta}/ingredientes")
def agregar_ingrediente(id_dieta: int, data: dict, db: Session = Depends(get_db)):
    """Agrega un ingrediente a la dieta"""
    existe = db.execute(text("""
        SELECT id_ingredientes FROM ingredientes 
        WHERE id_ingredientes = :id AND activo = true
    """), {"id": data["id_ingrediente"]}).fetchone()
    
    if not existe:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
    
    suma_actual = db.execute(text("""
        SELECT COALESCE(SUM(porcentaje), 0) as total 
        FROM dieta_ingredientes 
        WHERE id_dieta = :id AND id_ingredientes != :ing
    """), {"id": id_dieta, "ing": data["id_ingrediente"]}).fetchone()
    
    if float(suma_actual[0]) + data["porcentaje"] > 100:
        raise HTTPException(status_code=400, detail="La suma de porcentajes excede 100%")
    
    db.execute(text("""
        INSERT INTO dieta_ingredientes (id_dieta, id_ingredientes, porcentaje)
        VALUES (:dieta, :ing, :porc)
        ON CONFLICT (id_dieta, id_ingredientes) 
        DO UPDATE SET porcentaje = :porc
    """), {
        "dieta": id_dieta,
        "ing": data["id_ingrediente"],
        "porc": data["porcentaje"]
    })
    
    db.commit()
    return {"mensaje": "Ingrediente agregado/actualizado"}


@router.put("/{id_dieta}/ingredientes/{id_ingrediente}")
def actualizar_porcentaje(id_dieta: int, id_ingrediente: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza el porcentaje de un ingrediente"""
    db.execute(text("""
        UPDATE dieta_ingredientes 
        SET porcentaje = :porc
        WHERE id_dieta = :dieta AND id_ingredientes = :ing
    """), {
        "dieta": id_dieta,
        "ing": id_ingrediente,
        "porc": data["porcentaje"]
    })
    db.commit()
    return {"mensaje": "Porcentaje actualizado"}


@router.delete("/{id_dieta}/ingredientes/{id_ingrediente}")
def eliminar_ingrediente(id_dieta: int, id_ingrediente: int, db: Session = Depends(get_db)):
    """Elimina un ingrediente de la dieta"""
    db.execute(text("""
        DELETE FROM dieta_ingredientes 
        WHERE id_dieta = :dieta AND id_ingredientes = :ing
    """), {"dieta": id_dieta, "ing": id_ingrediente})
    db.commit()
    return {"mensaje": "Ingrediente eliminado de la dieta"}


@router.get("/{id_dieta}/costo")
def costo_dieta(id_dieta: int, db: Session = Depends(get_db)):
    """Calcula el costo por kg de la dieta"""
    row = db.execute(text("""
        SELECT ROUND(COALESCE(SUM((di.porcentaje/100.0) * i.precio_unitario), 0)::numeric, 2) as costo_kg
        FROM dieta_ingredientes di
        JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
        WHERE di.id_dieta = :id
    """), {"id": id_dieta}).fetchone()
    
    return {"costo_kg": float(row[0]) if row and row[0] else 0}
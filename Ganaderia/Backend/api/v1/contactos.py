from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

router = APIRouter()

def row_to_dict(row):
    """Convierte fila a dict"""
    if row is None:
        return None
    try:
        return dict(row._mapping)
    except AttributeError:
        try:
            return dict(row)
        except (TypeError, ValueError):
            return {k: v for k, v in row.items()}

def rows_to_dicts(rows):
    """Convierte lista de filas a lista de dicts"""
    return [row_to_dict(r) for r in rows] if rows else []

@router.get("/compradores")
def listar_compradores(db: Session = Depends(get_db)):
    """Lista todos los compradores activos"""
    compradores = db.execute(text("""
        SELECT * FROM compradores 
        WHERE activo = true 
        ORDER BY nombre
    """)).fetchall()
    return rows_to_dicts(compradores)

@router.get("/buscar")
def buscar_contactos(
    tipo: str = Query("todos"),
    q: str = Query(""),
    db: Session = Depends(get_db)
):
    """Búsqueda para autocompletado"""
    resultados = []
    termino = f"%{q}%"
    
    if tipo in ['proveedor', 'todos']:
        provs = db.execute(text("""
            SELECT 
                id_proveedor, 
                nombre, 
                apellido_paterno, 
                apellido_materno,
                rfc, 
                telefono, 
                celular, 
                municipio, 
                estado_procedencia,
                'Proveedor' as tipo_contacto
            FROM proveedores
            WHERE activo = true
            AND (
                nombre ILIKE :q 
                OR COALESCE(rfc, '') ILIKE :q 
                OR COALESCE(municipio, '') ILIKE :q
                OR COALESCE(apellido_paterno, '') ILIKE :q
            )
            LIMIT 10
        """), {"q": termino}).fetchall()
        resultados.extend(rows_to_dicts(provs))
    
    if tipo in ['comprador', 'todos']:
        comps = db.execute(text("""
            SELECT 
                id_comprador,
                nombre,
                apellido_paterno,
                apellido_materno,
                rfc,
                telefono,
                celular,
                municipio,
                estado,
                'Comprador' as tipo_contacto
            FROM compradores
            WHERE activo = true
            AND (
                nombre ILIKE :q
                OR COALESCE(rfc, '') ILIKE :q
                OR COALESCE(municipio, '') ILIKE :q
                OR COALESCE(apellido_paterno, '') ILIKE :q
            )
            LIMIT 10
        """), {"q": termino}).fetchall()
        resultados.extend(rows_to_dicts(comps))
    
    return resultados


@router.post("")
def crear_contacto(data: dict, db: Session = Depends(get_db)):
    """Crea un nuevo contacto (proveedor o comprador)"""
    
    tipo = data.get("tipo", "Proveedor")
    
    try:
        if tipo == "Proveedor" or tipo == "Ambos":
            resultado = db.execute(text("""
                INSERT INTO proveedores (
                    nombre, apellido_paterno, apellido_materno,
                    rfc, telefono, celular, email,
                    direccion, municipio, estado_procedencia,
                    codigo_postal, contacto_nombre, contacto_apellido,
                    tipo, notas
                ) VALUES (
                    :nombre, :ap, :am,
                    :rfc, :tel, :cel, :email,
                    :dir, :mun, :estado,
                    :cp, :c_nombre, :c_apellido,
                    :tipo, :notas
                )
                RETURNING id_proveedor
            """), {
                "nombre": data["nombre"],
                "ap": data.get("apellido_paterno"),
                "am": data.get("apellido_materno"),
                "rfc": data.get("rfc"),
                "tel": data.get("telefono"),
                "cel": data.get("celular"),
                "email": data.get("email"),
                "dir": data.get("direccion"),
                "mun": data.get("municipio"),
                "estado": data.get("estado_procedencia") or data.get("estado"),
                "cp": data.get("codigo_postal"),
                "c_nombre": data.get("contacto_nombre"),
                "c_apellido": data.get("contacto_apellido"),
                "tipo": tipo,
                "notas": data.get("notas")
            })
            
            id_creado = resultado.fetchone().id_proveedor
            
        if tipo == "Comprador" or tipo == "Ambos":
            resultado = db.execute(text("""
                INSERT INTO compradores (
                    nombre, apellido_paterno, apellido_materno,
                    rfc, telefono, celular, email,
                    direccion, municipio, estado,
                    codigo_postal, tipo_persona, notas
                ) VALUES (
                    :nombre, :ap, :am,
                    :rfc, :tel, :cel, :email,
                    :dir, :mun, :estado,
                    :cp, :tipo_per, :notas
                )
                RETURNING id_comprador
            """), {
                "nombre": data["nombre"],
                "ap": data.get("apellido_paterno"),
                "am": data.get("apellido_materno"),
                "rfc": data.get("rfc"),
                "tel": data.get("telefono"),
                "cel": data.get("celular"),
                "email": data.get("email"),
                "dir": data.get("direccion"),
                "mun": data.get("municipio"),
                "estado": data.get("estado_procedencia") or data.get("estado"),
                "cp": data.get("codigo_postal"),
                "tipo_per": data.get("tipo_persona", "Física"),
                "notas": data.get("notas")
            })
            
            if tipo == "Comprador":
                id_creado = resultado.fetchone().id_comprador
        
        db.commit()
        return {
            "mensaje": "Contacto creado exitosamente",
            "id": id_creado,
            "tipo": tipo
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear contacto: {str(e)}")

@router.post("/rapido")
def crear_contacto_rapido(data: dict, db: Session = Depends(get_db)):
    """Crea contacto con datos mínimos"""
    
    tipo = data.get("tipo", "Proveedor")
    
    try:
        if tipo == "Proveedor":
            result = db.execute(text("""
                INSERT INTO proveedores (nombre, telefono, celular)
                VALUES (:nombre, :tel, :cel)
                RETURNING id_proveedor
            """), {
                "nombre": data["nombre"],
                "tel": data.get("telefono"),
                "cel": data.get("celular")
            })
            id_creado = result.fetchone().id_proveedor
        else:
            result = db.execute(text("""
                INSERT INTO compradores (nombre, telefono, celular)
                VALUES (:nombre, :tel, :cel)
                RETURNING id_comprador
            """), {
                "nombre": data["nombre"],
                "tel": data.get("telefono"),
                "cel": data.get("celular")
            })
            id_creado = result.fetchone().id_comprador
        
        db.commit()
        return {
            "mensaje": "Contacto creado rápidamente",
            "id": id_creado,
            "tipo": tipo
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{tipo}/{id}")
def actualizar_contacto(tipo: str, id: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza un contacto existente"""
    
    try:
        if tipo == "proveedor":
            db.execute(text("""
                UPDATE proveedores SET
                    nombre = COALESCE(:nombre, nombre),
                    apellido_paterno = COALESCE(:ap, apellido_paterno),
                    apellido_materno = COALESCE(:am, apellido_materno),
                    rfc = COALESCE(:rfc, rfc),
                    telefono = COALESCE(:tel, telefono),
                    celular = COALESCE(:cel, celular),
                    email = COALESCE(:email, email),
                    direccion = COALESCE(:dir, direccion),
                    municipio = COALESCE(:mun, municipio),
                    estado_procedencia = COALESCE(:estado, estado_procedencia),
                    codigo_postal = COALESCE(:cp, codigo_postal),
                    notas = COALESCE(:notas, notas)
                WHERE id_proveedor = :id
            """), {
                "id": id,
                "nombre": data.get("nombre"),
                "ap": data.get("apellido_paterno"),
                "am": data.get("apellido_materno"),
                "rfc": data.get("rfc"),
                "tel": data.get("telefono"),
                "cel": data.get("celular"),
                "email": data.get("email"),
                "dir": data.get("direccion"),
                "mun": data.get("municipio"),
                "estado": data.get("estado_procedencia") or data.get("estado"),
                "cp": data.get("codigo_postal"),
                "notas": data.get("notas")
            })
        else:
            db.execute(text("""
                UPDATE compradores SET
                    nombre = COALESCE(:nombre, nombre),
                    apellido_paterno = COALESCE(:ap, apellido_paterno),
                    apellido_materno = COALESCE(:am, apellido_materno),
                    rfc = COALESCE(:rfc, rfc),
                    telefono = COALESCE(:tel, telefono),
                    celular = COALESCE(:cel, celular),
                    email = COALESCE(:email, email),
                    direccion = COALESCE(:dir, direccion),
                    municipio = COALESCE(:mun, municipio),
                    estado = COALESCE(:estado, estado),
                    codigo_postal = COALESCE(:cp, codigo_postal),
                    notas = COALESCE(:notas, notas)
                WHERE id_comprador = :id
            """), {
                "id": id,
                "nombre": data.get("nombre"),
                "ap": data.get("apellido_paterno"),
                "am": data.get("apellido_materno"),
                "rfc": data.get("rfc"),
                "tel": data.get("telefono"),
                "cel": data.get("celular"),
                "email": data.get("email"),
                "dir": data.get("direccion"),
                "mun": data.get("municipio"),
                "estado": data.get("estado_procedencia") or data.get("estado"),
                "cp": data.get("codigo_postal"),
                "notas": data.get("notas")
            })
        
        db.commit()
        return {"mensaje": "Contacto actualizado"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{tipo}/{id}/desactivar")
def desactivar_contacto(tipo: str, id: int, db: Session = Depends(get_db)):
    """Desactiva un contacto"""
    
    try:
        if tipo == "proveedor":
            db.execute(text("""
                UPDATE proveedores SET activo = false WHERE id_proveedor = :id
            """), {"id": id})
        else:
            db.execute(text("""
                UPDATE compradores SET activo = false WHERE id_comprador = :id
            """), {"id": id})
        
        db.commit()
        return {"mensaje": "Contacto desactivado"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
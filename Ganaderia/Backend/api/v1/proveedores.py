from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

router = APIRouter()

@router.get("")
def listar_proveedores(db: Session = Depends(get_db)):
    """Lista todos los proveedores"""
    try:
        proveedores = db.execute(text("""
            SELECT 
                id_proveedor,
                nombre,
                COALESCE(apellido_paterno, '') as apellido_paterno,
                COALESCE(apellido_materno, '') as apellido_materno,
                COALESCE(rfc, '') as rfc,
                COALESCE(telefono, '') as telefono,
                COALESCE(direccion, '') as direccion,
                activo
            FROM proveedores 
            ORDER BY nombre
        """)).fetchall()
        
        return [dict(p._mapping) for p in proveedores]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def crear_proveedor(data: dict, db: Session = Depends(get_db)):
    """Crea un nuevo proveedor"""
    try:
        if isinstance(data, str):
            nombre = data
        else:
            nombre = data.get("nombre", "")
        
        if not nombre or not nombre.strip():
            raise HTTPException(status_code=400, detail="El nombre es obligatorio")
        
        params = {
            "nombre": nombre.strip(),
            "apellido_paterno": data.get("apellido_paterno") if isinstance(data, dict) else None,
            "rfc": data.get("rfc") if isinstance(data, dict) else None,
            "telefono": data.get("telefono") if isinstance(data, dict) else None,
            "direccion": data.get("direccion") if isinstance(data, dict) else None
        }
        
        result = db.execute(text("""
            INSERT INTO proveedores (nombre, apellido_paterno, rfc, telefono, direccion)
            VALUES (:nombre, :apellido_paterno, :rfc, :telefono, :direccion)
            RETURNING id_proveedor
        """), params)
        
        db.commit()
        return {
            "mensaje": "Proveedor creado",
            "id_proveedor": result.fetchone().id_proveedor
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
@router.put("/{id}")
def actualizar_proveedor(id: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza datos del proveedor"""
    try:
        sets = []
        params = {"id": id}
        
        campos_permitidos = [
            "nombre", "apellido_paterno", "apellido_materno", 
            "rfc", "telefono", "direccion", "activo"
        ]
        
        for campo in campos_permitidos:
            if campo in data:
                sets.append(f"{campo} = :{campo}")
                params[campo] = data[campo]
        
        if not sets:
            raise HTTPException(status_code=400, detail="No hay campos para actualizar")
        
        query = f"""
            UPDATE proveedores 
            SET {', '.join(sets)}
            WHERE id_proveedor = :id
        """
        
        db.execute(text(query), params)
        db.commit()
        return {"mensaje": "Proveedor actualizado"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
from functools import wraps
from fastapi import HTTPException, Depends, text
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.v1.seguridad import get_current_user

def check_permiso(modulo: str, accion: str):  # accion: 'leer','crear','editar','eliminar'
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user = Depends(get_current_user), db: Session = Depends(get_db), **kwargs):
            # Obtener permisos del puesto
            permiso = db.execute(text("""
                SELECT p.puede_leer, p.puede_crear, p.puede_editar, p.puede_eliminar
                FROM permisos p
                JOIN modulos m ON p.id_modulo = m.id_modulo
                WHERE p.id_puesto = :puesto AND m.nombre = :modulo
            """), {"puesto": current_user["id_puesto"], "modulo": modulo}).fetchone()
           
            if not permiso or not getattr(permiso, f"puede_{accion}", False):
                raise HTTPException(status_code=403, detail="No tienes permiso para esta acción")
            return await func(*args, current_user=current_user, db=db, **kwargs)
        return wrapper
    return decorator
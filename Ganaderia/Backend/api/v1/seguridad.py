from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Comparación directa (sin hash)
def verificar_password(password: str, stored_password: str) -> bool:
    return password == stored_password

def hash_password(password: str) -> str:
    return password  # Sin hash, devuelve el mismo texto

def crear_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        empleado_id: str = payload.get("sub")
        if empleado_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.execute(text("""
        SELECT e.id_empleado, e.usuario, e.nombre, e.apellido_paterno,
               e.id_puesto, p.nombre as puesto_nombre, e.activo
        FROM empleados e
        JOIN puestos p ON e.id_puesto = p.id_puesto
        WHERE e.id_empleado = :id_empleado AND e.activo = true
    """), {"id_empleado": int(empleado_id)}).fetchone()

    if user is None:
        raise credentials_exception

    return {
        "id_empleado": user.id_empleado,
        "usuario": user.usuario,
        "nombre": user.nombre,
        "apellido_paterno": user.apellido_paterno,
        "id_puesto": user.id_puesto,
        "puesto_nombre": user.puesto_nombre,
        "activo": user.activo
    }

def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("activo", True):
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user

def require_permission(modulo: str, permiso: str = "puede_leer"):
    def permission_checker(
        current_user: dict = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        if current_user.get("puesto_nombre") == "Administrador":
            return current_user

        tiene_permiso = db.execute(text(f"""
            SELECT 1 FROM permisos p
            WHERE p.id_puesto = :id_puesto
            AND p.id_modulo = (SELECT id_modulo FROM modulos WHERE nombre = :modulo)
            AND p.{permiso} = true
        """), {
            "id_puesto": current_user["id_puesto"],
            "modulo": modulo
        }).fetchone()

        if not tiene_permiso:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permiso para {permiso} en {modulo}"
            )
        return current_user
    return permission_checker
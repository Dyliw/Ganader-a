from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.api.v1.seguridad import (
    verificar_password, crear_token, get_current_active_user, 
    require_permission, get_current_user
)
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    usuario: str
    contrasena: str

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("""
            SELECT id_empleado, usuario, contrasena, id_puesto, nombre
            FROM empleados 
            WHERE usuario = :usuario AND activo = true
        """),
        {"usuario": data.usuario}
    ).fetchone()
    
    if not user or user.contrasena != data.contrasena:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    token = crear_token({"sub": str(user.id_empleado), "puesto": user.id_puesto})
    
    puesto = db.execute(
        text("SELECT nombre FROM puestos WHERE id_puesto = :id"),
        {"id": user.id_puesto}
    ).fetchone()
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "id_empleado": user.id_empleado,
        "usuario": user.usuario,
        "puesto": puesto.nombre if puesto else "Sin puesto"
    }
@router.get("/permisos")
def get_permisos(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"Buscando permisos para puesto: {current_user['id_puesto']}")  # Debug
    permisos = db.execute(
        text("""
            SELECT m.nombre as modulo, p.puede_leer, p.puede_crear, p.puede_editar, p.puede_eliminar
            FROM permisos p
            JOIN modulos m ON p.id_modulo = m.id_modulo
            WHERE p.id_puesto = :puesto
        """),
        {"puesto": current_user["id_puesto"]}
    ).fetchall()
    
    print(f"Permisos encontrados: {len(permisos)}")  # Debug
    
    resultado = {}
    for p in permisos:
        resultado[p.modulo] = {
            "leer": p.puede_leer,
            "crear": p.puede_crear,
            "editar": p.puede_editar,
            "eliminar": p.puede_eliminar
        }
    print(f"Resultado: {resultado}")  # Debug
    return resultado

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_active_user)):
    return {
        "id_empleado": current_user["id_empleado"],
        "usuario": current_user["usuario"],
        "nombre": current_user["nombre"],
        "apellido_paterno": current_user.get("apellido_paterno"),
        "puesto": current_user["puesto_nombre"],
        "id_puesto": current_user["id_puesto"]
    }
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

router = APIRouter()

@router.get("/proveedores")
def listar_proveedores(db: Session = Depends(get_db)):
    proveedores = db.execute(text(
        "SELECT * FROM proveedores WHERE activo = true ORDER BY nombre"
    )).fetchall()
    return [dict(p) for p in proveedores]

@router.get("/compradores") 
def listar_compradores(db: Session = Depends(get_db)):
    compradores = db.execute(text(
        "SELECT * FROM compradores WHERE activo = true ORDER BY nombre"
    )).fetchall()
    return [dict(c) for c in compradores]
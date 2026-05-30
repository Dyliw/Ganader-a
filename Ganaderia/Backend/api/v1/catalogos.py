from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.catalogo_service import CatalogoService

router = APIRouter()

@router.get("/estados", summary="Listar estados de animales")
def listar_estados(db: Session = Depends(get_db)):
    """Obtiene todos los estados (Activo, enfermo, muerto)"""
    return CatalogoService.get_estados(db)

@router.get("/empleados", summary="Listar empleados")
def listar_empleados(db: Session = Depends(get_db)):
    """Obtiene empleados activos con su puesto"""
    return CatalogoService.get_empleados(db)

@router.get("/dietas", summary="Listar dietas")
def listar_dietas(db: Session = Depends(get_db)):
    """Obtiene dietas disponibles para corrales"""
    return CatalogoService.get_dietas(db)

@router.get("/tipos-corral", summary="Listar tipos de corral")
def listar_tipos_corral(db: Session = Depends(get_db)):
    """Obtiene tipos de corral (Engorda, cuarentena.)"""
    return CatalogoService.get_tipos_corral(db)

@router.get("/medicamentos", summary="Listar medicamentos")
def listar_medicamentos(db: Session = Depends(get_db)):
    """Obtiene medicamentos disponibles con stock"""
    return CatalogoService.get_medicamentos(db)

@router.get("/compradores", summary="Listar compradores")
def listar_compradores(db: Session = Depends(get_db)):
    """Obtiene compradores registrados"""
    return CatalogoService.get_compradores(db)
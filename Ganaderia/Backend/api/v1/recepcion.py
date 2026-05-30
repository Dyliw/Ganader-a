# backend/app/api/v1/recepcion.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.schemas.recepcion import (AnimalCreate, AnimalesRango, 
    RecepcionCompletaCreate)

import traceback
from app.api.v1.seguridad import get_current_active_user, require_permission

from app.services.recepcion_service import RecepcionService
router = APIRouter()

# NUEVO: Endpoint unificado de recepción completa
@router.post("/completa", summary="Registrar recepción completa")
def crear_recepcion_completa(
    datos: RecepcionCompletaCreate,
    db: Session = Depends(get_db)
):
    """
    Registra GUÍA + RECEPCIÓN + ANIMALES en una sola operación.
    
    Puedes enviar:
    - Lista de animales individuales (campo `animales`)
    - O un rango de aretes (campo `rango_animales`)
    """
    empleado_id = 4  # Temporal: reemplazar con usuario autenticado
    return RecepcionService.registrar_recepcion_completa(db, datos, empleado_id)


# HU-RE-01: Registrar animal individual (mantenido por compatibilidad)
@router.post("/animal")
def registrar_animal(
    animal: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("Recepción", "puede_crear"))
):
    empleado_id = current_user["id_empleado"]


# HU-RE-02: Registrar rango (mantenido por compatibilidad)
@router.post("/animales-rango", summary="Registrar lote por rango")
def crear_animales_rango(
    datos: AnimalesRango,
    db: Session = Depends(get_db)
):
    empleado_id = 4
    return RecepcionService._registrar_rango_interno(db, datos, empleado_id, None, datos.id_proveedor)


# GET: Listar recepciones
@router.get("/recepciones", summary="Listar recepciones")
def listar_recepciones(
    pagina: int = Query(1, ge=1),
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lista todas las recepciones con paginación"""
    return RecepcionService.listar_recepciones(db, pagina, limite)


# GET: Detalle de recepción
@router.get("/recepciones/{id_recepcion}", summary="Detalle de recepción")
def detalle_recepcion(
    id_recepcion: int,
    db: Session = Depends(get_db)
):
    """Obtiene detalle de una recepción con sus animales"""
    return RecepcionService.obtener_recepcion(db, id_recepcion)
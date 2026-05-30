from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class ServirComidaRequest(BaseModel):
    id_corral: int
    cantidad_kg: float = Field(..., gt=0, description="Cantidad en kilogramos")
    fecha: Optional[date] = None
    observaciones: Optional[str] = None
    id_empleado: int

class SustitucionRequest(BaseModel):
    id_corral: int
    id_ingrediente_faltante: int
    id_ingrediente_sustituto: int
    porcentaje_sustituto: float = Field(..., gt=0, le=100)
    fecha: Optional[date] = None
    id_empleado: int
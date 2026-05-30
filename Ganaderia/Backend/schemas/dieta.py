# backend/app/schemas/dietas.py
from pydantic import BaseModel, Field, validator
from typing import Optional

class DietaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=30)
    factor: Optional[float] = 0.03
    descripcion: Optional[str] = None

class DietaUpdate(BaseModel):
    nombre: Optional[str] = None
    factor: Optional[float] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None

class IngredienteDieta(BaseModel):
    id_ingrediente: int
    porcentaje: float = Field(..., gt=0, le=100)

    @validator('porcentaje')
    def validar_porcentaje(cls, v):
        if v <= 0 or v > 100:
            raise ValueError('El porcentaje debe ser entre 0.01 y 100')
        return v

class IngredienteCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=20)
    unidad_medida: str = Field(..., min_length=1, max_length=10)
    stock_actual: Optional[float] = 0
    stock_minimo: Optional[float] = 0
    precio_unitario: Optional[float] = 0

class IngredienteUpdate(BaseModel):
    nombre: Optional[str] = None
    unidad_medida: Optional[str] = None
    precio_unitario: Optional[float] = None
    stock_minimo: Optional[float] = None
    activo: Optional[bool] = None

class StockUpdate(BaseModel):  # ← Corregido el nombre de la clase
    cantidad: float = Field(..., gt=0)
    operacion: str = Field(..., pattern="^(sumar|restar)$")  # ← Corregido el patrón
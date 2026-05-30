from pydantic import BaseModel
from typing import Optional

class ProveedorResponse(BaseModel):
    id_proveedor: int
    nombre: str
    rfc: Optional[str] = None
    telefono: Optional[str] = None

class CorralDisponibleResponse(BaseModel):
    id_corral: int
    nombre: str
    capacidad: int
    ocupacion: int
    disponibles: int

class EstadoResponse(BaseModel):
    id_estado: int
    nombre: str
    descripcion: Optional[str] = None

class EmpleadoResponse(BaseModel):
    id_empleado: int
    nombre_completo: str
    puesto: str

class DietaResponse(BaseModel):
    id_dieta: int
    nombre: str
    descripcion: Optional[str] = None

class TipoCorralResponse(BaseModel):
    id_tipo: int
    nombre: str
    descripcion: Optional[str] = None

class MedicamentoResponse(BaseModel):
    id_medicamento: int
    nombre: str
    tipo_dosis: str
    stock: float
    unidad: str
    tipo: str

class CompradorResponse(BaseModel):
    id_comprador: int
    nombre: str
    rfc: Optional[str] = None
    telefono: Optional[str] = None
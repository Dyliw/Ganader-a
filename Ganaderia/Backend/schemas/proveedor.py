from pydantic import BaseModel, Field
from typing import Optional

class ProveedorCreate(BaseModel):
    nombre: str
    apellido_paterno: Optional[str] = None
    rfc: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    
    class Config:
        from_atributes = True
from pydantic import BaseModel, Field
id_corral: int
nombre: str
capacidad: int
ocupacion: int
disponibles: int
class Config:
    from_attributes = True
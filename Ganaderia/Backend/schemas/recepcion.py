from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date


class AnimalCreate(BaseModel):
    arete: str = Field(..., min_length=1, max_length=20)
    sexo: str = Field(..., pattern="^(macho|hembra)$")
    peso_entrada: float = Field(..., gt=0, le=2000)
    meses: int = Field(..., ge=1, le=300)
    precio_compra: float = Field(..., gt=0)
    id_proveedor: Optional[int] = None
    id_corral: Optional[int] = None
    id_guia: Optional[int] = None
    observaciones: Optional[str] = None
    
    @validator('arete')
    def arete_no_vacio(cls, v):
        if not v.strip():
            raise ValueError('El arete no puede estar vacío')
        return v.strip().upper()


class AnimalesRango(BaseModel):
    arete_inicial: str = Field(..., description="Ej: BOV-001")
    arete_final: str = Field(..., description="Ej: BOV-050")
    sexo: str = Field(..., pattern="^(macho|hembra)$")
    peso_promedio: float = Field(..., gt=0)
    meses_promedio: int = Field(..., ge=1, le=300)
    precio_compra: float = Field(..., gt=0)
    id_proveedor: Optional[int] = None
    id_corral: Optional[int] = None
    id_guia: Optional[int] = None
    
    @validator('arete_final')
    def validar_rango(cls, v, values):
        if 'arete_inicial' in values and values['arete_inicial']:
            import re
            match_inicial = re.match(r'^(.+?)(\d+)$', values['arete_inicial'])
            match_final = re.match(r'^(.+?)(\d+)$', v)
            
            if not match_inicial or not match_final:
                raise ValueError('Formato inválido. Use: PREFIJO+NÚMERO (ej: BOV-001)')
            
            if match_inicial.group(1) != match_final.group(1):
                raise ValueError('Los prefijos deben ser iguales')
            
            if int(match_final.group(2)) <= int(match_inicial.group(2)):
                raise ValueError('El arete final debe ser mayor al inicial')
        return v


class RecepcionCompletaCreate(BaseModel):
    # Datos de la guía
    numero_guia: str = Field(..., min_length=1, max_length=50)
    id_proveedor: int
    motivo: str = Field(..., min_length=1, max_length=100)
    fecha_guia: Optional[date] = None
    observaciones_guia: Optional[str] = None
    
    # Datos de la recepción
    animales_programados: int = Field(..., ge=0)
    animales_recibidos: int = Field(..., ge=0)
    animales_muertos: int = Field(0, ge=0)
    animales_enfermos: int = Field(0, ge=0)
    id_corral: Optional[int] = None
    observaciones_recepcion: Optional[str] = None
    
    # Lista de animales a registrar 
    animales: Optional[List[AnimalCreate]] = None
    
    # O si vienen en rango:
    rango_animales: Optional[AnimalesRango] = None
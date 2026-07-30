# -*- coding: utf-8 -*-
"""
Modelos Pydantic para Usuarios
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from datetime import datetime

class UsuarioLogin(BaseModel):
    nombre_usuario: str = Field(..., min_length=3, max_length=50)
    contrasena: str = Field(..., min_length=6)

class UsuarioCreate(BaseModel):
    nombre_usuario: str = Field(..., min_length=3, max_length=50)
    contrasena: str = Field(..., min_length=6)
    nombre_completo: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    id_rol: int = Field(..., gt=0)
    
    @validator('nombre_usuario')
    def validar_usuario(cls, v):
        if not v.isalnum():
            raise ValueError("El usuario solo puede contener letras y numeros")
        return v.lower()

class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    activo: Optional[bool] = None

class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre_usuario: str
    nombre_completo: str
    email: str
    id_rol: int
    activo: bool
    ultimo_acceso: Optional[datetime] = None
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse

class TokenData(BaseModel):
    sub: str
    id: int
    nombre: str
    rol: int
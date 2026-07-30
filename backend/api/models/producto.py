# -*- coding: utf-8 -*-
"""
Modelos Pydantic para Productos
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class ProductoBase(BaseModel):
    codigo: str = Field(..., min_length=3, max_length=50, description="Codigo unico del producto")
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del producto")
    descripcion: Optional[str] = Field(None, description="Descripcion detallada")
    id_categoria: Optional[int] = Field(None, description="ID de la categoria")
    id_proveedor: Optional[int] = Field(None, description="ID del proveedor")
    precio_compra: float = Field(default=0.0, ge=0, description="Precio de compra")
    precio_venta: float = Field(default=0.0, ge=0, description="Precio de venta")
    stock_actual: int = Field(default=0, ge=0, description="Stock actual")
    stock_minimo: int = Field(default=5, ge=0, description="Stock minimo permitido")
    stock_maximo: Optional[int] = Field(None, ge=0, description="Stock maximo recomendado")
    ubicacion: Optional[str] = Field(None, max_length=50, description="Ubicacion en deposito")
    unidad_medida: str = Field(default="unidad", max_length=20, description="Unidad de medida")
    activo: bool = Field(default=True, description="Producto activo")

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=3, max_length=50)
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    descripcion: Optional[str] = None
    id_categoria: Optional[int] = None
    id_proveedor: Optional[int] = None
    precio_compra: Optional[float] = Field(None, ge=0)
    precio_venta: Optional[float] = Field(None, ge=0)
    stock_actual: Optional[int] = Field(None, ge=0)
    stock_minimo: Optional[int] = Field(None, ge=0)
    stock_maximo: Optional[int] = Field(None, ge=0)
    ubicacion: Optional[str] = Field(None, max_length=50)
    unidad_medida: Optional[str] = Field(None, max_length=20)
    activo: Optional[bool] = None

class ProductoResponse(ProductoBase):
    id_producto: int
    fecha_creacion: datetime
    categoria_nombre: Optional[str] = None
    proveedor_nombre: Optional[str] = None
    
    class Config:
        from_attributes = True

class ProductoAlertaResponse(BaseModel):
    id_producto: int
    codigo: str
    nombre: str
    categoria: Optional[str]
    stock_actual: int
    stock_minimo: int
    estado_stock: str
    cantidad_recomendada: int
    proveedor: Optional[str]

class ProductoListResponse(BaseModel):
    items: list[ProductoResponse]
    total: int

class AjusteStockRequest(BaseModel):
    cantidad: int = Field(..., description="Positivo para entrada, Negativo para salida")
    tipo_movimiento: int = Field(..., description="1=Venta, 2=Compra, 3=Ajuste+, 4=Ajuste-")
    motivo: str = Field(default="Ajuste manual", max_length=200)
    
    @validator('cantidad')
    def validar_cantidad(cls, v):
        if v == 0:
            raise ValueError("La cantidad no puede ser 0")
        return v
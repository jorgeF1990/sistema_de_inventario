# -*- coding: utf-8 -*-
"""
Modelos Pydantic para Ventas
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime

class DetalleVentaRequest(BaseModel):
    id_producto: int = Field(..., description="ID del producto")
    cantidad: int = Field(..., gt=0, description="Cantidad vendida")
    precio_unitario: float = Field(..., gt=0, description="Precio unitario de venta")

class VentaRequest(BaseModel):
    cliente_nombre: str = Field(default="CONSUMIDOR FINAL", max_length=100)
    detalles: List[DetalleVentaRequest] = Field(..., min_items=1)
    usuario: str = Field(default="admin", max_length=50)
    
    @validator('cliente_nombre')
    def validar_cliente(cls, v):
        if not v or not v.strip():
            return "CONSUMIDOR FINAL"
        return v.strip().upper()

class VentaResponse(BaseModel):
    id_venta: int
    numero_factura: str
    fecha_venta: datetime
    cliente_nombre: str
    subtotal: float
    iva: float
    total: float
    usuario: str
    cantidad_productos: Optional[int] = None
    
    class Config:
        from_attributes = True

class VentaDetalleResponse(BaseModel):
    id_detalle: int
    id_producto: int
    producto_nombre: str
    producto_codigo: str
    cantidad: int
    precio_unitario: float
    subtotal: float

class VentaCompletaResponse(VentaResponse):
    detalles: List[VentaDetalleResponse]
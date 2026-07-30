# -*- coding: utf-8 -*-
"""
Modelos Pydantic para Pedidos
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime

class DetallePedidoRequest(BaseModel):
    id_producto: int = Field(..., description="ID del producto")
    cantidad: int = Field(..., gt=0, description="Cantidad pedida")
    precio_unitario: Optional[float] = Field(None, gt=0, description="Precio unitario (opcional)")

class PedidoRequest(BaseModel):
    id_proveedor: int = Field(..., description="ID del proveedor")
    observaciones: Optional[str] = Field(None, max_length=500)
    usuario: str = Field(default="admin", max_length=50)
    detalles: List[DetallePedidoRequest] = Field(..., min_items=1)
    
    @validator('id_proveedor')
    def validar_proveedor(cls, v):
        if v <= 0:
            raise ValueError("ID de proveedor invalido")
        return v

class PedidoResponse(BaseModel):
    id_pedido: int
    numero_pedido: str
    id_proveedor: int
    proveedor_nombre: str
    fecha_pedido: datetime
    fecha_entrega_esperada: Optional[datetime]
    fecha_entrega_real: Optional[datetime]
    subtotal: float
    iva: float
    total: float
    id_estado: int
    observaciones: Optional[str]
    usuario: str
    cantidad_productos: Optional[int] = None
    
    class Config:
        from_attributes = True

class DetallePedidoResponse(BaseModel):
    id_detalle: int
    id_producto: int
    producto_nombre: str
    producto_codigo: str
    cantidad: int
    cantidad_recibida: Optional[int] = 0
    precio_unitario: float
    subtotal: float

class PedidoCompletoResponse(PedidoResponse):
    detalles: List[DetallePedidoResponse]
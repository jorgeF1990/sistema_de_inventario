# -*- coding: utf-8 -*-
"""
Modelos Pydantic para Reportes
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MovimientoResponse(BaseModel):
    id_movimiento: int
    id_producto: int
    producto_nombre: str
    producto_codigo: str
    cantidad: int
    stock_antes: int
    stock_despues: int
    tipo_movimiento_nombre: str
    fecha: datetime
    usuario: str
    observacion: Optional[str]

class ProductoVendidoResponse(BaseModel):
    id_producto: int
    codigo: str
    nombre: str
    total_vendido: int
    numero_ventas: int
    ingreso_total: float
    precio_promedio: float

class ResumenGeneralResponse(BaseModel):
    productos: dict
    ventas_hoy: dict
    pedidos_pendientes: int
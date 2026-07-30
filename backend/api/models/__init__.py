# -*- coding: utf-8 -*-
"""
Modelos Pydantic - Punto de entrada unificado
"""

from .producto import (
    ProductoBase, 
    ProductoCreate, 
    ProductoUpdate, 
    ProductoResponse, 
    ProductoAlertaResponse, 
    AjusteStockRequest
)
from .venta import (
    VentaRequest, 
    VentaResponse, 
    DetalleVentaRequest,
    VentaDetalleResponse,
    VentaCompletaResponse
)
from .pedido import (
    PedidoRequest, 
    PedidoResponse, 
    DetallePedidoRequest,
    DetallePedidoResponse,
    PedidoCompletoResponse
)
from .usuario import (
    UsuarioLogin, 
    UsuarioResponse, 
    Token,
    UsuarioCreate,
    UsuarioUpdate
)
from .reporte import (
    MovimientoResponse, 
    ProductoVendidoResponse,
    ResumenGeneralResponse
)

# ============================================
# EXPORTAR CLASES PARA COMPATIBILIDAD
# ============================================

# Estas son las clases que se usan en los controladores
# Los controladores importan directamente desde api.models
# Por lo tanto, deben estar disponibles aquí

# Clases de Producto
Producto = ProductoBase  # Para compatibilidad con controladores
Categoria = None  # Se usará desde el controlador
Proveedor = None  # Se usará desde el controlador

# Clases de Venta
Venta = VentaRequest  # Para compatibilidad con controladores
DetalleVenta = DetalleVentaRequest  # Para compatibilidad con controladores

# Clases de Pedido
Pedido = PedidoRequest  # Para compatibilidad con controladores
DetallePedido = DetallePedidoRequest  # Para compatibilidad con controladores

# Clases de Usuario
Usuario = UsuarioResponse  # Para compatibilidad con controladores

# ============================================
# EXPORTAR TODO
# ============================================

__all__ = [
    # Productos
    'ProductoBase', 'ProductoCreate', 'ProductoUpdate', 
    'ProductoResponse', 'ProductoAlertaResponse', 'AjusteStockRequest',
    'Producto',
    
    # Ventas
    'VentaRequest', 'VentaResponse', 'DetalleVentaRequest',
    'VentaDetalleResponse', 'VentaCompletaResponse',
    'Venta', 'DetalleVenta',
    
    # Pedidos
    'PedidoRequest', 'PedidoResponse', 'DetallePedidoRequest',
    'DetallePedidoResponse', 'PedidoCompletoResponse',
    'Pedido', 'DetallePedido',
    
    # Usuarios
    'UsuarioLogin', 'UsuarioResponse', 'Token',
    'UsuarioCreate', 'UsuarioUpdate',
    'Usuario',
    
    # Reportes
    'MovimientoResponse', 'ProductoVendidoResponse',
    'ResumenGeneralResponse',
]
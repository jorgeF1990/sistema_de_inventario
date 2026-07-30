# -*- coding: utf-8 -*-
"""
Tests para el Sistema de Control de Stock
"""

# Importar tests para que pytest los descubra
from . import test_productos
from . import test_ventas
from . import test_pedidos

__all__ = [
    'test_productos',
    'test_ventas',
    'test_pedidos'
]
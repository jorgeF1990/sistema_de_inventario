# -*- coding: utf-8 -*-
"""
Funciones auxiliares
"""

import re
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

def formatear_precio(valor: float, decimales: int = 2) -> str:
    """Formatea un precio en pesos argentinos"""
    try:
        if decimales == 0:
            return f"${valor:,.0f}".replace(",", ".")
        else:
            return f"${valor:,.{decimales}f}".replace(",", ".")
    except (ValueError, TypeError):
        return "$0.00"

def formatear_fecha(fecha, formato: str = "%d/%m/%Y") -> str:
    """Formatea una fecha"""
    if isinstance(fecha, str):
        try:
            fecha = datetime.strptime(fecha, '%Y-%m-%d').date()
        except:
            try:
                fecha = datetime.strptime(fecha, '%Y-%m-%d %H:%M:%S').date()
            except:
                return fecha
    return fecha.strftime(formato) if hasattr(fecha, 'strftime') else str(fecha)

def generar_numero_factura() -> str:
    """Genera un numero de factura unico"""
    return f"F{datetime.now().strftime('%Y%m%d%H%M%S')}"

def redondear_decimal(valor: float, decimales: int = 2) -> float:
    """Redondea un valor decimal"""
    if not isinstance(valor, Decimal):
        valor = Decimal(str(valor))
    return float(valor.quantize(Decimal('0.' + '0' * decimales), rounding=ROUND_HALF_UP))
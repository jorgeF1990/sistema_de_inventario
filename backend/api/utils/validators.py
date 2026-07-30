# -*- coding: utf-8 -*-
"""
Validadores para datos de entrada
"""

import re
from typing import Optional

def validar_codigo(codigo: str) -> bool:
    """Valida el formato del codigo de producto"""
    if not codigo:
        return False
    patron = r'^[A-Z0-9\-]{3,20}$'
    return bool(re.match(patron, codigo.upper()))

def validar_email(email: str) -> bool:
    """Valida formato de email"""
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(patron, email))

def validar_ruc(ruc: str) -> bool:
    """Valida formato de RUC/CUIT"""
    if not ruc:
        return True
    patron = r'^\d{2}-\d{8}-\d$|^\d{11}$'
    return bool(re.match(patron, ruc))

def validar_precio(precio: float) -> bool:
    """Valida que el precio sea valido"""
    return precio >= 0

def validar_cantidad(cantidad: int) -> bool:
    """Valida que la cantidad sea valida"""
    return cantidad >= 0

def sanitizar_texto(texto: str) -> str:
    """Sanitiza texto para evitar inyecciones"""
    if not texto:
        return ""
    # Eliminar caracteres especiales peligrosos
    caracteres_prohibidos = [';', '"', "'", '--', '/*', '*/']
    for char in caracteres_prohibidos:
        texto = texto.replace(char, '')
    return texto.strip()
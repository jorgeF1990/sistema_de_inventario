#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Prueba de verificacion de contraseña"""

import bcrypt
from api.database.connection import execute_query

# Obtener la contraseña hasheada de la base de datos
query = "SELECT id_usuario, nombre_usuario, contrasena FROM usuarios WHERE nombre_usuario = 'admin'"
result = execute_query(query)

if result:
    user = result[0]
    hashed = user['contrasena']
    print(f"Usuario: {user['nombre_usuario']}")
    print(f"Hash almacenado: {hashed}")
    print(f"Tipo: {type(hashed)}")
    print(f"Longitud: {len(hashed)}")
    
    # Probar verificación
    password = "admin123"
    try:
        is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        print(f"\nVerificacion con bcrypt: {is_valid}")
    except Exception as e:
        print(f"Error en verificacion: {e}")
else:
    print("Usuario admin no encontrado")

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generar un hash bcrypt correcto"""

import bcrypt

password = "admin123"

# Generar nuevo hash
salt = bcrypt.gensalt(rounds=10)
new_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

print(f"Password: {password}")
print(f"Nuevo hash: {new_hash}")
print(f"Longitud: {len(new_hash)}")

# Verificar que funciona
is_valid = bcrypt.checkpw(password.encode('utf-8'), new_hash.encode('utf-8'))
print(f"Verificacion: {is_valid}")

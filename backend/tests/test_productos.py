# -*- coding: utf-8 -*-
"""
Tests para el modulo de productos
"""

import pytest
from fastapi.testclient import TestClient
from api.index import app

client = TestClient(app)

def test_get_productos():
    """Test para obtener productos"""
    response = client.get("/productos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_producto_not_found():
    """Test para producto no encontrado"""
    response = client.get("/productos/99999")
    assert response.status_code == 404

def test_crear_producto():
    """Test para crear producto"""
    producto_data = {
        "codigo": "TEST001",
        "nombre": "Producto de Test",
        "descripcion": "Descripcion de test",
        "precio_compra": 100.00,
        "precio_venta": 150.00,
        "stock_actual": 10,
        "stock_minimo": 5
    }
    
    response = client.post("/productos", json=producto_data)
    assert response.status_code in [200, 201]
    
    # Limpiar
    if response.status_code == 201:
        producto_id = response.json()['id_producto']
        client.delete(f"/productos/{producto_id}")
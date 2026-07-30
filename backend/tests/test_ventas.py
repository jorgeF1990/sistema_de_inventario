# -*- coding: utf-8 -*-
"""
Tests para el modulo de Ventas
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import json

from api.index import app

client = TestClient(app)

# ============================================================
# FIXTURES
# ============================================================

@pytest.fixture
def producto_test():
    """Crea un producto de prueba para usar en ventas"""
    producto_data = {
        "codigo": "TESTVENTA001",
        "nombre": "Producto para Venta",
        "descripcion": "Producto de prueba para ventas",
        "precio_compra": 100.00,
        "precio_venta": 150.00,
        "stock_actual": 20,
        "stock_minimo": 5
    }
    
    response = client.post("/productos", json=producto_data)
    assert response.status_code in [200, 201]
    return response.json()

@pytest.fixture
def venta_data(producto_test):
    """Datos de venta de prueba"""
    return {
        "cliente_nombre": "Cliente Test",
        "usuario": "admin",
        "detalles": [
            {
                "id_producto": producto_test['id_producto'],
                "cantidad": 2,
                "precio_unitario": 150.00
            }
        ]
    }

# ============================================================
# TESTS DE VENTAS
# ============================================================

class TestVentas:
    """Tests para el modulo de ventas"""
    
    def test_registrar_venta(self, venta_data):
        """Test para registrar una venta"""
        response = client.post("/ventas", json=venta_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data['id_venta'] is not None
        assert data['numero_factura'] is not None
        assert data['cliente_nombre'] == "Cliente Test"
        assert data['subtotal'] > 0
        assert data['iva'] >= 0
        assert data['total'] > 0
        assert data['usuario'] == "admin"
    
    def test_registrar_venta_sin_detalles(self):
        """Test para venta sin detalles (debe fallar)"""
        venta_invalida = {
            "cliente_nombre": "Cliente Test",
            "usuario": "admin",
            "detalles": []
        }
        
        response = client.post("/ventas", json=venta_invalida)
        assert response.status_code == 400
        assert "vacio" in response.json()['detail'].lower()
    
    def test_registrar_venta_con_stock_insuficiente(self, producto_test):
        """Test para venta con stock insuficiente"""
        venta_sin_stock = {
            "cliente_nombre": "Cliente Test",
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_test['id_producto'],
                    "cantidad": 999,
                    "precio_unitario": 150.00
                }
            ]
        }
        
        response = client.post("/ventas", json=venta_sin_stock)
        assert response.status_code == 400
        assert "stock insuficiente" in response.json()['detail'].lower()
    
    def test_registrar_venta_producto_inexistente(self):
        """Test para venta con producto inexistente"""
        venta_producto_inexistente = {
            "cliente_nombre": "Cliente Test",
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": 99999,
                    "cantidad": 1,
                    "precio_unitario": 100.00
                }
            ]
        }
        
        response = client.post("/ventas", json=venta_producto_inexistente)
        assert response.status_code == 400
        assert "no encontrado" in response.json()['detail'].lower()
    
    def test_get_ventas_hoy(self):
        """Test para obtener ventas del dia"""
        response = client.get("/ventas/hoy")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_resumen_dia(self):
        """Test para obtener resumen del dia"""
        response = client.get("/ventas/resumen-dia")
        assert response.status_code == 200
        
        data = response.json()
        assert 'total_ventas' in data
        assert 'monto_total' in data
        assert 'promedio_venta' in data
        assert 'venta_maxima' in data
        assert 'venta_minima' in data
        
        assert isinstance(data['total_ventas'], (int, float))
        assert isinstance(data['monto_total'], (int, float))
    
    def test_get_ventas_periodo(self):
        """Test para obtener ventas por periodo"""
        # Probar diferentes periodos
        for dias in [7, 15, 30, 90]:
            response = client.get(f"/ventas/periodo?dias={dias}")
            assert response.status_code == 200
            assert isinstance(response.json(), list)
            
            # Si hay datos, verificar estructura
            if response.json():
                item = response.json()[0]
                assert 'fecha' in item
                assert 'cantidad_ventas' in item
                assert 'total' in item
                assert 'promedio' in item
    
    def test_get_venta_especifica(self, venta_data):
        """Test para obtener una venta especifica"""
        # Crear una venta primero
        response_create = client.post("/ventas", json=venta_data)
        assert response_create.status_code == 201
        venta_id = response_create.json()['id_venta']
        
        # Obtener la venta
        response = client.get(f"/ventas/{venta_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['id_venta'] == venta_id
        assert 'detalles' in data
        assert len(data['detalles']) > 0
        
        # Verificar que los detalles tengan la informacion correcta
        detalle = data['detalles'][0]
        assert 'producto_nombre' in detalle
        assert 'producto_codigo' in detalle
        assert detalle['cantidad'] > 0
    
    def test_get_venta_inexistente(self):
        """Test para obtener una venta inexistente"""
        response = client.get("/ventas/99999")
        assert response.status_code == 404
        assert "no encontrada" in response.json()['detail'].lower()
    
    def test_venta_actualiza_stock_correctamente(self, producto_test):
        """Test para verificar que la venta actualiza el stock correctamente"""
        # Obtener stock inicial
        response_producto = client.get(f"/productos/{producto_test['id_producto']}")
        assert response_producto.status_code == 200
        stock_inicial = response_producto.json()['stock_actual']
        
        # Realizar venta de 3 unidades
        venta_data = {
            "cliente_nombre": "Cliente Test",
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_test['id_producto'],
                    "cantidad": 3,
                    "precio_unitario": 150.00
                }
            ]
        }
        
        response_venta = client.post("/ventas", json=venta_data)
        assert response_venta.status_code == 201
        
        # Verificar stock actualizado
        response_producto_after = client.get(f"/productos/{producto_test['id_producto']}")
        assert response_producto_after.status_code == 200
        stock_final = response_producto_after.json()['stock_actual']
        
        assert stock_final == stock_inicial - 3
    
    def test_venta_con_cliente_por_defecto(self):
        """Test para venta con cliente por defecto"""
        # Crear producto de prueba
        producto_data = {
            "codigo": "TESTCLIENTE001",
            "nombre": "Producto Cliente Default",
            "precio_compra": 100.00,
            "precio_venta": 150.00,
            "stock_actual": 10,
            "stock_minimo": 5
        }
        response_prod = client.post("/productos", json=producto_data)
        assert response_prod.status_code in [200, 201]
        producto = response_prod.json()
        
        # Venta sin cliente
        venta_data = {
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto['id_producto'],
                    "cantidad": 1,
                    "precio_unitario": 150.00
                }
            ]
        }
        
        response = client.post("/ventas", json=venta_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data['cliente_nombre'] == "CONSUMIDOR FINAL"
    
    def test_venta_multiples_productos(self):
        """Test para venta con multiples productos"""
        # Crear dos productos de prueba
        productos = []
        for i in range(2):
            prod_data = {
                "codigo": f"TESTMULTI00{i+1}",
                "nombre": f"Producto Multi {i+1}",
                "precio_compra": 50.00 + (i * 50),
                "precio_venta": 80.00 + (i * 50),
                "stock_actual": 10,
                "stock_minimo": 3
            }
            response = client.post("/productos", json=prod_data)
            assert response.status_code in [200, 201]
            productos.append(response.json())
        
        # Venta con ambos productos
        venta_data = {
            "cliente_nombre": "Cliente Multi Productos",
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": productos[0]['id_producto'],
                    "cantidad": 2,
                    "precio_unitario": 80.00
                },
                {
                    "id_producto": productos[1]['id_producto'],
                    "cantidad": 3,
                    "precio_unitario": 130.00
                }
            ]
        }
        
        response = client.post("/ventas", json=venta_data)
        assert response.status_code == 201
        
        data = response.json()
        subtotal_esperado = (2 * 80.00) + (3 * 130.00)
        assert data['subtotal'] == subtotal_esperado
        assert data['iva'] == subtotal_esperado * 0.21
        assert data['total'] == subtotal_esperado * 1.21
    
    def test_venta_cantidad_cero(self, producto_test):
        """Test para venta con cantidad 0 (debe fallar)"""
        venta_invalida = {
            "cliente_nombre": "Cliente Test",
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_test['id_producto'],
                    "cantidad": 0,
                    "precio_unitario": 150.00
                }
            ]
        }
        
        response = client.post("/ventas", json=venta_invalida)
        assert response.status_code == 400
        assert "mayores a 0" in response.json()['detail'].lower()
    
    def test_venta_precio_negativo(self, producto_test):
        """Test para venta con precio negativo (debe fallar)"""
        venta_invalida = {
            "cliente_nombre": "Cliente Test",
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_test['id_producto'],
                    "cantidad": 1,
                    "precio_unitario": -50.00
                }
            ]
        }
        
        response = client.post("/ventas", json=venta_invalida)
        assert response.status_code == 400
        assert "mayores a 0" in response.json()['detail'].lower()
    
    def test_venta_con_movimiento_registrado(self, producto_test):
        """Test para verificar que la venta registra movimiento de stock"""
        # Obtener cantidad de movimientos antes
        response_movimientos = client.get(f"/reportes/movimientos?id_producto={producto_test['id_producto']}")
        assert response_movimientos.status_code == 200
        movimientos_antes = len(response_movimientos.json())
        
        # Realizar venta
        venta_data = {
            "cliente_nombre": "Cliente Test",
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_test['id_producto'],
                    "cantidad": 1,
                    "precio_unitario": 150.00
                }
            ]
        }
        
        response_venta = client.post("/ventas", json=venta_data)
        assert response_venta.status_code == 201
        
        # Verificar que se creo un nuevo movimiento
        response_movimientos_after = client.get(f"/reportes/movimientos?id_producto={producto_test['id_producto']}")
        assert response_movimientos_after.status_code == 200
        movimientos_despues = len(response_movimientos_after.json())
        
        assert movimientos_despues > movimientos_antes
        
        # Verificar que el ultimo movimiento es una salida por venta
        if movimientos_despues > 0:
            ultimo_mov = response_movimientos_after.json()[0]
            assert 'cantidad' in ultimo_mov
            assert ultimo_mov['cantidad'] < 0  # Es una salida
            assert 'venta' in ultimo_mov.get('referencia_tipo', '').lower()

# ============================================================
# TESTS DE LIMPIEZA (Cleanup)
# ============================================================

@pytest.fixture(autouse=True)
def cleanup_tests():
    """Limpia productos de prueba despues de cada test"""
    yield
    # Eliminar productos de prueba
    try:
        response = client.get("/productos")
        if response.status_code == 200:
            for producto in response.json():
                if 'TEST' in producto.get('codigo', ''):
                    client.delete(f"/productos/{producto['id_producto']}")
    except:
        pass
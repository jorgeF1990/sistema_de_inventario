# -*- coding: utf-8 -*-
"""
Tests para el modulo de Pedidos
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
def proveedor_test():
    """Crea un proveedor de prueba"""
    proveedor_data = {
        "nombre": "Proveedor Test",
        "ruc": "30-12345678-9",
        "telefono": "011-1234-5678",
        "email": "proveedor@test.com"
    }
    
    # Crear proveedor via API
    response = client.post("/proveedores", json=proveedor_data)
    if response.status_code == 404:  # Si no existe el endpoint
        # Crear directamente en BD via query
        from api.database.connection import get_db
        with get_db() as (conn, cursor):
            cursor.execute("""
                INSERT INTO proveedores (nombre, ruc, telefono, email) 
                VALUES (%s, %s, %s, %s)
            """, (proveedor_data['nombre'], proveedor_data['ruc'], 
                  proveedor_data['telefono'], proveedor_data['email']))
            conn.commit()
            id_proveedor = cursor.lastrowid
            return {"id_proveedor": id_proveedor, **proveedor_data}
    
    return response.json() if response.status_code in [200, 201] else {"id_proveedor": 1}

@pytest.fixture
def producto_pedido_test():
    """Crea un producto de prueba para pedidos"""
    producto_data = {
        "codigo": "TESTPEDIDO001",
        "nombre": "Producto para Pedido",
        "descripcion": "Producto de prueba para pedidos",
        "precio_compra": 100.00,
        "precio_venta": 150.00,
        "stock_actual": 2,
        "stock_minimo": 10
    }
    
    response = client.post("/productos", json=producto_data)
    assert response.status_code in [200, 201]
    return response.json()

# ============================================================
# TESTS DE PEDIDOS
# ============================================================

class TestPedidos:
    """Tests para el modulo de pedidos"""
    
    def test_generar_pedido_automatico(self):
        """Test para generar pedido automatico"""
        response = client.post("/pedidos/automatico")
        assert response.status_code == 200
        
        data = response.json()
        assert 'message' in data
        assert 'pedidos' in data
        assert isinstance(data['pedidos'], list)
    
    def test_get_pedidos_pendientes(self):
        """Test para obtener pedidos pendientes"""
        response = client.get("/pedidos/pendientes")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
        # Si hay pedidos, verificar estructura
        if response.json():
            pedido = response.json()[0]
            assert 'id_pedido' in pedido
            assert 'numero_pedido' in pedido
            assert 'proveedor_nombre' in pedido
            assert 'id_estado' in pedido
    
    def test_get_historial_pedidos(self):
        """Test para obtener historial de pedidos"""
        response = client.get("/pedidos/historial")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
        # Probar con limite
        response_limit = client.get("/pedidos/historial?limit=5")
        assert response_limit.status_code == 200
        assert len(response_limit.json()) <= 5
    
    def test_crear_pedido_manual(self, proveedor_test, producto_pedido_test):
        """Test para crear un pedido manual"""
        pedido_data = {
            "id_proveedor": proveedor_test['id_proveedor'],
            "usuario": "admin",
            "observaciones": "Pedido de prueba",
            "detalles": [
                {
                    "id_producto": producto_pedido_test['id_producto'],
                    "cantidad": 5,
                    "precio_unitario": 100.00
                }
            ]
        }
        
        response = client.post("/pedidos", json=pedido_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data['id_pedido'] is not None
        assert data['numero_pedido'] is not None
        assert data['id_proveedor'] == proveedor_test['id_proveedor']
        assert data['subtotal'] > 0
        assert data['total'] > 0
        assert data['id_estado'] == 1  # Pendiente
    
    def test_crear_pedido_sin_detalles(self, proveedor_test):
        """Test para crear pedido sin detalles (debe fallar)"""
        pedido_data = {
            "id_proveedor": proveedor_test['id_proveedor'],
            "usuario": "admin",
            "detalles": []
        }
        
        response = client.post("/pedidos", json=pedido_data)
        assert response.status_code == 400
        assert "producto" in response.json()['detail'].lower()
    
    def test_crear_pedido_proveedor_inexistente(self):
        """Test para crear pedido con proveedor inexistente"""
        pedido_data = {
            "id_proveedor": 99999,
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": 1,
                    "cantidad": 5,
                    "precio_unitario": 100.00
                }
            ]
        }
        
        response = client.post("/pedidos", json=pedido_data)
        assert response.status_code == 400
        assert "proveedor" in response.json()['detail'].lower()
    
    def test_get_detalles_pedido(self, proveedor_test, producto_pedido_test):
        """Test para obtener detalles de un pedido"""
        # Crear pedido primero
        pedido_data = {
            "id_proveedor": proveedor_test['id_proveedor'],
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_pedido_test['id_producto'],
                    "cantidad": 3,
                    "precio_unitario": 100.00
                }
            ]
        }
        
        response_create = client.post("/pedidos", json=pedido_data)
        assert response_create.status_code == 201
        id_pedido = response_create.json()['id_pedido']
        
        # Obtener detalles
        response = client.get(f"/pedidos/{id_pedido}/detalles")
        assert response.status_code == 200
        
        detalles = response.json()
        assert isinstance(detalles, list)
        assert len(detalles) > 0
        
        detalle = detalles[0]
        assert 'id_producto' in detalle
        assert 'producto_nombre' in detalle
        assert 'producto_codigo' in detalle
        assert detalle['cantidad'] == 3
        assert detalle['precio_unitario'] == 100.00
    
    def test_cambiar_estado_pedido(self, proveedor_test, producto_pedido_test):
        """Test para cambiar el estado de un pedido"""
        # Crear pedido
        pedido_data = {
            "id_proveedor": proveedor_test['id_proveedor'],
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_pedido_test['id_producto'],
                    "cantidad": 2,
                    "precio_unitario": 100.00
                }
            ]
        }
        
        response_create = client.post("/pedidos", json=pedido_data)
        assert response_create.status_code == 201
        id_pedido = response_create.json()['id_pedido']
        
        # Cambiar a estado 2 (Enviado)
        response = client.put(f"/pedidos/{id_pedido}/estado?estado=2")
        assert response.status_code == 200
        assert "actualizado" in response.json()['message'].lower()
        
        # Cambiar a estado 3 (Recibido)
        response = client.put(f"/pedidos/{id_pedido}/estado?estado=3")
        assert response.status_code == 200
    
    def test_pedido_automatico_calcula_totales(self):
        """Test para verificar que el pedido automatico calcula totales correctamente"""
        response = client.post("/pedidos/automatico")
        assert response.status_code == 200
        
        # Obtener pedidos pendientes
        response_pendientes = client.get("/pedidos/pendientes")
        assert response_pendientes.status_code == 200
        
        for pedido in response_pendientes.json():
            # Verificar que los totales son consistentes
            if 'subtotal' in pedido and 'iva' in pedido and 'total' in pedido:
                subtotal = pedido['subtotal']
                iva = pedido['iva']
                total = pedido['total']
                
                # El total debe ser subtotal + iva
                assert abs(total - (subtotal + iva)) < 0.01
                # El IVA debe ser 21% del subtotal
                assert abs(iva - (subtotal * 0.21)) < 0.01
    
    def test_pedido_con_multiples_productos(self, proveedor_test):
        """Test para pedido con multiples productos"""
        # Crear varios productos
        productos = []
        for i in range(3):
            prod_data = {
                "codigo": f"TESTPEDMULTI00{i+1}",
                "nombre": f"Producto Multi Pedido {i+1}",
                "precio_compra": 50.00 + (i * 30),
                "precio_venta": 80.00 + (i * 30),
                "stock_actual": 5,
                "stock_minimo": 8
            }
            response = client.post("/productos", json=prod_data)
            assert response.status_code in [200, 201]
            productos.append(response.json())
        
        # Crear pedido con todos los productos
        detalles = []
        subtotal_esperado = 0
        for i, prod in enumerate(productos):
            cantidad = i + 2
            precio = 50.00 + (i * 30)
            detalles.append({
                "id_producto": prod['id_producto'],
                "cantidad": cantidad,
                "precio_unitario": precio
            })
            subtotal_esperado += cantidad * precio
        
        pedido_data = {
            "id_proveedor": proveedor_test['id_proveedor'],
            "usuario": "admin",
            "observaciones": "Pedido con multiples productos",
            "detalles": detalles
        }
        
        response = client.post("/pedidos", json=pedido_data)
        assert response.status_code == 201
        
        data = response.json()
        assert abs(data['subtotal'] - subtotal_esperado) < 0.01
        assert abs(data['iva'] - (subtotal_esperado * 0.21)) < 0.01
        assert abs(data['total'] - (subtotal_esperado * 1.21)) < 0.01
    
    def test_pedido_cantidad_cero(self, proveedor_test, producto_pedido_test):
        """Test para pedido con cantidad 0 (debe fallar)"""
        pedido_data = {
            "id_proveedor": proveedor_test['id_proveedor'],
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_pedido_test['id_producto'],
                    "cantidad": 0,
                    "precio_unitario": 100.00
                }
            ]
        }
        
        response = client.post("/pedidos", json=pedido_data)
        assert response.status_code == 400
        assert "mayor" in response.json()['detail'].lower()
    
    def test_pedido_historial_con_filtros(self):
        """Test para historial de pedidos con filtros"""
        # Probar con filtro de estado
        for estado in [1, 2, 3, 4]:
            response = client.get(f"/pedidos/historial?estado={estado}")
            assert response.status_code == 200
            assert isinstance(response.json(), list)
            
            # Verificar que todos tienen el estado correcto
            for pedido in response.json():
                if 'id_estado' in pedido:
                    assert pedido['id_estado'] == estado

# ============================================================
# TESTS DE INTEGRACION
# ============================================================

class TestPedidosIntegracion:
    """Tests de integracion para pedidos"""
    
    def test_pedido_y_movimiento_stock(self, proveedor_test, producto_pedido_test):
        """Test para verificar que un pedido crea movimientos de stock cuando se recibe"""
        # Crear pedido
        pedido_data = {
            "id_proveedor": proveedor_test['id_proveedor'],
            "usuario": "admin",
            "detalles": [
                {
                    "id_producto": producto_pedido_test['id_producto'],
                    "cantidad": 5,
                    "precio_unitario": 100.00
                }
            ]
        }
        
        response_create = client.post("/pedidos", json=pedido_data)
        assert response_create.status_code == 201
        id_pedido = response_create.json()['id_pedido']
        
        # Obtener stock antes de recibir
        response_producto = client.get(f"/productos/{producto_pedido_test['id_producto']}")
        assert response_producto.status_code == 200
        stock_antes = response_producto.json()['stock_actual']
        
        # Cambiar estado a Recibido (3)
        response_estado = client.put(f"/pedidos/{id_pedido}/estado?estado=3")
        assert response_estado.status_code == 200
        
        # Verificar movimientos de stock
        response_movimientos = client.get(f"/reportes/movimientos?id_producto={producto_pedido_test['id_producto']}")
        assert response_movimientos.status_code == 200
        
        movimientos = response_movimientos.json()
        if movimientos:
            # Buscar movimiento de recepcion
            movimiento_recepcion = None
            for m in movimientos:
                if m.get('referencia_tipo') == 'pedido' and m.get('referencia_id') == id_pedido:
                    movimiento_recepcion = m
                    break
            
            if movimiento_recepcion:
                assert movimiento_recepcion['cantidad'] > 0  # Es una entrada

# ============================================================
# LIMPIEZA
# ============================================================

@pytest.fixture(autouse=True)
def cleanup_pedidos_tests():
    """Limpia datos de prueba despues de cada test"""
    yield
    # Limpiar productos de prueba
    try:
        response = client.get("/productos")
        if response.status_code == 200:
            for producto in response.json():
                if 'TEST' in producto.get('codigo', ''):
                    client.delete(f"/productos/{producto['id_producto']}")
    except:
        pass
    
    # Limpiar pedidos de prueba
    try:
        response = client.get("/pedidos/historial?limit=100")
        if response.status_code == 200:
            for pedido in response.json():
                if 'AUTO' in pedido.get('numero_pedido', '') or 'MAN' in pedido.get('numero_pedido', ''):
                    # Cambiar a estado Cancelado (4) en lugar de eliminar
                    client.put(f"/pedidos/{pedido['id_pedido']}/estado?estado=4")
    except:
        pass
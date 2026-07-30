#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de migracion de base de datos
Soporte para Railway, Vercel y entorno local
"""

import os
import sys
import mysql.connector
from dotenv import load_dotenv
from pathlib import Path

# Agregar backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

def get_db_config():
    """Obtiene configuracion segun entorno"""
    is_railway = os.getenv('RAILWAY_ENVIRONMENT') is not None
    is_vercel = os.getenv('VERCEL') is not None
    
    if is_railway:
        return {
            'host': os.getenv('DB_HOST', 'mysql.railway.internal'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_NAME', 'railway'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
    elif is_vercel:
        return {
            'host': os.getenv('DB_HOST', 'reseau.proxy.rlwy.net'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_NAME', 'railway'),
            'port': int(os.getenv('DB_PORT', 23144))
        }
    else:
        return {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'control_stock'),
            'port': int(os.getenv('DB_PORT', 3306))
        }

def migrate():
    """Ejecuta la migracion completa"""
    print("=" * 70)
    print("SISTEMA DE CONTROL DE STOCK - MIGRACION DE BASE DE DATOS")
    print("=" * 70)
    
    try:
        config = get_db_config()
        db_name = config.pop('database')
        
        print(f"Conectando a: {config['host']}:{config['port']}")
        print(f"Base de datos: {db_name}")
        print("-" * 70)
        
        # Conectar sin base de datos especifica
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Crear base de datos si no existe
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE {db_name}")
        print(f"Base de datos '{db_name}' seleccionada")
        
        # ============================================
        # CREAR TABLAS EN ORDEN CORRECTO
        # ============================================
        
        print("\nCreando tablas...")
        
        # 1. Empresas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS empresas (
            id_empresa INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            ruc VARCHAR(20),
            telefono VARCHAR(20),
            email VARCHAR(100),
            direccion TEXT,
            moneda VARCHAR(10) DEFAULT 'ARS',
            iva DECIMAL(5,2) DEFAULT 21.00,
            stock_minimo_default INT DEFAULT 5,
            activo BOOLEAN DEFAULT TRUE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        print("  - Tabla empresas creada")
        
        # 2. Categorias
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS categorias (
            id_categoria INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(50) NOT NULL,
            descripcion TEXT,
            activo BOOLEAN DEFAULT TRUE,
            id_empresa INT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_categoria_empresa (nombre, id_empresa),
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
        )
        """)
        print("  - Tabla categorias creada")
        
        # 3. Proveedores
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS proveedores (
            id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            ruc VARCHAR(20),
            telefono VARCHAR(20),
            email VARCHAR(100),
            direccion TEXT,
            contacto_nombre VARCHAR(100),
            contacto_telefono VARCHAR(20),
            activo BOOLEAN DEFAULT TRUE,
            id_empresa INT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
        )
        """)
        print("  - Tabla proveedores creada")
        
        # 4. Productos
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS productos (
            id_producto INT AUTO_INCREMENT PRIMARY KEY,
            codigo VARCHAR(50) NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            id_categoria INT,
            id_proveedor INT,
            precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            stock_actual INT NOT NULL DEFAULT 0,
            stock_minimo INT NOT NULL DEFAULT 5,
            stock_maximo INT DEFAULT NULL,
            ubicacion VARCHAR(50),
            unidad_medida VARCHAR(20) DEFAULT 'unidad',
            activo BOOLEAN DEFAULT TRUE,
            id_empresa INT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_producto_empresa (codigo, id_empresa),
            FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
            FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
            INDEX idx_codigo (codigo),
            INDEX idx_nombre (nombre),
            INDEX idx_stock (stock_actual, stock_minimo)
        )
        """)
        print("  - Tabla productos creada")
        
        # 5. Tipos de Movimiento
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tipos_movimiento (
            id_tipo_movimiento INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(30) NOT NULL UNIQUE,
            signo INT NOT NULL COMMENT '1=entrada, -1=salida',
            descripcion VARCHAR(100)
        )
        """)
        print("  - Tabla tipos_movimiento creada")
        
        # 6. Movimientos Stock
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimientos_stock (
            id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
            id_producto INT NOT NULL,
            id_tipo_movimiento INT NOT NULL,
            cantidad INT NOT NULL,
            stock_antes INT NOT NULL,
            stock_despues INT NOT NULL,
            referencia_tipo VARCHAR(50),
            referencia_id INT,
            observacion TEXT,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            usuario VARCHAR(50),
            id_empresa INT,
            FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
            FOREIGN KEY (id_tipo_movimiento) REFERENCES tipos_movimiento(id_tipo_movimiento),
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
            INDEX idx_producto (id_producto),
            INDEX idx_fecha (fecha)
        )
        """)
        print("  - Tabla movimientos_stock creada")
        
        # 7. Estados Venta
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS estados_venta (
            id_estado INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(30) NOT NULL UNIQUE
        )
        """)
        print("  - Tabla estados_venta creada")
        
        # 8. Clientes
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS clientes (
            id_cliente INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            ruc VARCHAR(20),
            telefono VARCHAR(20),
            email VARCHAR(100),
            direccion TEXT,
            tipo VARCHAR(50) DEFAULT 'CONSUMIDOR FINAL',
            activo BOOLEAN DEFAULT TRUE,
            id_empresa INT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
        )
        """)
        print("  - Tabla clientes creada")
        
        # 9. Ventas
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ventas (
            id_venta INT AUTO_INCREMENT PRIMARY KEY,
            numero_factura VARCHAR(20) UNIQUE,
            fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            id_cliente INT,
            cliente_nombre VARCHAR(100),
            subtotal DECIMAL(10,2) DEFAULT 0.00,
            iva DECIMAL(10,2) DEFAULT 0.00,
            total DECIMAL(10,2) DEFAULT 0.00,
            id_estado INT DEFAULT 1,
            observaciones TEXT,
            usuario VARCHAR(50),
            id_empresa INT,
            FOREIGN KEY (id_estado) REFERENCES estados_venta(id_estado),
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
            FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
            INDEX idx_fecha (fecha_venta),
            INDEX idx_numero (numero_factura)
        )
        """)
        print("  - Tabla ventas creada")
        
        # 10. Detalles Venta
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS detalles_venta (
            id_detalle INT AUTO_INCREMENT PRIMARY KEY,
            id_venta INT NOT NULL,
            id_producto INT NOT NULL,
            cantidad INT NOT NULL,
            precio_unitario DECIMAL(10,2) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
            FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
            INDEX idx_venta (id_venta),
            INDEX idx_producto (id_producto)
        )
        """)
        print("  - Tabla detalles_venta creada")
        
        # 11. Estados Pedido
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS estados_pedido (
            id_estado INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(30) NOT NULL UNIQUE
        )
        """)
        print("  - Tabla estados_pedido creada")
        
        # 12. Pedidos
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pedidos (
            id_pedido INT AUTO_INCREMENT PRIMARY KEY,
            numero_pedido VARCHAR(20) UNIQUE,
            id_proveedor INT NOT NULL,
            fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_entrega_esperada DATE,
            fecha_entrega_real DATE,
            subtotal DECIMAL(10,2) DEFAULT 0.00,
            iva DECIMAL(10,2) DEFAULT 0.00,
            total DECIMAL(10,2) DEFAULT 0.00,
            id_estado INT DEFAULT 1,
            observaciones TEXT,
            usuario VARCHAR(50),
            id_empresa INT,
            FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
            FOREIGN KEY (id_estado) REFERENCES estados_pedido(id_estado),
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
            INDEX idx_fecha (fecha_pedido)
        )
        """)
        print("  - Tabla pedidos creada")
        
        # 13. Detalles Pedido
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS detalles_pedido (
            id_detalle INT AUTO_INCREMENT PRIMARY KEY,
            id_pedido INT NOT NULL,
            id_producto INT NOT NULL,
            cantidad INT NOT NULL,
            cantidad_recibida INT DEFAULT 0,
            precio_unitario DECIMAL(10,2) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
            FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
        )
        """)
        print("  - Tabla detalles_pedido creada")
        
        # 14. Roles
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS roles (
            id_rol INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(30) NOT NULL UNIQUE,
            descripcion VARCHAR(100)
        )
        """)
        print("  - Tabla roles creada")
        
        # 15. Usuarios
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INT AUTO_INCREMENT PRIMARY KEY,
            nombre_usuario VARCHAR(50) NOT NULL,
            contrasena VARCHAR(255) NOT NULL,
            nombre_completo VARCHAR(100),
            email VARCHAR(100),
            id_rol INT NOT NULL,
            id_empresa INT,
            activo BOOLEAN DEFAULT TRUE,
            ultimo_acceso TIMESTAMP NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_usuario_empresa (nombre_usuario, id_empresa),
            FOREIGN KEY (id_rol) REFERENCES roles(id_rol),
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
        )
        """)
        print("  - Tabla usuarios creada")
        
        # 16. Password Resets
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id_reset INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            expiracion TIMESTAMP NOT NULL,
            usado BOOLEAN DEFAULT FALSE,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        )
        """)
        print("  - Tabla password_resets creada")
        
        # 17. Conteos Inventario
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conteos_inventario (
            id_conteo INT AUTO_INCREMENT PRIMARY KEY,
            fecha_conteo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            descripcion VARCHAR(200),
            usuario VARCHAR(50),
            cerrado BOOLEAN DEFAULT FALSE,
            id_empresa INT,
            FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
        )
        """)
        print("  - Tabla conteos_inventario creada")
        
        # 18. Detalles Conteo
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS detalles_conteo (
            id_detalle INT AUTO_INCREMENT PRIMARY KEY,
            id_conteo INT NOT NULL,
            id_producto INT NOT NULL,
            cantidad_sistema INT NOT NULL,
            cantidad_fisica INT NOT NULL,
            diferencia INT NOT NULL,
            observacion TEXT,
            FOREIGN KEY (id_conteo) REFERENCES conteos_inventario(id_conteo) ON DELETE CASCADE,
            FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
        )
        """)
        print("  - Tabla detalles_conteo creada")
        
        # ============================================
        # INSERTAR DATOS INICIALES
        # ============================================
        
        print("\nInsertando datos iniciales...")
        
        # Tipos de movimiento
        cursor.executemany("""
        INSERT IGNORE INTO tipos_movimiento (nombre, signo, descripcion) VALUES (%s, %s, %s)
        """, [
            ('Venta', -1, 'Salida por venta'),
            ('Compra', 1, 'Entrada por compra'),
            ('Ajuste_inventario', 1, 'Ajuste manual positivo'),
            ('Ajuste_negativo', -1, 'Ajuste manual negativo'),
            ('Devolucion_venta', 1, 'Devolucion de cliente'),
            ('Devolucion_compra', -1, 'Devolucion a proveedor'),
            ('Merma', -1, 'Perdida de producto')
        ])
        print("  - Tipos de movimiento insertados")
        
        # Estados de venta
        cursor.executemany("""
        INSERT IGNORE INTO estados_venta (nombre) VALUES (%s)
        """, [('Pendiente',), ('Completada',), ('Cancelada',), ('Devuelta',)])
        print("  - Estados de venta insertados")
        
        # Estados de pedido
        cursor.executemany("""
        INSERT IGNORE INTO estados_pedido (nombre) VALUES (%s)
        """, [('Pendiente',), ('Enviado',), ('Recibido',), ('Cancelado',)])
        print("  - Estados de pedido insertados")
        
        # Roles
        cursor.executemany("""
        INSERT IGNORE INTO roles (nombre, descripcion) VALUES (%s, %s)
        """, [
            ('Administrador', 'Acceso total al sistema'),
            ('Vendedor', 'Registro de ventas y consultas'),
            ('Encargado_compras', 'Gestion de pedidos y proveedores')
        ])
        print("  - Roles insertados")
        
        # Empresa por defecto
        cursor.execute("""
        INSERT IGNORE INTO empresas (nombre, ruc, telefono, email, direccion, moneda, iva) 
        VALUES ('Sistema de Control de Stock', '30-12345678-9', '011-4567-8901', 
                'admin@controlstock.com', 'Av. Principal 123', 'ARS', 21.00)
        """)
        print("  - Empresa por defecto insertada")
        
        # Usuario admin (contraseña: admin123)
        cursor.execute("""
        INSERT IGNORE INTO usuarios 
        (nombre_usuario, contrasena, nombre_completo, email, id_rol, id_empresa, activo) 
        VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
                'Administrador del Sistema', 'admin@controlstock.com', 1, 1, TRUE)
        """)
        print("  - Usuario admin creado")
        
        # Cliente por defecto
        cursor.execute("""
        INSERT IGNORE INTO clientes (nombre, tipo, id_empresa) 
        VALUES ('CONSUMIDOR FINAL', 'CONSUMIDOR FINAL', 1)
        """)
        print("  - Cliente por defecto insertado")
        
        # Categorias por defecto
        cursor.executemany("""
        INSERT IGNORE INTO categorias (nombre, descripcion, id_empresa) VALUES (%s, %s, %s)
        """, [
            ('Bebidas', 'Gaseosas, jugos, aguas, cervezas', 1),
            ('Alimentos', 'Comestibles en general', 1),
            ('Limpieza', 'Productos de limpieza', 1),
            ('Perfumeria', 'Productos de higiene personal', 1),
            ('Lacteos', 'Leche, yogures, quesos', 1),
            ('Fiambres', 'Jamón, queso, salamines', 1),
            ('Panaderia', 'Panes, facturas, tortas', 1)
        ])
        print("  - Categorias insertadas")
        
        # Proveedores por defecto
        cursor.executemany("""
        INSERT IGNORE INTO proveedores (nombre, ruc, telefono, email, direccion, id_empresa) VALUES (%s, %s, %s, %s, %s, %s)
        """, [
            ('Distribuidora Sur S.A.', '30-12345678-9', '011-4567-8901', 'ventas@distribuidorasur.com', 'Av. Corrientes 1234, CABA', 1),
            ('Alimentos del Centro', '30-23456789-0', '011-5678-9012', 'ventas@alimentoscentro.com', 'Av. Rivadavia 5678, CABA', 1),
            ('Limpieza Total', '30-34567890-1', '011-6789-0123', 'ventas@limpiezatotal.com', 'Av. San Martin 901, CABA', 1)
        ])
        print("  - Proveedores insertados")
        
        # Productos de prueba
        cursor.executemany("""
        INSERT IGNORE INTO productos 
        (codigo, nombre, id_categoria, id_proveedor, precio_compra, precio_venta, stock_actual, stock_minimo, id_empresa) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, [
            ('CO001', 'Coca Cola 2L', 1, 1, 180.00, 250.00, 50, 10, 1),
            ('CO002', 'Sprite 2L', 1, 1, 170.00, 240.00, 30, 10, 1),
            ('CO003', 'Agua Mineral 500ml', 1, 1, 80.00, 120.00, 100, 20, 1),
            ('AL001', 'Arroz 1kg', 2, 2, 120.00, 180.00, 40, 15, 1),
            ('AL002', 'Fideos 500g', 2, 2, 90.00, 140.00, 25, 10, 1),
            ('AL003', 'Aceite 900ml', 2, 2, 200.00, 300.00, 15, 8, 1),
            ('LM001', 'Detergente 500ml', 3, 3, 150.00, 220.00, 20, 10, 1),
            ('LM002', 'Lavandina 1L', 3, 3, 80.00, 130.00, 35, 15, 1),
            ('PF001', 'Shampoo 400ml', 4, 3, 250.00, 380.00, 12, 5, 1),
            ('PF002', 'Jabon Intimo', 4, 3, 180.00, 280.00, 18, 8, 1),
            ('LA001', 'Leche Entera 1L', 5, 2, 110.00, 170.00, 8, 10, 1),
            ('LA002', 'Yogur Firme 200g', 5, 2, 80.00, 130.00, 3, 8, 1),
            ('FI001', 'Jamon Cocido 500g', 6, 2, 400.00, 580.00, 5, 6, 1),
            ('PA001', 'Pan Frances', 7, None, 50.00, 80.00, 0, 10, 1)
        ])
        print("  - Productos insertados")
        
        # ============================================
        # VISTAS
        # ============================================
        
        print("\nCreando vistas...")
        
        cursor.execute("""
        CREATE OR REPLACE VIEW vw_stock_alertas AS
        SELECT 
            p.id_producto,
            p.codigo,
            p.nombre,
            c.nombre AS categoria,
            p.stock_actual,
            p.stock_minimo,
            CASE 
                WHEN p.stock_actual <= 0 THEN 'SIN STOCK'
                WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK BAJO'
                ELSE 'NORMAL'
            END AS estado_stock,
            GREATEST(0, p.stock_minimo - p.stock_actual) AS cantidad_recomendada,
            pr.nombre AS proveedor,
            pr.id_proveedor,
            p.id_empresa
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria AND c.id_empresa = p.id_empresa
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor AND pr.id_empresa = p.id_empresa
        WHERE p.activo = TRUE
        """)
        print("  - Vista vw_stock_alertas creada")
        
        cursor.execute("""
        CREATE OR REPLACE VIEW vw_productos_mas_vendidos AS
        SELECT 
            p.id_producto,
            p.codigo,
            p.nombre,
            SUM(dv.cantidad) AS total_vendido,
            COUNT(DISTINCT dv.id_venta) AS numero_ventas,
            SUM(dv.subtotal) AS ingreso_total,
            p.id_empresa
        FROM detalles_venta dv
        JOIN productos p ON dv.id_producto = p.id_producto
        JOIN ventas v ON dv.id_venta = v.id_venta
        WHERE v.id_estado = 2
        GROUP BY p.id_producto, p.id_empresa
        ORDER BY total_vendido DESC
        """)
        print("  - Vista vw_productos_mas_vendidos creada")
        
        conn.commit()
        
        print("\n" + "=" * 70)
        print("MIGRACION COMPLETADA EXITOSAMENTE!")
        print("=" * 70)
        print("Credenciales de acceso:")
        print("  Usuario: admin")
        print("  Contraseña: admin123")
        print("=" * 70)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\nERROR en migracion: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    migrate()

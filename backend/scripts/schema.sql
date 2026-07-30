-- =====================================================
-- SISTEMA DE CONTROL DE STOCK - ESQUEMA COMPLETO-- Version: 3.0.0
-- =====================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS control_stock;
USE control_stock;

-- =====================================================
-- 1. TABLAS PRINCIPALES CON id_empresa
-- =====================================================

-- Empresas
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
);

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    id_empresa INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_categoria_empresa (nombre, id_empresa),
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
);

-- Proveedores
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
);

-- Productos
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
);

-- =====================================================
-- 2. MOVIMIENTOS DE STOCK
-- =====================================================

-- Tipos de movimiento
CREATE TABLE IF NOT EXISTS tipos_movimiento (
    id_tipo_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    signo INT NOT NULL COMMENT '1=entrada, -1=salida',
    descripcion VARCHAR(100)
);

INSERT IGNORE INTO tipos_movimiento (nombre, signo, descripcion) VALUES
('Venta', -1, 'Salida por venta'),
('Compra', 1, 'Entrada por compra'),
('Ajuste_inventario', 1, 'Ajuste manual positivo'),
('Ajuste_negativo', -1, 'Ajuste manual negativo'),
('Devolucion_venta', 1, 'Devolucion de cliente'),
('Devolucion_compra', -1, 'Devolucion a proveedor'),
('Merma', -1, 'Perdida de producto');

-- Movimientos de stock
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
);

-- =====================================================
-- 3. VENTAS
-- =====================================================

-- Estados de venta
CREATE TABLE IF NOT EXISTS estados_venta (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

INSERT IGNORE INTO estados_venta (nombre) VALUES
('Pendiente'), ('Completada'), ('Cancelada'), ('Devuelta');

-- Clientes
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
);

-- Ventas
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
);

-- Detalles de venta
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
);

-- =====================================================
-- 4. PEDIDOS
-- =====================================================

-- Estados de pedido
CREATE TABLE IF NOT EXISTS estados_pedido (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

INSERT IGNORE INTO estados_pedido (nombre) VALUES
('Pendiente'), ('Enviado'), ('Recibido'), ('Cancelado');

-- Pedidos
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
);

-- Detalles de pedido
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
);

-- =====================================================
-- 5. USUARIOS Y SEGURIDAD
-- =====================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(100)
);

INSERT IGNORE INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Vendedor', 'Registro de ventas y consultas'),
('Encargado_compras', 'Gestion de pedidos y proveedores');

-- Usuarios
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
);

-- Password resets
CREATE TABLE IF NOT EXISTS password_resets (
    id_reset INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiracion TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- =====================================================
-- 6. CONTEOS FISICOS
-- =====================================================

CREATE TABLE IF NOT EXISTS conteos_inventario (
    id_conteo INT AUTO_INCREMENT PRIMARY KEY,
    fecha_conteo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion VARCHAR(200),
    usuario VARCHAR(50),
    cerrado BOOLEAN DEFAULT FALSE,
    id_empresa INT,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
);

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
);

-- =====================================================
-- 7. VISTAS
-- =====================================================

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
WHERE p.activo = TRUE;

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
ORDER BY total_vendido DESC;

-- =====================================================
-- 8. DATOS INICIALES
-- =====================================================

INSERT IGNORE INTO empresas (nombre, ruc, telefono, email, direccion, moneda, iva) 
VALUES ('Sistema de Control de Stock', '30-12345678-9', '011-4567-8901', 
        'admin@controlstock.com', 'Av. Principal 123', 'ARS', 21.00);

INSERT IGNORE INTO usuarios (nombre_usuario, contrasena, nombre_completo, email, id_rol, id_empresa, activo) 
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
        'Administrador del Sistema', 'admin@controlstock.com', 1, 1, TRUE);

INSERT IGNORE INTO clientes (nombre, tipo, id_empresa) 
VALUES ('CONSUMIDOR FINAL', 'CONSUMIDOR FINAL', 1);
-- =====================================================
-- SISTEMA DE CONTROL DE STOCK - MULTI-EMPRESA
-- Base de datos: control_stock
-- Version: 3.0.0
-- =====================================================

DROP DATABASE IF EXISTS control_stock;
CREATE DATABASE control_stock;
USE control_stock;

-- =====================================================
-- 1. TABLAS PRINCIPALES CON id_empresa
-- =====================================================

-- Tabla de empresas
CREATE TABLE empresas (
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

-- Tabla de categorias
CREATE TABLE categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    id_empresa INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_categoria_empresa (nombre, id_empresa),
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
);

-- Tabla de proveedores
CREATE TABLE proveedores (
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

-- Tabla de productos
CREATE TABLE productos (
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
-- 2. TABLAS DE MOVIMIENTOS DE STOCK
-- =====================================================

-- Tipos de movimiento
CREATE TABLE tipos_movimiento (
    id_tipo_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    signo INT NOT NULL COMMENT '1=entrada, -1=salida',
    descripcion VARCHAR(100)
);

INSERT INTO tipos_movimiento (nombre, signo, descripcion) VALUES
('Venta', -1, 'Salida por venta'),
('Compra', 1, 'Entrada por compra'),
('Ajuste_inventario', 1, 'Ajuste manual positivo'),
('Ajuste_negativo', -1, 'Ajuste manual negativo'),
('Devolucion_venta', 1, 'Devolucion de cliente'),
('Devolucion_compra', -1, 'Devolucion a proveedor'),
('Merma', -1, 'Perdida de producto');

-- Movimientos de stock
CREATE TABLE movimientos_stock (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    id_tipo_movimiento INT NOT NULL,
    cantidad INT NOT NULL,
    stock_antes INT NOT NULL,
    stock_despues INT NOT NULL,
    referencia_tipo VARCHAR(50) COMMENT 'venta, compra, ajuste',
    referencia_id INT COMMENT 'ID del documento relacionado',
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
-- 3. TABLAS DE VENTAS
-- =====================================================

-- Estados de venta
CREATE TABLE estados_venta (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO estados_venta (nombre) VALUES
('Pendiente'), ('Completada'), ('Cancelada'), ('Devuelta');

-- Clientes
CREATE TABLE clientes (
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

-- Cabecera de ventas
CREATE TABLE ventas (
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

-- Detalle de ventas
CREATE TABLE detalles_venta (
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
-- 4. TABLAS DE COMPRAS Y PEDIDOS
-- =====================================================

-- Estados de pedido
CREATE TABLE estados_pedido (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO estados_pedido (nombre) VALUES
('Pendiente'), ('Enviado'), ('Recibido'), ('Cancelado');

-- Cabecera de pedidos
CREATE TABLE pedidos (
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

-- Detalle de pedidos
CREATE TABLE detalles_pedido (
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
-- 5. TABLAS DE CONFIGURACION
-- =====================================================

-- Conteos fisicos de inventario
CREATE TABLE conteos_inventario (
    id_conteo INT AUTO_INCREMENT PRIMARY KEY,
    fecha_conteo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion VARCHAR(200),
    usuario VARCHAR(50),
    cerrado BOOLEAN DEFAULT FALSE,
    id_empresa INT,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
);

-- Detalle del conteo fisico
CREATE TABLE detalles_conteo (
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
-- 6. TABLAS DE USUARIOS Y SEGURIDAD
-- =====================================================

-- Roles
CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(100)
);

INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Vendedor', 'Registro de ventas y consultas'),
('Encargado_compras', 'Gestion de pedidos y proveedores');

-- Usuarios
CREATE TABLE usuarios (
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

-- Password resets (para recuperacion de contraseña)
CREATE TABLE password_resets (
    id_reset INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiracion TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- =====================================================
-- 7. VISTAS
-- =====================================================

-- Vista de stock con alertas
CREATE VIEW vw_stock_alertas AS
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

-- Vista de productos mas vendidos
CREATE VIEW vw_productos_mas_vendidos AS
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
-- 8. INSERTS INICIALES
-- =====================================================

-- Empresa por defecto
INSERT INTO empresas (nombre, ruc, telefono, email, direccion, moneda, iva) 
VALUES ('Sistema de Control de Stock', '30-12345678-9', '011-4567-8901', 
        'admin@controlstock.com', 'Av. Principal 123', 'ARS', 21.00);

-- Usuario administrador (contraseña: admin123)
INSERT INTO usuarios (nombre_usuario, contrasena, nombre_completo, email, id_rol, id_empresa, activo) 
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
        'Administrador del Sistema', 'admin@controlstock.com', 1, 1, TRUE);

-- Cliente por defecto
INSERT INTO clientes (nombre, tipo, id_empresa) 
VALUES ('CONSUMIDOR FINAL', 'CONSUMIDOR FINAL', 1);

-- Categorias por defecto
INSERT INTO categorias (nombre, descripcion, id_empresa) VALUES
('Bebidas', 'Gaseosas, jugos, aguas, cervezas', 1),
('Alimentos', 'Comestibles en general', 1),
('Limpieza', 'Productos de limpieza', 1),
('Perfumeria', 'Productos de higiene personal', 1),
('Lacteos', 'Leche, yogures, quesos', 1),
('Fiambres', 'Jamón, queso, salamines', 1),
('Panaderia', 'Panes, facturas, tortas', 1);

-- Proveedores por defecto
INSERT INTO proveedores (nombre, ruc, telefono, email, direccion, id_empresa) VALUES
('Distribuidora Sur S.A.', '30-12345678-9', '011-4567-8901', 'ventas@distribuidorasur.com', 'Av. Corrientes 1234, CABA', 1),
('Alimentos del Centro', '30-23456789-0', '011-5678-9012', 'ventas@alimentoscentro.com', 'Av. Rivadavia 5678, CABA', 1),
('Limpieza Total', '30-34567890-1', '011-6789-0123', 'ventas@limpiezatotal.com', 'Av. San Martin 901, CABA', 1);

-- Productos de prueba
INSERT INTO productos (codigo, nombre, id_categoria, id_proveedor, precio_compra, precio_venta, stock_actual, stock_minimo, id_empresa) VALUES
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
('PA001', 'Pan Frances', 7, NULL, 50.00, 80.00, 0, 10, 1);

-- =====================================================
-- 9. INDICES ADICIONALES
-- =====================================================

CREATE INDEX idx_productos_stock ON productos(stock_actual, stock_minimo);
CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX idx_movimientos_producto ON movimientos_stock(id_producto, fecha);
CREATE INDEX idx_pedidos_estado ON pedidos(id_estado, fecha_pedido);
CREATE INDEX idx_usuarios_empresa ON usuarios(id_empresa);
CREATE INDEX idx_clientes_empresa ON clientes(id_empresa);

-- =====================================================
-- 10. CONSULTAS UTILES
-- =====================================================

-- Productos con alertas por empresa
SELECT * FROM vw_stock_alertas 
WHERE estado_stock != 'NORMAL'
ORDER BY id_empresa, estado_stock, stock_actual;

-- Ventas del dia por empresa
SELECT 
    id_empresa,
    COUNT(*) AS total_ventas,
    SUM(total) AS monto_total
FROM ventas
WHERE DATE(fecha_venta) = CURDATE()
AND id_estado = 2
GROUP BY id_empresa;

-- Resumen por empresa
SELECT 
    e.nombre AS empresa,
    COUNT(DISTINCT p.id_producto) AS total_productos,
    COUNT(DISTINCT v.id_venta) AS total_ventas,
    COUNT(DISTINCT u.id_usuario) AS total_usuarios
FROM empresas e
LEFT JOIN productos p ON e.id_empresa = p.id_empresa AND p.activo = TRUE
LEFT JOIN ventas v ON e.id_empresa = v.id_empresa AND v.id_estado = 2
LEFT JOIN usuarios u ON e.id_empresa = u.id_empresa AND u.activo = TRUE
GROUP BY e.id_empresa;
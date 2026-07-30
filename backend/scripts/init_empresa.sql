-- =====================================================
-- SCRIPT PARA INICIALIZAR UNA NUEVA EMPRESA
-- Reemplazar <ID_EMPRESA> con el ID de la nueva empresa
-- =====================================================

-- Categorias por defecto
INSERT IGNORE INTO categorias (nombre, descripcion, id_empresa) VALUES
('Bebidas', 'Gaseosas, jugos, aguas, cervezas', <ID_EMPRESA>),
('Alimentos', 'Comestibles en general', <ID_EMPRESA>),
('Limpieza', 'Productos de limpieza', <ID_EMPRESA>),
('Perfumeria', 'Productos de higiene personal', <ID_EMPRESA>),
('Lacteos', 'Leche, yogures, quesos', <ID_EMPRESA>),
('Fiambres', 'Jamón, queso, salamines', <ID_EMPRESA>),
('Panaderia', 'Panes, facturas, tortas', <ID_EMPRESA>);

-- Cliente por defecto
INSERT IGNORE INTO clientes (nombre, tipo, id_empresa) VALUES
('CONSUMIDOR FINAL', 'CONSUMIDOR FINAL', <ID_EMPRESA>);

-- Proveedores por defecto
INSERT IGNORE INTO proveedores (nombre, ruc, telefono, email, direccion, id_empresa) VALUES
('Distribuidora Sur S.A.', '30-12345678-9', '011-4567-8901', 'ventas@distribuidorasur.com', 'Av. Corrientes 1234, CABA', <ID_EMPRESA>),
('Alimentos del Centro', '30-23456789-0', '011-5678-9012', 'ventas@alimentoscentro.com', 'Av. Rivadavia 5678, CABA', <ID_EMPRESA>),
('Limpieza Total', '30-34567890-1', '011-6789-0123', 'ventas@limpiezatotal.com', 'Av. San Martin 901, CABA', <ID_EMPRESA>);

-- Productos basicos
INSERT IGNORE INTO productos 
(codigo, nombre, id_categoria, id_proveedor, precio_compra, precio_venta, stock_actual, stock_minimo, id_empresa) 
VALUES
('CO001', 'Coca Cola 2L', 1, 1, 180.00, 250.00, 0, 10, <ID_EMPRESA>),
('AL001', 'Arroz 1kg', 2, 2, 120.00, 180.00, 0, 15, <ID_EMPRESA>),
('LM001', 'Detergente 500ml', 3, 3, 150.00, 220.00, 0, 10, <ID_EMPRESA>),
('PF001', 'Shampoo 400ml', 4, 3, 250.00, 380.00, 0, 5, <ID_EMPRESA>),
('LA001', 'Leche Entera 1L', 5, 2, 110.00, 170.00, 0, 10, <ID_EMPRESA>);

-- Usuario administrador para la empresa
INSERT IGNORE INTO usuarios 
(nombre_usuario, contrasena, nombre_completo, email, id_rol, id_empresa, activo) 
VALUES 
('admin_empresa', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'Administrador Empresa', 'admin@empresa.com', 1, <ID_EMPRESA>, TRUE);
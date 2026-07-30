-- ============================================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================================

-- Tabla: productos
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual, stock_minimo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- Tabla: ventas
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ventas_numero_factura ON ventas(numero_factura);

-- Tabla: ventas_detalles
CREATE INDEX IF NOT EXISTS idx_ventas_detalles_venta ON ventas_detalles(id_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_detalles_producto ON ventas_detalles(id_producto);

-- Tabla: pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_proveedor ON pedidos(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(id_estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_pedido DESC);

-- Tabla: pedidos_detalles
CREATE INDEX IF NOT EXISTS idx_pedidos_detalles_pedido ON pedidos_detalles(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_detalles_producto ON pedidos_detalles(id_producto);

-- Tabla: movimientos_stock
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(id_producto);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_stock(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_stock(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_referencia ON movimientos_stock(referencia_tipo, referencia_id);

-- Tabla: clientes
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo);
CREATE INDEX IF NOT EXISTS idx_clientes_ruc ON clientes(ruc);

-- Tabla: proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_ruc ON proveedores(ruc);

-- Tabla: usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(nombre_usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(id_empresa);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(id_rol);

-- Tabla: configuracion
CREATE INDEX IF NOT EXISTS idx_configuracion_empresa ON configuracion(id_empresa);

-- Índices compuestos
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_estado ON ventas(fecha_venta, estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos_stock(id_producto, fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_pedidos_proveedor_estado ON pedidos(id_proveedor, id_estado);
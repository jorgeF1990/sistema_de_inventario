-- ============================================================
-- VISTAS MATERIALIZADAS PARA REPORTES Y DASHBOARD
-- ============================================================

-- 1. VISTA: Resumen Diario de Ventas
DROP MATERIALIZED VIEW IF EXISTS mv_resumen_ventas_diario;
CREATE MATERIALIZED VIEW mv_resumen_ventas_diario AS
SELECT 
    DATE(v.fecha_venta) as fecha,
    COUNT(DISTINCT v.id_venta) as total_ventas,
    COUNT(vd.id_detalle) as total_productos_vendidos,
    SUM(vd.cantidad) as unidades_vendidas,
    SUM(v.total) as monto_total,
    SUM(v.subtotal) as subtotal_total,
    SUM(v.iva) as iva_total,
    AVG(v.total) as ticket_promedio
FROM ventas v
JOIN ventas_detalles vd ON v.id_venta = vd.id_venta
WHERE v.estado = 'COMPLETADA'
GROUP BY DATE(v.fecha_venta);

CREATE UNIQUE INDEX idx_mv_resumen_ventas_diario_fecha ON mv_resumen_ventas_diario(fecha);
REFRESH MATERIALIZED VIEW mv_resumen_ventas_diario;

-- 2. VISTA: Resumen de Productos con Stock
DROP MATERIALIZED VIEW IF EXISTS mv_resumen_productos;
CREATE MATERIALIZED VIEW mv_resumen_productos AS
SELECT 
    p.id_producto,
    p.codigo,
    p.nombre,
    p.descripcion,
    p.stock_actual,
    p.stock_minimo,
    p.precio_compra,
    p.precio_venta,
    p.ubicacion,
    p.unidad_medida,
    c.id_categoria,
    c.nombre as categoria_nombre,
    pr.id_proveedor,
    pr.nombre as proveedor_nombre,
    CASE 
        WHEN p.stock_actual = 0 THEN 'SIN STOCK'
        WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK BAJO'
        ELSE 'NORMAL'
    END as estado_stock,
    COALESCE((
        SELECT SUM(vd.cantidad) 
        FROM ventas_detalles vd 
        JOIN ventas v ON vd.id_venta = v.id_venta 
        WHERE vd.id_producto = p.id_producto 
        AND v.fecha_venta >= CURRENT_DATE - INTERVAL '30 days'
    ), 0) as ventas_ultimos_30_dias,
    COALESCE((
        SELECT SUM(vd.cantidad) 
        FROM ventas_detalles vd 
        JOIN ventas v ON vd.id_venta = v.id_venta 
        WHERE vd.id_producto = p.id_producto 
        AND v.fecha_venta >= CURRENT_DATE - INTERVAL '7 days'
    ), 0) as ventas_ultimos_7_dias
FROM productos p
LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
WHERE p.activo = true;

CREATE UNIQUE INDEX idx_mv_resumen_productos_id ON mv_resumen_productos(id_producto);
CREATE INDEX idx_mv_resumen_productos_estado ON mv_resumen_productos(estado_stock);
CREATE INDEX idx_mv_resumen_productos_categoria ON mv_resumen_productos(id_categoria);
CREATE INDEX idx_mv_resumen_productos_proveedor ON mv_resumen_productos(id_proveedor);
REFRESH MATERIALIZED VIEW mv_resumen_productos;

-- 3. VISTA: Top Productos Más Vendidos
DROP MATERIALIZED VIEW IF EXISTS mv_top_productos_vendidos;
CREATE MATERIALIZED VIEW mv_top_productos_vendidos AS
SELECT 
    p.id_producto,
    p.codigo,
    p.nombre,
    c.nombre as categoria,
    COUNT(vd.id_detalle) as veces_vendido,
    SUM(vd.cantidad) as total_unidades,
    SUM(vd.subtotal) as total_ingresos,
    AVG(vd.precio_unitario) as precio_promedio,
    DATE_TRUNC('month', v.fecha_venta) as mes
FROM productos p
JOIN ventas_detalles vd ON p.id_producto = vd.id_producto
JOIN ventas v ON vd.id_venta = v.id_venta
LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
WHERE v.estado = 'COMPLETADA'
GROUP BY p.id_producto, p.codigo, p.nombre, c.nombre, DATE_TRUNC('month', v.fecha_venta);

CREATE INDEX idx_mv_top_productos_mes ON mv_top_productos_vendidos(mes);
CREATE INDEX idx_mv_top_productos_unidades ON mv_top_productos_vendidos(total_unidades DESC);
REFRESH MATERIALIZED VIEW mv_top_productos_vendidos;

-- 4. VISTA: Resumen de Pedidos
DROP MATERIALIZED VIEW IF EXISTS mv_resumen_pedidos;
CREATE MATERIALIZED VIEW mv_resumen_pedidos AS
SELECT 
    p.id_pedido,
    p.numero_pedido,
    pr.id_proveedor,
    pr.nombre as proveedor_nombre,
    pr.ruc as proveedor_ruc,
    p.fecha_pedido,
    p.fecha_entrega_estimada,
    e.id_estado,
    e.nombre as estado_nombre,
    COUNT(pd.id_detalle) as total_productos,
    SUM(pd.cantidad) as unidades_totales,
    SUM(pd.subtotal) as subtotal,
    SUM(pd.total) as total,
    p.observaciones
FROM pedidos p
JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
JOIN pedidos_estados e ON p.id_estado = e.id_estado
LEFT JOIN pedidos_detalles pd ON p.id_pedido = pd.id_pedido
GROUP BY p.id_pedido, p.numero_pedido, pr.id_proveedor, pr.nombre, pr.ruc,
         p.fecha_pedido, p.fecha_entrega_estimada, e.id_estado, e.nombre, p.observaciones;

CREATE UNIQUE INDEX idx_mv_resumen_pedidos_id ON mv_resumen_pedidos(id_pedido);
CREATE INDEX idx_mv_resumen_pedidos_estado ON mv_resumen_pedidos(id_estado);
CREATE INDEX idx_mv_resumen_pedidos_fecha ON mv_resumen_pedidos(fecha_pedido DESC);
REFRESH MATERIALIZED VIEW mv_resumen_pedidos;

-- 5. VISTA: Movimientos de Stock (Últimos 30 días)
DROP MATERIALIZED VIEW IF EXISTS mv_movimientos_stock;
CREATE MATERIALIZED VIEW mv_movimientos_stock AS
SELECT 
    m.id_movimiento,
    m.id_producto,
    p.codigo as producto_codigo,
    p.nombre as producto_nombre,
    m.cantidad,
    m.stock_antes,
    m.stock_despues,
    m.fecha_movimiento,
    m.tipo_movimiento,
    m.motivo,
    tm.nombre as tipo_nombre,
    u.nombre_usuario as usuario,
    CASE 
        WHEN m.referencia_tipo = 'pedido' THEN 'PEDIDO'
        WHEN m.referencia_tipo = 'venta' THEN 'VENTA'
        WHEN m.referencia_tipo = 'ajuste' THEN 'AJUSTE MANUAL'
        ELSE 'OTRO'
    END as referencia_tipo,
    m.referencia_id,
    COALESCE(
        (SELECT pr.nombre FROM proveedores pr WHERE pr.id_proveedor = m.referencia_id),
        (SELECT c.nombre FROM clientes c WHERE c.id_cliente = m.referencia_id),
        'N/A'
    ) as referencia_nombre
FROM movimientos_stock m
JOIN productos p ON m.id_producto = p.id_producto
JOIN tipos_movimiento tm ON m.tipo_movimiento = tm.id_tipo
LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
WHERE m.fecha_movimiento >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX idx_mv_movimientos_fecha ON mv_movimientos_stock(fecha_movimiento DESC);
CREATE INDEX idx_mv_movimientos_producto ON mv_movimientos_stock(id_producto);
CREATE INDEX idx_mv_movimientos_tipo ON mv_movimientos_stock(tipo_movimiento);
REFRESH MATERIALIZED VIEW mv_movimientos_stock;

-- 6. VISTA: Dashboard - Resumen General
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_resumen;
CREATE MATERIALIZED VIEW mv_dashboard_resumen AS
SELECT 
    -- Productos
    (SELECT COUNT(*) FROM productos WHERE activo = true) as total_productos,
    (SELECT COUNT(*) FROM productos WHERE stock_actual = 0 AND activo = true) as sin_stock,
    (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo AND stock_actual > 0 AND activo = true) as stock_bajo,
    
    -- Ventas Hoy
    (SELECT COUNT(*) FROM ventas WHERE DATE(fecha_venta) = CURRENT_DATE AND estado = 'COMPLETADA') as ventas_hoy_count,
    (SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(fecha_venta) = CURRENT_DATE AND estado = 'COMPLETADA') as ventas_hoy_monto,
    
    -- Ventas Mes
    (SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE_TRUNC('month', fecha_venta) = DATE_TRUNC('month', CURRENT_DATE) AND estado = 'COMPLETADA') as ventas_mes_monto,
    (SELECT COUNT(*) FROM ventas WHERE DATE_TRUNC('month', fecha_venta) = DATE_TRUNC('month', CURRENT_DATE) AND estado = 'COMPLETADA') as ventas_mes_count,
    
    -- Pedidos Pendientes
    (SELECT COUNT(*) FROM pedidos WHERE id_estado = 1) as pedidos_pendientes,
    
    -- Pedidos del Mes
    (SELECT COUNT(*) FROM pedidos WHERE DATE_TRUNC('month', fecha_pedido) = DATE_TRUNC('month', CURRENT_DATE)) as pedidos_mes_count,
    
    -- Última actualización
    CURRENT_TIMESTAMP as ultima_actualizacion;

REFRESH MATERIALIZED VIEW mv_dashboard_resumen;

-- 7. VISTA: Ventas por Cliente
DROP MATERIALIZED VIEW IF EXISTS mv_ventas_por_cliente;
CREATE MATERIALIZED VIEW mv_ventas_por_cliente AS
SELECT 
    c.id_cliente,
    c.nombre,
    c.tipo,
    c.telefono,
    c.email,
    COUNT(v.id_venta) as total_compras,
    SUM(v.total) as total_gastado,
    AVG(v.total) as ticket_promedio,
    MAX(v.fecha_venta) as ultima_compra,
    MIN(v.fecha_venta) as primera_compra,
    DATE_TRUNC('month', CURRENT_DATE) as mes_reporte
FROM clientes c
JOIN ventas v ON c.id_cliente = v.id_cliente
WHERE v.estado = 'COMPLETADA'
GROUP BY c.id_cliente, c.nombre, c.tipo, c.telefono, c.email;

CREATE INDEX idx_mv_ventas_cliente_total ON mv_ventas_por_cliente(total_gastado DESC);
REFRESH MATERIALIZED VIEW mv_ventas_por_cliente;
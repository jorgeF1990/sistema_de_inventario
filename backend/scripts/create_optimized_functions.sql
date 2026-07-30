-- ============================================================
-- FUNCIONES OPTIMIZADAS PARA CONSULTAS FRECUENTES
-- ============================================================

-- 1. Función para obtener resumen diario rápido
CREATE OR REPLACE FUNCTION get_resumen_diario(p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_ventas BIGINT,
    monto_total NUMERIC,
    total_productos BIGINT,
    unidades_vendidas BIGINT,
    ticket_promedio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        total_ventas,
        monto_total,
        total_productos_vendidos,
        unidades_vendidas,
        ticket_promedio
    FROM mv_resumen_ventas_diario
    WHERE fecha = p_fecha;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para obtener productos con alerta de stock
CREATE OR REPLACE FUNCTION get_productos_alerta()
RETURNS TABLE(
    id_producto INTEGER,
    codigo VARCHAR,
    nombre VARCHAR,
    stock_actual INTEGER,
    stock_minimo INTEGER,
    estado_stock VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id_producto,
        codigo,
        nombre,
        stock_actual,
        stock_minimo,
        estado_stock
    FROM mv_resumen_productos
    WHERE estado_stock IN ('SIN STOCK', 'STOCK BAJO')
    ORDER BY estado_stock, stock_actual;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para obtener métricas rápidas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS TABLE(
    total_productos BIGINT,
    sin_stock BIGINT,
    stock_bajo BIGINT,
    ventas_hoy BIGINT,
    ventas_hoy_monto NUMERIC,
    pedidos_pendientes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        total_productos,
        sin_stock,
        stock_bajo,
        ventas_hoy_count,
        ventas_hoy_monto,
        pedidos_pendientes
    FROM mv_dashboard_resumen;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para actualizar todas las vistas
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS TEXT AS $$
DECLARE
    v_name TEXT;
    views TEXT[] := ARRAY[
        'mv_resumen_ventas_diario',
        'mv_resumen_productos',
        'mv_top_productos_vendidos',
        'mv_resumen_pedidos',
        'mv_movimientos_stock',
        'mv_dashboard_resumen',
        'mv_ventas_por_cliente'
    ];
BEGIN
    FOREACH v_name IN ARRAY views
    LOOP
        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', v_name);
    END LOOP;
    RETURN 'Todas las vistas actualizadas correctamente';
END;
$$ LANGUAGE plpgsql;
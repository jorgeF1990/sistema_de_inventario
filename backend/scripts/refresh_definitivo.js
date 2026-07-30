const mysql = require('mysql2/promise');

console.log('==========================================');
console.log('🔄 ACTUALIZANDO VISTAS - RAILWAY');
console.log('==========================================\n');

const config = {
    host: 'reseau.proxy.rlwy.net',
    port: 23144,
    user: 'root',
    password: 'VdkyqjpCsNOaOgmztkiiSdnCxIEuvuAo',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
};

const views = [
    {
        name: 'vw_dashboard_resumen',
        sql: `
            CREATE OR REPLACE VIEW vw_dashboard_resumen AS
            SELECT 
                (SELECT COUNT(*) FROM productos WHERE activo = 1) as total_productos,
                (SELECT COUNT(*) FROM productos WHERE stock_actual = 0 AND activo = 1) as sin_stock,
                (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo AND stock_actual > 0 AND activo = 1) as stock_bajo,
                (SELECT COUNT(*) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND id_estado = 2) as ventas_hoy,
                (SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND id_estado = 2) as ventas_hoy_monto,
                (SELECT COUNT(*) FROM pedidos WHERE id_estado = 1) as pedidos_pendientes,
                NOW() as ultima_actualizacion
        `
    },
    {
        name: 'vw_resumen_productos',
        sql: `
            CREATE OR REPLACE VIEW vw_resumen_productos AS
            SELECT 
                p.id_producto, p.codigo, p.nombre, p.stock_actual, p.stock_minimo, p.precio_venta,
                c.nombre as categoria_nombre, pr.nombre as proveedor_nombre,
                CASE 
                    WHEN p.stock_actual = 0 THEN 'SIN STOCK'
                    WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK BAJO'
                    ELSE 'NORMAL'
                END as estado_stock
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
            WHERE p.activo = 1
        `
    },
    {
        name: 'vw_resumen_ventas_diario',
        sql: `
            CREATE OR REPLACE VIEW vw_resumen_ventas_diario AS
            SELECT 
                DATE(fecha_venta) as fecha,
                COUNT(*) as total_ventas,
                SUM(total) as monto_total,
                AVG(total) as ticket_promedio
            FROM ventas
            WHERE id_estado = 2
            GROUP BY DATE(fecha_venta)
            ORDER BY fecha DESC
            LIMIT 30
        `
    },
    {
        name: 'vw_top_productos',
        sql: `
            CREATE OR REPLACE VIEW vw_top_productos AS
            SELECT 
                p.id_producto, p.codigo, p.nombre,
                COUNT(vd.id_detalle) as veces_vendido,
                SUM(vd.cantidad) as total_unidades,
                SUM(vd.subtotal) as total_ingresos
            FROM productos p
            JOIN ventas_detalles vd ON p.id_producto = vd.id_producto
            JOIN ventas v ON vd.id_venta = v.id_venta
            WHERE v.id_estado = 2
            GROUP BY p.id_producto, p.codigo, p.nombre
            ORDER BY total_unidades DESC
            LIMIT 10
        `
    },
    {
        name: 'vw_ventas_por_cliente',
        sql: `
            CREATE OR REPLACE VIEW vw_ventas_por_cliente AS
            SELECT 
                c.id_cliente, c.nombre, c.tipo,
                COUNT(v.id_venta) as total_compras,
                SUM(v.total) as total_gastado,
                AVG(v.total) as ticket_promedio,
                MAX(v.fecha_venta) as ultima_compra
            FROM clientes c
            JOIN ventas v ON c.id_cliente = v.id_cliente
            WHERE v.id_estado = 2
            GROUP BY c.id_cliente, c.nombre, c.tipo
        `
    }
];

const main = async () => {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Conectado a Railway\n');

        for (const view of views) {
            console.log(`   Actualizando ${view.name}...`);
            await connection.query(view.sql);
            console.log(`   ✅ ${view.name} actualizada`);
        }

        console.log('\n✅ Vistas actualizadas correctamente');
        console.log('==========================================');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
};

main();

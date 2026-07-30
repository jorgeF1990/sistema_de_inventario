const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuración desde tu .env
const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Arcangeles369',
    database: 'control_stock',
    multipleStatements: true,
};

const main = async () => {
    console.log('==========================================');
    console.log('OPTIMIZACIÓN DE BASE DE DATOS (MySQL)');
    console.log('==========================================');
    console.log(`📊 Base de datos: ${config.database}`);
    console.log(`🔗 Host: ${config.host}:${config.port}\n`);
    
    const connection = await mysql.createConnection(config);
    
    try {
        // 1. Crear índices
        console.log('1. Creando índices optimizados...');
        await connection.query(`
            -- Índices para productos
            CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
            CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre(100));
            CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual, stock_minimo);
            CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
            CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(id_proveedor);
            CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
            
            -- Índices para ventas
            CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta DESC);
            CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(id_cliente);
            CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
            CREATE INDEX IF NOT EXISTS idx_ventas_numero_factura ON ventas(numero_factura);
            
            -- Índices para ventas_detalles
            CREATE INDEX IF NOT EXISTS idx_ventas_detalles_venta ON ventas_detalles(id_venta);
            CREATE INDEX IF NOT EXISTS idx_ventas_detalles_producto ON ventas_detalles(id_producto);
            
            -- Índices para pedidos
            CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(numero_pedido);
            CREATE INDEX IF NOT EXISTS idx_pedidos_proveedor ON pedidos(id_proveedor);
            CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(id_estado);
            CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_pedido DESC);
            
            -- Índices para pedidos_detalles
            CREATE INDEX IF NOT EXISTS idx_pedidos_detalles_pedido ON pedidos_detalles(id_pedido);
            CREATE INDEX IF NOT EXISTS idx_pedidos_detalles_producto ON pedidos_detalles(id_producto);
            
            -- Índices para movimientos_stock
            CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(id_producto);
            CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_stock(fecha_movimiento DESC);
            CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_stock(tipo_movimiento);
            
            -- Índices para clientes
            CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre(100));
            CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo);
            CREATE INDEX IF NOT EXISTS idx_clientes_ruc ON clientes(ruc);
            
            -- Índices para proveedores
            CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre(100));
            CREATE INDEX IF NOT EXISTS idx_proveedores_ruc ON proveedores(ruc);
            
            -- Índices para usuarios
            CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(nombre_usuario);
            CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(id_rol);
        `);
        console.log('   ✅ Índices creados\n');

        // 2. Crear vistas optimizadas
        console.log('2. Creando vistas optimizadas...');
        
        // Vista: Dashboard Resumen
        await connection.query(`
            DROP VIEW IF EXISTS vw_dashboard_resumen;
            CREATE VIEW vw_dashboard_resumen AS
            SELECT 
                (SELECT COUNT(*) FROM productos WHERE activo = 1) as total_productos,
                (SELECT COUNT(*) FROM productos WHERE stock_actual = 0 AND activo = 1) as sin_stock,
                (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo AND stock_actual > 0 AND activo = 1) as stock_bajo,
                (SELECT COUNT(*) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND estado = 'COMPLETADA') as ventas_hoy,
                (SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND estado = 'COMPLETADA') as ventas_hoy_monto,
                (SELECT COUNT(*) FROM pedidos WHERE id_estado = 1) as pedidos_pendientes,
                NOW() as ultima_actualizacion
        `);
        
        // Vista: Resumen de Productos
        await connection.query(`
            DROP VIEW IF EXISTS vw_resumen_productos;
            CREATE VIEW vw_resumen_productos AS
            SELECT 
                p.id_producto,
                p.codigo,
                p.nombre,
                p.stock_actual,
                p.stock_minimo,
                p.precio_venta,
                c.nombre as categoria_nombre,
                pr.nombre as proveedor_nombre,
                CASE 
                    WHEN p.stock_actual = 0 THEN 'SIN STOCK'
                    WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK BAJO'
                    ELSE 'NORMAL'
                END as estado_stock
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
            WHERE p.activo = 1
        `);
        
        // Vista: Resumen Ventas Diario
        await connection.query(`
            DROP VIEW IF EXISTS vw_resumen_ventas_diario;
            CREATE VIEW vw_resumen_ventas_diario AS
            SELECT 
                DATE(v.fecha_venta) as fecha,
                COUNT(DISTINCT v.id_venta) as total_ventas,
                SUM(vd.cantidad) as unidades_vendidas,
                SUM(v.total) as monto_total,
                AVG(v.total) as ticket_promedio
            FROM ventas v
            JOIN ventas_detalles vd ON v.id_venta = vd.id_venta
            WHERE v.estado = 'COMPLETADA'
            GROUP BY DATE(v.fecha_venta)
        `);
        
        // Vista: Top Productos Más Vendidos
        await connection.query(`
            DROP VIEW IF EXISTS vw_top_productos_vendidos;
            CREATE VIEW vw_top_productos_vendidos AS
            SELECT 
                p.id_producto,
                p.codigo,
                p.nombre,
                c.nombre as categoria,
                COUNT(vd.id_detalle) as veces_vendido,
                SUM(vd.cantidad) as total_unidades,
                SUM(vd.subtotal) as total_ingresos,
                AVG(vd.precio_unitario) as precio_promedio,
                DATE_FORMAT(v.fecha_venta, '%Y-%m-01') as mes
            FROM productos p
            JOIN ventas_detalles vd ON p.id_producto = vd.id_producto
            JOIN ventas v ON vd.id_venta = v.id_venta
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE v.estado = 'COMPLETADA'
            GROUP BY p.id_producto, p.codigo, p.nombre, c.nombre, DATE_FORMAT(v.fecha_venta, '%Y-%m-01')
        `);
        
        // Vista: Resumen Pedidos
        await connection.query(`
            DROP VIEW IF EXISTS vw_resumen_pedidos;
            CREATE VIEW vw_resumen_pedidos AS
            SELECT 
                p.id_pedido,
                p.numero_pedido,
                pr.id_proveedor,
                pr.nombre as proveedor_nombre,
                p.fecha_pedido,
                e.id_estado,
                e.nombre as estado_nombre,
                COUNT(pd.id_detalle) as total_productos,
                SUM(pd.cantidad) as unidades_totales,
                SUM(pd.total) as total
            FROM pedidos p
            JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
            JOIN pedidos_estados e ON p.id_estado = e.id_estado
            LEFT JOIN pedidos_detalles pd ON p.id_pedido = pd.id_pedido
            GROUP BY p.id_pedido, p.numero_pedido, pr.id_proveedor, pr.nombre,
                     p.fecha_pedido, e.id_estado, e.nombre
        `);
        
        // Vista: Ventas por Cliente
        await connection.query(`
            DROP VIEW IF EXISTS vw_ventas_por_cliente;
            CREATE VIEW vw_ventas_por_cliente AS
            SELECT 
                c.id_cliente,
                c.nombre,
                c.tipo,
                COUNT(v.id_venta) as total_compras,
                SUM(v.total) as total_gastado,
                AVG(v.total) as ticket_promedio,
                MAX(v.fecha_venta) as ultima_compra
            FROM clientes c
            JOIN ventas v ON c.id_cliente = v.id_cliente
            WHERE v.estado = 'COMPLETADA'
            GROUP BY c.id_cliente, c.nombre, c.tipo
        `);
        
        console.log('   ✅ Vistas creadas\n');

        // 3. Crear procedimientos almacenados
        console.log('3. Creando procedimientos almacenados...');
        
        await connection.query(`
            DROP PROCEDURE IF EXISTS sp_get_dashboard_metrics;
            DELIMITER //
            CREATE PROCEDURE sp_get_dashboard_metrics()
            BEGIN
                SELECT * FROM vw_dashboard_resumen;
            END //
            DELIMITER ;
            
            DROP PROCEDURE IF EXISTS sp_get_productos_alerta;
            DELIMITER //
            CREATE PROCEDURE sp_get_productos_alerta()
            BEGIN
                SELECT * FROM vw_resumen_productos 
                WHERE estado_stock IN ('SIN STOCK', 'STOCK BAJO')
                ORDER BY estado_stock, stock_actual;
            END //
            DELIMITER ;
            
            DROP PROCEDURE IF EXISTS sp_get_ventas_periodo;
            DELIMITER //
            CREATE PROCEDURE sp_get_ventas_periodo(IN p_dias INT)
            BEGIN
                SELECT 
                    DATE(fecha_venta) as fecha,
                    COUNT(*) as total_ventas,
                    SUM(total) as monto_total
                FROM ventas
                WHERE fecha_venta >= DATE_SUB(CURDATE(), INTERVAL p_dias DAY)
                AND estado = 'COMPLETADA'
                GROUP BY DATE(fecha_venta)
                ORDER BY fecha DESC;
            END //
            DELIMITER ;
        `);
        console.log('   ✅ Procedimientos creados\n');

        // 4. Verificar estado
        console.log('4. Verificando optimización...');
        
        const [tables] = await connection.query(`
            SELECT 
                TABLE_NAME,
                TABLE_ROWS,
                ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as size_mb
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = 'control_stock'
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
            LIMIT 10
        `);
        
        console.log('\n📊 Top 10 tablas por tamaño:');
        console.table(tables);
        
        const [views] = await connection.query(`
            SELECT TABLE_NAME as Vista 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = 'control_stock'
        `);
        
        console.log('\n👁️ Vistas creadas:');
        views.forEach(v => console.log(`   - ${v.Vista}`));
        
        console.log('\n==========================================');
        console.log('✅ ¡OPTIMIZACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('==========================================');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.sql) {
            console.error('SQL:', error.sql.substring(0, 200));
        }
    } finally {
        await connection.end();
    }
};

main();

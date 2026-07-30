const mysql = require('mysql2/promise');

console.log('==========================================');
console.log('🚀 OPTIMIZACIÓN - RAILWAY MYSQL');
console.log('==========================================\n');

const config = {
    host: 'reseau.proxy.rlwy.net',
    port: 23144,
    user: 'root',
    password: 'VdkyqjpCsNOaOgmztkiiSdnCxIEuvuAo', // Contraseña correcta
    database: 'railway',
    multipleStatements: true,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 30000
};

console.log(`📊 Host: ${config.host}:${config.port}`);
console.log(`📊 Database: ${config.database}`);
console.log(`👤 User: ${config.user}\n`);

const main = async () => {
    let connection;
    try {
        console.log('🔄 Conectando a Railway MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ CONEXIÓN EXITOSA!\n');

        // 1. Verificar tablas
        console.log('1. Verificando tablas existentes...');
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'railway'
            AND TABLE_TYPE = 'BASE TABLE'
        `);
        
        if (tables.length === 0) {
            console.log('   ⚠️ No hay tablas. Ejecuta las migraciones primero.');
            return;
        }
        
        console.log(`   ✅ ${tables.length} tablas encontradas\n`);

        // 2. Crear índices
        console.log('2. Creando índices optimizados...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo)',
            'CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre(100))',
            'CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual, stock_minimo)',
            'CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria)',
            'CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(id_proveedor)',
            'CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo)',
            'CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta DESC)',
            'CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(id_cliente)',
            'CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado)',
            'CREATE INDEX IF NOT EXISTS idx_ventas_detalles_venta ON ventas_detalles(id_venta)',
            'CREATE INDEX IF NOT EXISTS idx_ventas_detalles_producto ON ventas_detalles(id_producto)',
            'CREATE INDEX IF NOT EXISTS idx_pedidos_proveedor ON pedidos(id_proveedor)',
            'CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(id_estado)',
            'CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_pedido DESC)',
            'CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(id_producto)',
            'CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_stock(fecha_movimiento DESC)',
            'CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre(100))',
            'CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre(100))',
            'CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(nombre_usuario)'
        ];

        let indexCount = 0;
        for (const query of indexes) {
            try {
                await connection.query(query);
                indexCount++;
            } catch (error) {
                if (!error.message.includes('Duplicate key')) {
                    console.log(`   ⚠️ ${error.message.substring(0, 50)}...`);
                }
            }
        }
        console.log(`   ✅ ${indexCount} índices procesados\n`);

        // 3. Crear vistas
        console.log('3. Creando vistas optimizadas...');
        
        // Vista: Dashboard Resumen
        await connection.query(`DROP VIEW IF EXISTS vw_dashboard_resumen`);
        await connection.query(`
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
        console.log('   ✅ vw_dashboard_resumen');

        // Vista: Resumen Productos
        await connection.query(`DROP VIEW IF EXISTS vw_resumen_productos`);
        await connection.query(`
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
        console.log('   ✅ vw_resumen_productos');

        // Vista: Resumen Ventas Diario
        await connection.query(`DROP VIEW IF EXISTS vw_resumen_ventas_diario`);
        await connection.query(`
            CREATE VIEW vw_resumen_ventas_diario AS
            SELECT 
                DATE(fecha_venta) as fecha,
                COUNT(*) as total_ventas,
                SUM(total) as monto_total
            FROM ventas
            WHERE estado = 'COMPLETADA'
            GROUP BY DATE(fecha_venta)
            ORDER BY fecha DESC
            LIMIT 30
        `);
        console.log('   ✅ vw_resumen_ventas_diario');

        // Vista: Top Productos
        await connection.query(`DROP VIEW IF EXISTS vw_top_productos`);
        await connection.query(`
            CREATE VIEW vw_top_productos AS
            SELECT 
                p.id_producto,
                p.codigo,
                p.nombre,
                COUNT(vd.id_detalle) as veces_vendido,
                SUM(vd.cantidad) as total_unidades,
                SUM(vd.subtotal) as total_ingresos
            FROM productos p
            JOIN ventas_detalles vd ON p.id_producto = vd.id_producto
            JOIN ventas v ON vd.id_venta = v.id_venta
            WHERE v.estado = 'COMPLETADA'
            GROUP BY p.id_producto, p.codigo, p.nombre
            ORDER BY total_unidades DESC
            LIMIT 10
        `);
        console.log('   ✅ vw_top_productos');

        console.log('\n4. Verificando vistas...');
        const [views] = await connection.query(`
            SELECT TABLE_NAME as Vista 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = 'railway'
        `);
        
        if (views.length > 0) {
            console.log('   📊 Vistas creadas:');
            views.forEach(v => console.log(`      - ${v.Vista}`));
        }

        console.log('\n5. Probando vistas...');
        try {
            const [result] = await connection.query('SELECT * FROM vw_dashboard_resumen');
            const data = result[0] || {};
            console.log('   ✅ Dashboard resumen:');
            console.log(`      - Total productos: ${data.total_productos || 0}`);
            console.log(`      - Sin stock: ${data.sin_stock || 0}`);
            console.log(`      - Stock bajo: ${data.stock_bajo || 0}`);
            console.log(`      - Ventas hoy: ${data.ventas_hoy || 0}`);
            console.log(`      - Ventas hoy monto: $${data.ventas_hoy_monto || 0}`);
            console.log(`      - Pedidos pendientes: ${data.pedidos_pendientes || 0}`);
        } catch (error) {
            console.log(`   ⚠️ ${error.message}`);
        }

        console.log('\n==========================================');
        console.log('✅ ¡OPTIMIZACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('==========================================');
        console.log('\n📝 Vistas disponibles para el frontend:');
        console.log('   - vw_dashboard_resumen (Dashboard principal)');
        console.log('   - vw_resumen_productos (Lista de productos con stock)');
        console.log('   - vw_resumen_ventas_diario (Ventas diarias)');
        console.log('   - vw_top_productos (Top 10 productos más vendidos)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Contraseña incorrecta. Verifica que sea:');
            console.error('   VdkyqjpCsNOaOgmztkiiSdnCxIEuvuAo');
        }
    } finally {
        if (connection) await connection.end();
    }
};

main();

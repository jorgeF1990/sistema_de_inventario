const mysql = require('mysql2/promise');

console.log('==========================================');
console.log('OPTIMIZACIÓN - RAILWAY MYSQL');
console.log('==========================================\n');

const config = {
    host: 'reseau.proxy.rlwy.net',
    port: 23144,
    user: 'root',
    password: 'VdkyqjpCsNOaOgmztkiisdnCxIEuvuAo',
    database: 'railway',
    multipleStatements: true,
    connectTimeout: 30000,
    ssl: {
        rejectUnauthorized: false
    }
};

console.log(`📊 Host: ${config.host}:${config.port}`);
console.log(`📊 Database: ${config.database}\n`);

const main = async () => {
    let connection;
    try {
        console.log('🔄 Conectando a Railway MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ Conexión exitosa!\n');

        // 1. Verificar tablas existentes
        console.log('1. Verificando tablas...');
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'railway'
            AND TABLE_TYPE = 'BASE TABLE'
        `);
        
        if (tables.length === 0) {
            console.log('   ⚠️ No hay tablas en la base de datos. Asegúrate de que las migraciones estén ejecutadas.');
            return;
        }
        
        console.log(`   ✅ ${tables.length} tablas encontradas\n`);

        // 2. Crear índices
        console.log('2. Creando índices optimizados...');
        const indexQueries = [
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

        for (const query of indexQueries) {
            try {
                await connection.query(query);
            } catch (error) {
                // Ignorar errores de índices que ya existen
                if (!error.message.includes('Duplicate key name')) {
                    console.log(`   ⚠️ ${error.message.substring(0, 60)}...`);
                }
            }
        }
        console.log('   ✅ Índices procesados\n');

        // 3. Crear vistas
        console.log('3. Creando vistas optimizadas...');
        
        const viewQueries = [
            `DROP VIEW IF EXISTS vw_dashboard_resumen`,
            `CREATE VIEW vw_dashboard_resumen AS
            SELECT 
                (SELECT COUNT(*) FROM productos WHERE activo = 1) as total_productos,
                (SELECT COUNT(*) FROM productos WHERE stock_actual = 0 AND activo = 1) as sin_stock,
                (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo AND stock_actual > 0 AND activo = 1) as stock_bajo,
                (SELECT COUNT(*) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND estado = 'COMPLETADA') as ventas_hoy,
                (SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND estado = 'COMPLETADA') as ventas_hoy_monto,
                (SELECT COUNT(*) FROM pedidos WHERE id_estado = 1) as pedidos_pendientes,
                NOW() as ultima_actualizacion`,
            
            `DROP VIEW IF EXISTS vw_resumen_productos`,
            `CREATE VIEW vw_resumen_productos AS
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
            WHERE p.activo = 1`,
            
            `DROP VIEW IF EXISTS vw_resumen_ventas_diario`,
            `CREATE VIEW vw_resumen_ventas_diario AS
            SELECT 
                DATE(fecha_venta) as fecha,
                COUNT(*) as total_ventas,
                SUM(total) as monto_total
            FROM ventas
            WHERE estado = 'COMPLETADA'
            GROUP BY DATE(fecha_venta)
            ORDER BY fecha DESC`,
            
            `DROP VIEW IF EXISTS vw_ventas_por_cliente`,
            `CREATE VIEW vw_ventas_por_cliente AS
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
            GROUP BY c.id_cliente, c.nombre, c.tipo`
        ];

        for (const query of viewQueries) {
            try {
                await connection.query(query);
            } catch (error) {
                console.log(`   ⚠️ ${error.message.substring(0, 60)}...`);
            }
        }
        console.log('   ✅ Vistas creadas\n');

        // 4. Verificar vistas
        console.log('4. Verificando vistas...');
        const [views] = await connection.query(`
            SELECT TABLE_NAME as Vista 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = 'railway'
        `);
        
        if (views.length > 0) {
            console.log('   📊 Vistas creadas:');
            views.forEach(v => console.log(`      - ${v.Vista}`));
        } else {
            console.log('   ⚠️ No se encontraron vistas');
        }

        // 5. Probar las vistas
        console.log('\n5. Probando vistas...');
        try {
            const [result] = await connection.query('SELECT * FROM vw_dashboard_resumen');
            console.log('   ✅ Dashboard resumen:', result[0] || 'Sin datos');
        } catch (error) {
            console.log(`   ⚠️ Error probando vw_dashboard_resumen: ${error.message}`);
        }

        console.log('\n==========================================');
        console.log('✅ ¡OPTIMIZACIÓN COMPLETADA!');
        console.log('==========================================');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Contraseña incorrecta. Verifica las credenciales.');
        }
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 No se pudo conectar. Verifica que el host y puerto sean correctos.');
        }
    } finally {
        if (connection) await connection.end();
    }
};

main();

const mysql = require('mysql2/promise');

console.log('==========================================');
console.log('🚀 OPTIMIZACIÓN FINAL - RAILWAY MYSQL');
console.log('==========================================\n');

const config = {
    host: 'reseau.proxy.rlwy.net',
    port: 23144,
    user: 'root',
    password: 'VdkyqjpCsNOaOgmztkiiSdnCxIEuvuAo',
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
        connection = await mysql.createConnection(config);
        console.log('✅ CONEXIÓN EXITOSA!\n');

        // 1. Verificar tablas
        console.log('1. Verificando tablas...');
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'railway'
            AND TABLE_TYPE = 'BASE TABLE'
        `);
        console.log(`   ✅ ${tables.length} tablas encontradas\n`);

        // 2. Crear índices (sintaxis correcta para MySQL)
        console.log('2. Creando índices optimizados...');
        const indexes = [
            // Productos
            { name: 'idx_productos_codigo', sql: 'CREATE INDEX idx_productos_codigo ON productos(codigo)' },
            { name: 'idx_productos_nombre', sql: 'CREATE INDEX idx_productos_nombre ON productos(nombre(100))' },
            { name: 'idx_productos_stock', sql: 'CREATE INDEX idx_productos_stock ON productos(stock_actual, stock_minimo)' },
            { name: 'idx_productos_categoria', sql: 'CREATE INDEX idx_productos_categoria ON productos(id_categoria)' },
            { name: 'idx_productos_proveedor', sql: 'CREATE INDEX idx_productos_proveedor ON productos(id_proveedor)' },
            { name: 'idx_productos_activo', sql: 'CREATE INDEX idx_productos_activo ON productos(activo)' },
            // Ventas
            { name: 'idx_ventas_fecha', sql: 'CREATE INDEX idx_ventas_fecha ON ventas(fecha_venta DESC)' },
            { name: 'idx_ventas_cliente', sql: 'CREATE INDEX idx_ventas_cliente ON ventas(id_cliente)' },
            { name: 'idx_ventas_estado', sql: 'CREATE INDEX idx_ventas_estado ON ventas(id_estado)' },
            { name: 'idx_ventas_factura', sql: 'CREATE INDEX idx_ventas_factura ON ventas(numero_factura)' },
            // Ventas Detalles
            { name: 'idx_ventas_detalles_venta', sql: 'CREATE INDEX idx_ventas_detalles_venta ON ventas_detalles(id_venta)' },
            { name: 'idx_ventas_detalles_producto', sql: 'CREATE INDEX idx_ventas_detalles_producto ON ventas_detalles(id_producto)' },
            // Pedidos
            { name: 'idx_pedidos_proveedor', sql: 'CREATE INDEX idx_pedidos_proveedor ON pedidos(id_proveedor)' },
            { name: 'idx_pedidos_estado', sql: 'CREATE INDEX idx_pedidos_estado ON pedidos(id_estado)' },
            { name: 'idx_pedidos_fecha', sql: 'CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_pedido DESC)' },
            // Movimientos Stock
            { name: 'idx_movimientos_producto', sql: 'CREATE INDEX idx_movimientos_producto ON movimientos_stock(id_producto)' },
            { name: 'idx_movimientos_fecha', sql: 'CREATE INDEX idx_movimientos_fecha ON movimientos_stock(fecha_movimiento DESC)' },
            // Clientes
            { name: 'idx_clientes_nombre', sql: 'CREATE INDEX idx_clientes_nombre ON clientes(nombre(100))' },
            // Proveedores
            { name: 'idx_proveedores_nombre', sql: 'CREATE INDEX idx_proveedores_nombre ON proveedores(nombre(100))' },
            // Usuarios
            { name: 'idx_usuarios_username', sql: 'CREATE INDEX idx_usuarios_username ON usuarios(nombre_usuario)' },
            // Compuestos
            { name: 'idx_ventas_fecha_estado', sql: 'CREATE INDEX idx_ventas_fecha_estado ON ventas(fecha_venta, id_estado)' },
        ];

        let indexCount = 0;
        for (const idx of indexes) {
            try {
                await connection.query(idx.sql);
                indexCount++;
                console.log(`   ✅ ${idx.name}`);
            } catch (error) {
                if (error.message.includes('Duplicate key') || error.message.includes('already exists')) {
                    console.log(`   ⏭️ ${idx.name} (ya existe)`);
                } else {
                    console.log(`   ⚠️ ${idx.name}: ${error.message.substring(0, 50)}...`);
                }
            }
        }
        console.log(`   ✅ ${indexCount} índices creados\n`);

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
                (SELECT COUNT(*) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND id_estado = 2) as ventas_hoy,
                (SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(fecha_venta) = CURDATE() AND id_estado = 2) as ventas_hoy_monto,
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
                SUM(total) as monto_total,
                AVG(total) as ticket_promedio
            FROM ventas
            WHERE id_estado = 2
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
            WHERE v.id_estado = 2
            GROUP BY p.id_producto, p.codigo, p.nombre
            ORDER BY total_unidades DESC
            LIMIT 10
        `);
        console.log('   ✅ vw_top_productos');

        // Vista: Ventas por Cliente
        await connection.query(`DROP VIEW IF EXISTS vw_ventas_por_cliente`);
        await connection.query(`
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
            WHERE v.id_estado = 2
            GROUP BY c.id_cliente, c.nombre, c.tipo
        `);
        console.log('   ✅ vw_ventas_por_cliente');

        // 4. Verificar vistas
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

        // 5. Probar vistas
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
        console.log('   - vw_resumen_productos (Productos con stock)');
        console.log('   - vw_resumen_ventas_diario (Ventas diarias)');
        console.log('   - vw_top_productos (Top 10 productos)');
        console.log('   - vw_ventas_por_cliente (Ventas por cliente)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
};

main();

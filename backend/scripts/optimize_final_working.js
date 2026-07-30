const mysql = require('mysql2/promise');

console.log('==========================================');
console.log('🚀 OPTIMIZACIÓN FINAL - VISTAS FUNCIONALES');
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

        // 1. Verificar qué tablas existen
        console.log('1. Verificando tablas existentes...');
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'railway'
            AND TABLE_TYPE = 'BASE TABLE'
        `);
        
        const tableNames = tables.map(t => t.TABLE_NAME);
        console.log(`   Tablas encontradas: ${tableNames.join(', ')}\n`);

        // 2. Crear/Actualizar vistas que funcionan
        console.log('2. Creando/Actualizando vistas...');
        
        // Vista: Dashboard Resumen (YA FUNCIONA)
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

        // Vista: Resumen Productos (YA FUNCIONA)
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

        // Vista: Resumen Ventas Diario (YA FUNCIONA)
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

        // Vista: Ventas por Cliente (si existe la tabla clientes)
        if (tableNames.includes('clientes')) {
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
        }

        // Vista: Productos con alertas de stock
        await connection.query(`DROP VIEW IF EXISTS vw_stock_alertas`);
        await connection.query(`
            CREATE VIEW vw_stock_alertas AS
            SELECT 
                id_producto,
                codigo,
                nombre,
                stock_actual,
                stock_minimo,
                estado_stock
            FROM vw_resumen_productos
            WHERE estado_stock IN ('SIN STOCK', 'STOCK BAJO')
            ORDER BY estado_stock, stock_actual
        `);
        console.log('   ✅ vw_stock_alertas');

        // 3. Verificar vistas
        console.log('\n3. Verificando vistas...');
        const [views] = await connection.query(`
            SELECT TABLE_NAME as Vista 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = 'railway'
        `);
        
        if (views.length > 0) {
            console.log('   📊 Vistas disponibles:');
            views.forEach(v => console.log(`      - ${v.Vista}`));
        }

        // 4. Probar vistas
        console.log('\n4. Probando vistas...');
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
        console.log('✅ ¡OPTIMIZACIÓN COMPLETADA!');
        console.log('==========================================');
        console.log('\n📝 VISTAS DISPONIBLES PARA EL FRONTEND:');
        console.log('   1. vw_dashboard_resumen - Datos del dashboard');
        console.log('   2. vw_resumen_productos - Productos con stock');
        console.log('   3. vw_resumen_ventas_diario - Ventas diarias');
        console.log('   4. vw_stock_alertas - Alertas de stock');
        console.log('   5. vw_ventas_por_cliente - Ventas por cliente');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
};

main();

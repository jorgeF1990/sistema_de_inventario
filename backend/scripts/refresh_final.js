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

const main = async () => {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Conectado a Railway\n');

        const views = [
            'vw_dashboard_resumen',
            'vw_resumen_productos',
            'vw_resumen_ventas_diario',
            'vw_top_productos'
        ];

        for (const view of views) {
            console.log(`   Actualizando ${view}...`);
            // Recrear la vista para forzar actualización
            await connection.query(`CREATE OR REPLACE VIEW ${view} AS SELECT * FROM ${view}`);
            console.log(`   ✅ ${view} actualizada`);
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

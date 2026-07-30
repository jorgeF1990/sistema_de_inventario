// scripts/refresh_views.js
const { Pool } = require('pg');
const readline = require('readline');

const askPassword = () => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.stdoutMuted = true;
        rl.question('Ingresa la contraseña de PostgreSQL: ', (password) => {
            rl.close();
            resolve(password);
        });
        rl._writeToOutput = function _writeToOutput(stringToWrite) {
            if (rl.stdoutMuted)
                rl.output.write('*');
            else
                rl.output.write(stringToWrite);
        };
    });
};

const views = [
    'mv_resumen_ventas_diario',
    'mv_resumen_productos',
    'mv_top_productos_vendidos',
    'mv_resumen_pedidos',
    'mv_movimientos_stock',
    'mv_dashboard_resumen',
    'mv_ventas_por_cliente'
];

const main = async () => {
    console.log('==========================================');
    console.log('Actualizando vistas materializadas...');
    console.log('==========================================');
    
    const password = await askPassword();
    console.log('\nConectando a PostgreSQL...');
    
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'stock_db',
        user: 'postgres',
        password: password,
    });
    
    try {
        let count = 0;
        for (const view of views) {
            count++;
            console.log(`${count}. Actualizando ${view}...`);
            await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view};`);
            console.log(`   ✓ ${view} actualizada`);
        }
        
        console.log('\n==========================================');
        console.log('¡Vistas actualizadas correctamente!');
        console.log('==========================================');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
};

main();
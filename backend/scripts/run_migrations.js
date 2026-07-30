// scripts/run_migrations.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuración
const config = {
    host: 'localhost',
    port: 5432,
    database: 'stock_db',
    user: 'postgres',
    password: '', // Se pedirá interactivamente
};

// Función para pedir contraseña de forma segura
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

// Función para ejecutar archivo SQL
const executeSQLFile = async (pool, filePath) => {
    const sql = fs.readFileSync(filePath, 'utf8');
    // Dividir en statements (separados por ;)
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
        try {
            await pool.query(statement);
        } catch (error) {
            console.error(`Error ejecutando: ${statement.substring(0, 100)}...`);
            console.error(error.message);
            // Continuar con el siguiente statement
        }
    }
};

const main = async () => {
    console.log('==========================================');
    console.log('OPTIMIZACIÓN DE BASE DE DATOS');
    console.log('==========================================');
    
    config.password = await askPassword();
    console.log('\nConectando a PostgreSQL...');
    
    const pool = new Pool(config);
    
    try {
        // 1. Crear índices
        console.log('\n1. Creando índices optimizados...');
        await executeSQLFile(pool, path.join(__dirname, 'create_indexes.sql'));
        console.log('   ✓ Índices creados');
        
        // 2. Crear vistas materializadas
        console.log('\n2. Creando vistas materializadas...');
        await executeSQLFile(pool, path.join(__dirname, 'create_optimized_views.sql'));
        console.log('   ✓ Vistas creadas');
        
        // 3. Crear funciones
        console.log('\n3. Creando funciones optimizadas...');
        await executeSQLFile(pool, path.join(__dirname, 'create_optimized_functions.sql'));
        console.log('   ✓ Funciones creadas');
        
        // 4. Actualizar estadísticas
        console.log('\n4. Actualizando estadísticas...');
        await pool.query('ANALYZE;');
        console.log('   ✓ Estadísticas actualizadas');
        
        // 5. Vacuum
        console.log('\n5. Ejecutando VACUUM ANALYZE...');
        await pool.query('VACUUM ANALYZE;');
        console.log('   ✓ Vacuum completado');
        
        // Mostrar tamaño de las vistas
        console.log('\n==========================================');
        console.log('¡OPTIMIZACIÓN COMPLETADA!');
        console.log('==========================================');
        
        const views = await pool.query(`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables
            WHERE tablename LIKE 'mv_%'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        `);
        
        console.log('\nTamaño de las vistas materializadas:');
        console.table(views.rows);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
};

main();
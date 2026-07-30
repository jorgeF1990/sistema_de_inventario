#!/bin/bash
# run_optimization.sh - Script para Windows con Node.js

echo "=========================================="
echo "OPTIMIZACIÓN DE BASE DE DATOS"
echo "=========================================="

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
fi

# Ejecutar migración
echo ""
echo "Ejecutando migración de base de datos..."
node run_migrations.js

echo ""
echo "=========================================="
echo "¡PROCESO COMPLETADO!"
echo "=========================================="
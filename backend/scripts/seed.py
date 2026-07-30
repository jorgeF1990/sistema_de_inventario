#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para cargar datos de prueba adicionales
"""

import os
import sys
import mysql.connector
from dotenv import load_dotenv
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

def get_db_config():
    """Obtiene configuracion segun entorno"""
    is_railway = os.getenv('RAILWAY_ENVIRONMENT') is not None
    
    if is_railway:
        return {
            'host': os.getenv('DB_HOST', 'mysql.railway.internal'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_NAME', 'railway'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
    else:
        return {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'control_stock'),
            'port': int(os.getenv('DB_PORT', 3306))
        }

def seed_database():
    """Carga datos de prueba en la base de datos"""
    
    print("=" * 60)
    print("CARGANDO DATOS DE PRUEBA")
    print("=" * 60)
    
    try:
        config = get_db_config()
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Verificar si ya hay datos
        cursor.execute("SELECT COUNT(*) FROM productos WHERE id_empresa = 1")
        count = cursor.fetchone()[0]
        
        if count > 14:
            print(f"Ya existen {count} productos. Saltando seed...")
            cursor.close()
            conn.close()
            return
        
        print("Cargando datos de prueba...")
        
        # Productos adicionales
        productos_extra = [
            ('PA002', 'Pan Integral', 7, None, 60.00, 90.00, 10, 8, 1),
            ('FI002', 'Queso Cremoso 500g', 6, 2, 350.00, 520.00, 8, 6, 1),
            ('LA003', 'Leche Descremada 1L', 5, 2, 100.00, 160.00, 12, 10, 1),
            ('LM003', 'Desinfectante 500ml', 3, 3, 120.00, 190.00, 25, 10, 1),
            ('PF003', 'Crema Dental 100ml', 4, 3, 200.00, 320.00, 15, 5, 1),
            ('BE001', 'Cerveza 1L', 1, 1, 150.00, 220.00, 20, 10, 1),
            ('BE002', 'Jugo Natural 1L', 1, 1, 90.00, 140.00, 30, 15, 1),
        ]
        
        for p in productos_extra:
            cursor.execute("""
                INSERT IGNORE INTO productos 
                (codigo, nombre, id_categoria, id_proveedor, precio_compra, 
                 precio_venta, stock_actual, stock_minimo, id_empresa)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, p)
        
        conn.commit()
        
        print(f"Se cargaron {len(productos_extra)} productos de prueba adicionales")
        
        # Mostrar resumen
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN stock_actual <= 0 THEN 1 ELSE 0 END) as sin_stock,
                SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > 0 THEN 1 ELSE 0 END) as stock_bajo
            FROM productos
            WHERE id_empresa = 1 AND activo = TRUE
        """)
        resumen = cursor.fetchone()
        
        print(f"\nResumen de stock:")
        print(f"  Total productos: {resumen[0]}")
        print(f"  Sin stock: {resumen[1]}")
        print(f"  Stock bajo: {resumen[2]}")
        
        cursor.close()
        conn.close()
        
        print("\nDatos de prueba cargados exitosamente!")
        
    except Exception as e:
        print(f"Error al cargar datos: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    seed_database()

# -*- coding: utf-8 -*-
"""
Rutas para el Dashboard
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import logging

from ..database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/datos")
async def get_dashboard_data():
    """
    Obtiene todos los datos necesarios para el dashboard
    """
    try:
        with get_db() as (conn, cursor):
            # 1. Resumen de ventas del dia
            cursor.execute("""
                SELECT 
                    COALESCE(COUNT(*), 0) as total_ventas,
                    COALESCE(SUM(total), 0) as monto_total,
                    COALESCE(AVG(total), 0) as promedio
                FROM ventas
                WHERE DATE(fecha_venta) = CURDATE()
                AND id_estado = 2
            """)
            ventas_hoy = cursor.fetchone()
            
            # 2. Productos con alerta
            cursor.execute("""
                SELECT COUNT(*) as total, estado_stock
                FROM vw_stock_alertas
                WHERE estado_stock != 'NORMAL'
                GROUP BY estado_stock
            """)
            alertas = cursor.fetchall()
            
            alertas_dict = {"SIN STOCK": 0, "STOCK BAJO": 0}
            for a in alertas:
                alertas_dict[a['estado_stock']] = a['total']
            
            # 3. Pedidos pendientes
            cursor.execute("""
                SELECT COUNT(*) as total FROM pedidos WHERE id_estado IN (1, 2)
            """)
            pedidos = cursor.fetchone()
            
            # 4. Ultimas ventas (5)
            cursor.execute("""
                SELECT 
                    id_venta, numero_factura, cliente_nombre, 
                    total, fecha_venta
                FROM ventas
                WHERE id_estado = 2
                ORDER BY fecha_venta DESC
                LIMIT 5
            """)
            ultimas_ventas = cursor.fetchall()
            
            # 5. Top 5 productos con stock bajo
            cursor.execute("""
                SELECT id_producto, codigo, nombre, stock_actual, stock_minimo
                FROM vw_stock_alertas
                WHERE estado_stock != 'NORMAL'
                ORDER BY 
                    CASE estado_stock
                        WHEN 'SIN STOCK' THEN 1
                        WHEN 'STOCK BAJO' THEN 2
                    END,
                    stock_actual
                LIMIT 5
            """)
            productos_alerta = cursor.fetchall()
            
            # 6. Ventas ultimos 7 dias
            cursor.execute("""
                SELECT 
                    DATE(fecha_venta) as fecha,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(total), 0) as total
                FROM ventas
                WHERE fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                AND id_estado = 2
                GROUP BY DATE(fecha_venta)
                ORDER BY fecha
            """)
            ventas_semana = cursor.fetchall()
            
            return {
                "ventas_hoy": {
                    "total_ventas": ventas_hoy['total_ventas'] if ventas_hoy else 0,
                    "monto_total": float(ventas_hoy['monto_total']) if ventas_hoy else 0,
                    "promedio": float(ventas_hoy['promedio']) if ventas_hoy else 0
                },
                "alertas": alertas_dict,
                "pedidos_pendientes": pedidos['total'] if pedidos else 0,
                "ultimas_ventas": ultimas_ventas,
                "productos_alerta": productos_alerta,
                "ventas_semana": ventas_semana
            }
            
    except Exception as e:
        logger.error(f"Error al obtener datos del dashboard: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener datos: {str(e)}"
        )
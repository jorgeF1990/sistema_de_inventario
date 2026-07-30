# -*- coding: utf-8 -*-
"""
Controlador de Reportes - Optimizado con índices
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from api.database.connection import get_connection

logger = logging.getLogger(__name__)

class ReporteController:
    
    @staticmethod
    def get_movimientos_stock(id_producto: Optional[int] = None, dias: int = 90) -> List[Dict[str, Any]]:
        """Obtiene todos los movimientos de stock con datos del producto"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            fecha_limite = datetime.now() - timedelta(days=dias)
            
            if id_producto:
                query = """
                    SELECT 
                        m.id_movimiento,
                        m.id_producto,
                        m.id_tipo_movimiento,
                        m.cantidad,
                        m.stock_antes,
                        m.stock_despues,
                        m.referencia_tipo,
                        m.referencia_id,
                        m.observacion,
                        m.fecha,
                        m.usuario,
                        p.nombre as producto_nombre,
                        p.codigo as producto_codigo,
                        tm.nombre as tipo_movimiento_nombre
                    FROM movimientos_stock m
                    JOIN productos p ON m.id_producto = p.id_producto
                    JOIN tipos_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
                    WHERE m.id_producto = %s AND m.fecha >= %s
                    ORDER BY m.fecha DESC
                    LIMIT 500
                """
                cursor.execute(query, (id_producto, fecha_limite))
            else:
                query = """
                    SELECT 
                        m.id_movimiento,
                        m.id_producto,
                        m.id_tipo_movimiento,
                        m.cantidad,
                        m.stock_antes,
                        m.stock_despues,
                        m.referencia_tipo,
                        m.referencia_id,
                        m.observacion,
                        m.fecha,
                        m.usuario,
                        p.nombre as producto_nombre,
                        p.codigo as producto_codigo,
                        tm.nombre as tipo_movimiento_nombre
                    FROM movimientos_stock m
                    JOIN productos p ON m.id_producto = p.id_producto
                    JOIN tipos_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
                    WHERE m.fecha >= %s
                    ORDER BY m.fecha DESC
                    LIMIT 500
                """
                cursor.execute(query, (fecha_limite,))
            
            resultados = cursor.fetchall()
            logger.info(f"Se encontraron {len(resultados)} movimientos")
            return resultados
            
        except Exception as e:
            logger.error(f"Error al obtener movimientos: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_ventas_por_periodo(fecha_inicio: str, fecha_fin: str) -> List[Dict[str, Any]]:
        """Obtiene ventas agrupadas por día en un período"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT 
                    DATE(fecha_venta) as fecha,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(total), 0) as total
                FROM ventas
                WHERE DATE(fecha_venta) BETWEEN %s AND %s
                AND id_estado = 2
                GROUP BY DATE(fecha_venta)
                ORDER BY fecha
            """, (fecha_inicio, fecha_fin))
            
            resultados = cursor.fetchall()
            return resultados
            
        except Exception as e:
            logger.error(f"Error al obtener ventas por período: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_productos_mas_vendidos(limite: int = 10) -> List[Dict[str, Any]]:
        """Obtiene los productos más vendidos"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT 
                    p.id_producto,
                    p.codigo,
                    p.nombre,
                    COALESCE(SUM(dv.cantidad), 0) AS total_vendido,
                    COUNT(DISTINCT dv.id_venta) AS numero_ventas,
                    COALESCE(SUM(dv.subtotal), 0) AS ingreso_total
                FROM productos p
                LEFT JOIN detalles_venta dv ON p.id_producto = dv.id_producto
                LEFT JOIN ventas v ON dv.id_venta = v.id_venta AND v.id_estado = 2
                WHERE p.activo = TRUE
                GROUP BY p.id_producto, p.codigo, p.nombre
                HAVING total_vendido > 0
                ORDER BY total_vendido DESC
                LIMIT %s
            """, (limite,))
            
            resultados = cursor.fetchall()
            return resultados
            
        except Exception as e:
            logger.error(f"Error en get_productos_mas_vendidos: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
# -*- coding: utf-8 -*-
"""
Servicio de Ventas - Logica de negocio
"""

import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

from ..database.connection import get_db
from ..models.venta import VentaRequest

logger = logging.getLogger(__name__)

class VentaService:
    """Servicio de gestion de ventas"""
    
    @staticmethod
    def registrar_venta(venta_data: VentaRequest) -> Dict[str, Any]:
        """Registra una nueva venta"""
        with get_db() as (conn, cursor):
            conn.start_transaction()
            
            # Generar numero de factura
            numero_factura = f"F{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Calcular totales
            subtotal = sum(d.cantidad * d.precio_unitario for d in venta_data.detalles)
            iva = subtotal * 0.21
            total = subtotal + iva
            
            # Insertar cabecera
            cursor.execute("""
                INSERT INTO ventas 
                (numero_factura, cliente_nombre, subtotal, iva, total, usuario, id_estado)
                VALUES (%s, %s, %s, %s, %s, %s, 2)
            """, (numero_factura, venta_data.cliente_nombre, subtotal, iva, total, venta_data.usuario))
            
            id_venta = cursor.lastrowid
            
            # Procesar detalles
            for detalle in venta_data.detalles:
                # Verificar stock
                cursor.execute(
                    "SELECT stock_actual FROM productos WHERE id_producto = %s FOR UPDATE",
                    (detalle.id_producto,)
                )
                stock = cursor.fetchone()
                
                if not stock or stock['stock_actual'] < detalle.cantidad:
                    raise ValueError(f"Stock insuficiente para producto ID {detalle.id_producto}")
                
                stock_actual = stock['stock_actual']
                stock_nuevo = stock_actual - detalle.cantidad
                
                # Insertar detalle
                cursor.execute("""
                    INSERT INTO detalles_venta 
                    (id_venta, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                """, (id_venta, detalle.id_producto, detalle.cantidad, 
                      detalle.precio_unitario, detalle.cantidad * detalle.precio_unitario))
                
                # Actualizar stock
                cursor.execute("""
                    UPDATE productos SET stock_actual = %s WHERE id_producto = %s
                """, (stock_nuevo, detalle.id_producto))
                
                # Registrar movimiento
                cursor.execute("""
                    INSERT INTO movimientos_stock 
                    (id_producto, id_tipo_movimiento, cantidad, stock_antes, stock_despues,
                     referencia_tipo, referencia_id, usuario, observacion)
                    VALUES (%s, 1, %s, %s, %s, 'venta', %s, %s, 'Venta registrada')
                """, (detalle.id_producto, -detalle.cantidad, stock_actual, 
                      stock_nuevo, id_venta, venta_data.usuario))
            
            conn.commit()
            
            # Obtener venta registrada
            cursor.execute("""
                SELECT v.*, COUNT(dv.id_detalle) as cantidad_productos
                FROM ventas v
                LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
                WHERE v.id_venta = %s
                GROUP BY v.id_venta
            """, (id_venta,))
            
            logger.info(f"Venta registrada: {numero_factura} - Total: ${total:.2f}")
            return cursor.fetchone()
    
    @staticmethod
    def get_ventas_hoy() -> List[Dict[str, Any]]:
        """Obtiene ventas del dia"""
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT v.*, COUNT(dv.id_detalle) as cantidad_productos
                FROM ventas v
                LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
                WHERE DATE(v.fecha_venta) = CURDATE()
                GROUP BY v.id_venta
                ORDER BY v.fecha_venta DESC
            """)
            return cursor.fetchall()
    
    @staticmethod
    def get_resumen_dia() -> Dict[str, Any]:
        """Obtiene resumen del dia"""
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    COALESCE(COUNT(*), 0) as total_ventas,
                    COALESCE(SUM(total), 0) as monto_total,
                    COALESCE(AVG(total), 0) as promedio_venta,
                    COALESCE(MAX(total), 0) as venta_maxima
                FROM ventas
                WHERE DATE(fecha_venta) = CURDATE()
                AND id_estado = 2
            """)
            return cursor.fetchone()
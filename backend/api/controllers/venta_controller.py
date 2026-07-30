# -*- coding: utf-8 -*-
"""
Controlador de Ventas - Optimizado con manejo de errores profesional
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from api.database.connection import get_connection
from api.models import Venta, DetalleVenta

logger = logging.getLogger(__name__)

class VentaController:
    @staticmethod
    def registrar_venta(venta: Venta) -> Venta:
        """
        Registra una nueva venta en el sistema
        
        Args:
            venta: Objeto Venta con todos los datos necesarios
            
        Returns:
            Venta: La venta registrada con el ID generado
            
        Raises:
            ValueError: Si hay problemas con los datos
            Exception: Errores de base de datos
        """
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor()
            
            # Iniciar transacción
            conexion.start_transaction()
            
            # Verificar que hay detalles
            if not venta.detalles:
                raise ValueError("La venta debe tener al menos un producto")
            
            subtotal = venta.subtotal
            iva = venta.iva
            total = venta.total
            
            # Insertar cabecera de venta
            cursor.execute("""
                INSERT INTO ventas (numero_factura, cliente_nombre, subtotal, iva, total, usuario, id_estado, fecha_venta)
                VALUES (%s, %s, %s, %s, %s, %s, 2, NOW())
            """, (venta.numero_factura, venta.cliente_nombre, subtotal, iva, total, venta.usuario))
            
            venta.id_venta = cursor.lastrowid
            
            # Procesar cada detalle
            for detalle in venta.detalles:
                # Verificar stock disponible
                cursor.execute(
                    "SELECT stock_actual FROM productos WHERE id_producto = %s FOR UPDATE",
                    (detalle.id_producto,)
                )
                resultado = cursor.fetchone()
                if not resultado:
                    raise ValueError(f"Producto con ID {detalle.id_producto} no encontrado")
                
                stock_actual = resultado[0]
                if stock_actual < detalle.cantidad:
                    raise ValueError(
                        f"Stock insuficiente para producto {detalle.id_producto}. "
                        f"Disponible: {stock_actual}, Requerido: {detalle.cantidad}"
                    )
                
                # Insertar detalle de venta
                cursor.execute("""
                    INSERT INTO detalles_venta (id_venta, id_producto, cantidad, 
                                                precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                """, (venta.id_venta, detalle.id_producto, detalle.cantidad,
                      detalle.precio_unitario, detalle.subtotal))
                
                # Actualizar stock
                stock_nuevo = stock_actual - detalle.cantidad
                cursor.execute("""
                    UPDATE productos 
                    SET stock_actual = %s 
                    WHERE id_producto = %s
                """, (stock_nuevo, detalle.id_producto))
                
                # Registrar movimiento de stock
                cursor.execute("""
                    INSERT INTO movimientos_stock (id_producto, id_tipo_movimiento, cantidad,
                                                   stock_antes, stock_despues, referencia_tipo,
                                                   referencia_id, usuario, fecha, observacion)
                    VALUES (%s, 1, %s, %s, %s, 'venta', %s, %s, NOW(), %s)
                """, (detalle.id_producto, -detalle.cantidad, stock_actual, stock_nuevo, 
                      venta.id_venta, venta.usuario, f"Venta a {venta.cliente_nombre}"))
            
            # Confirmar transacción
            conexion.commit()
            logger.info(f"Venta {venta.numero_factura} registrada - Total: ${total:.2f}")
            return venta
            
        except ValueError as e:
            if conexion:
                conexion.rollback()
            logger.warning(f"Error de validación en venta: {e}")
            raise
        except Exception as e:
            if conexion:
                conexion.rollback()
            logger.error(f"Error al registrar venta: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_ventas_hoy() -> List[Dict[str, Any]]:
        """Obtiene las ventas del día actual"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT v.*, 
                       COUNT(dv.id_detalle) as cantidad_productos
                FROM ventas v
                LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
                WHERE DATE(v.fecha_venta) = CURDATE()
                GROUP BY v.id_venta
                ORDER BY v.fecha_venta DESC
            """)
            
            ventas = cursor.fetchall()
            return ventas
            
        except Exception as e:
            logger.error(f"Error al obtener ventas de hoy: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_resumen_dia() -> Dict[str, Any]:
        """Obtiene el resumen de ventas del día"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT 
                    COALESCE(COUNT(*), 0) as total_ventas,
                    COALESCE(SUM(total), 0) as monto_total,
                    COALESCE(AVG(total), 0) as promedio_venta
                FROM ventas
                WHERE DATE(fecha_venta) = CURDATE()
                AND id_estado = 2
            """)
            
            resultado = cursor.fetchone()
            
            if not resultado or resultado['total_ventas'] is None:
                return {'total_ventas': 0, 'monto_total': 0, 'promedio_venta': 0}
            return resultado
            
        except Exception as e:
            logger.error(f"Error al obtener resumen del día: {e}")
            return {'total_ventas': 0, 'monto_total': 0, 'promedio_venta': 0}
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_venta_by_id(id_venta: int) -> Optional[Dict[str, Any]]:
        """Obtiene una venta específica con sus detalles"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            # Obtener cabecera de venta
            cursor.execute("""
                SELECT v.*, c.nombre as cliente_nombre_completo, c.ruc as cliente_ruc
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_nombre = c.nombre
                WHERE v.id_venta = %s
            """, (id_venta,))
            
            venta = cursor.fetchone()
            if not venta:
                return None
            
            # Obtener detalles
            cursor.execute("""
                SELECT dv.*, p.nombre as producto_nombre, p.codigo as producto_codigo
                FROM detalles_venta dv
                JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = %s
            """, (id_venta,))
            
            venta['detalles'] = cursor.fetchall()
            return venta
            
        except Exception as e:
            logger.error(f"Error al obtener venta {id_venta}: {e}")
            return None
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
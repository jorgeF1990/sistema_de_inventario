# -*- coding: utf-8 -*-
"""
Servicio de Stock - Logica de negocio
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from ..database.connection import get_db
from ..models.producto import ProductoResponse

logger = logging.getLogger(__name__)

class StockService:
    """Servicio de gestion de stock"""
    
    @staticmethod
    def actualizar_stock(
        id_producto: int,
        cantidad: int,
        tipo_movimiento: int,
        usuario: str,
        referencia: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Actualiza el stock de un producto
        IMPORTANTE: cantidad positiva = ENTRADA, cantidad negativa = SALIDA
        """
        with get_db() as (conn, cursor):
            # Obtener stock actual con bloqueo
            cursor.execute(
                "SELECT stock_actual, nombre FROM productos WHERE id_producto = %s FOR UPDATE",
                (id_producto,)
            )
            resultado = cursor.fetchone()
            
            if not resultado:
                raise ValueError(f"Producto con ID {id_producto} no encontrado")
            
            stock_actual = resultado['stock_actual']
            nombre_producto = resultado['nombre']
            stock_nuevo = stock_actual + cantidad
            
            if stock_nuevo < 0:
                raise ValueError(
                    f"Stock insuficiente. Stock actual: {stock_actual}, intenta quitar: {-cantidad}"
                )
            
            # Actualizar stock
            cursor.execute("""
                UPDATE productos SET stock_actual = %s WHERE id_producto = %s
            """, (stock_nuevo, id_producto))
            
            # Registrar movimiento
            motivo = referencia.get('motivo', 'Ajuste manual') if referencia else 'Ajuste manual'
            referencia_tipo = referencia.get('tipo') if referencia else 'ajuste'
            referencia_id = referencia.get('id') if referencia else None
            
            cursor.execute("""
                INSERT INTO movimientos_stock 
                (id_producto, id_tipo_movimiento, cantidad, stock_antes, stock_despues, 
                 referencia_tipo, referencia_id, usuario, observacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                id_producto, tipo_movimiento, cantidad, stock_actual, stock_nuevo,
                referencia_tipo, referencia_id, usuario, motivo
            ))
            
            conn.commit()
            
            tipo_texto = "ENTRADA" if cantidad > 0 else "SALIDA"
            logger.info(
                f"Stock actualizado: {nombre_producto} - "
                f"{stock_actual} -> {stock_nuevo} ({tipo_texto}: {abs(cantidad)})"
            )
            
            return stock_nuevo
    
    @staticmethod
    def get_stock_critico() -> List[Dict[str, Any]]:
        """Obtiene productos con stock critico"""
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT * FROM vw_stock_alertas
                WHERE estado_stock != 'NORMAL'
                ORDER BY 
                    CASE estado_stock
                        WHEN 'SIN STOCK' THEN 1
                        WHEN 'STOCK BAJO' THEN 2
                    END,
                    stock_actual
            """)
            return cursor.fetchall()
    
    @staticmethod
    def get_resumen_stock() -> Dict[str, Any]:
        """Obtiene resumen de stock"""
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_productos,
                    SUM(CASE WHEN stock_actual <= 0 THEN 1 ELSE 0 END) as sin_stock,
                    SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > 0 THEN 1 ELSE 0 END) as stock_bajo,
                    SUM(stock_actual) as total_unidades
                FROM productos
                WHERE activo = TRUE
            """)
            return cursor.fetchone()
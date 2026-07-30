# -*- coding: utf-8 -*-
"""
Servicio de Pedidos - Logica de negocio
"""

import logging
from typing import List, Dict, Any
from datetime import datetime

from ..database.connection import get_db

logger = logging.getLogger(__name__)

class PedidoService:
    """Servicio de gestion de pedidos"""
    
    @staticmethod
    def generar_pedido_automatico() -> List[int]:
        """Genera pedidos automaticos por stock bajo"""
        with get_db() as (conn, cursor):
            conn.start_transaction()
            
            # Obtener productos con stock bajo agrupados por proveedor
            cursor.execute("""
                SELECT 
                    id_proveedor,
                    proveedor,
                    GROUP_CONCAT(id_producto) as productos,
                    GROUP_CONCAT(cantidad_recomendada) as cantidades,
                    GROUP_CONCAT(nombre) as nombres
                FROM vw_stock_alertas 
                WHERE estado_stock IN ('STOCK BAJO', 'SIN STOCK') 
                AND proveedor != 'Sin proveedor'
                AND id_proveedor IS NOT NULL
                GROUP BY id_proveedor, proveedor
            """)
            
            proveedores = cursor.fetchall()
            pedidos_generados = []
            
            for proveedor in proveedores:
                id_prov = proveedor['id_proveedor']
                nombre_prov = proveedor['proveedor']
                productos_ids = proveedor['productos'].split(',') if proveedor['productos'] else []
                cantidades = proveedor['cantidades'].split(',') if proveedor['cantidades'] else []
                
                if not productos_ids:
                    continue
                
                # Crear pedido
                numero_pedido = f"AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}-{id_prov}"
                cursor.execute("""
                    INSERT INTO pedidos 
                    (numero_pedido, id_proveedor, fecha_pedido, id_estado, observaciones, usuario)
                    VALUES (%s, %s, NOW(), 1, %s, 'sistema')
                """, (numero_pedido, id_prov, f"Pedido automatico por stock bajo - {nombre_prov}"))
                
                id_pedido = cursor.lastrowid
                pedidos_generados.append(id_pedido)
                
                subtotal_total = 0
                for i, id_prod in enumerate(productos_ids):
                    try:
                        cantidad = int(cantidades[i]) if i < len(cantidades) else 5
                        if cantidad <= 0:
                            cantidad = 5
                        
                        cursor.execute(
                            "SELECT precio_compra FROM productos WHERE id_producto = %s",
                            (id_prod,)
                        )
                        precio = cursor.fetchone()
                        precio_unitario = precio['precio_compra'] if precio else 0
                        
                        subtotal = cantidad * precio_unitario
                        subtotal_total += subtotal
                        
                        cursor.execute("""
                            INSERT INTO detalles_pedido 
                            (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (id_pedido, id_prod, cantidad, precio_unitario, subtotal))
                        
                    except Exception as e:
                        logger.error(f"Error al agregar producto {id_prod}: {e}")
                
                # Actualizar totales
                iva = subtotal_total * 0.21
                total = subtotal_total + iva
                cursor.execute("""
                    UPDATE pedidos SET subtotal = %s, iva = %s, total = %s WHERE id_pedido = %s
                """, (subtotal_total, iva, total, id_pedido))
            
            conn.commit()
            logger.info(f"Generados {len(pedidos_generados)} pedidos automaticos")
            return pedidos_generados
    
    @staticmethod
    def get_pedidos_pendientes() -> List[Dict[str, Any]]:
        """Obtiene pedidos pendientes"""
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT p.*, pr.nombre as proveedor_nombre,
                       (SELECT COUNT(*) FROM detalles_pedido WHERE id_pedido = p.id_pedido) as cantidad_productos
                FROM pedidos p
                JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                WHERE p.id_estado IN (1, 2)
                ORDER BY p.fecha_pedido DESC
            """)
            return cursor.fetchall()
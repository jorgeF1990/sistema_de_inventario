# -*- coding: utf-8 -*-
"""
Controlador de Pedidos - Optimizado
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from api.database.connection import get_connection

logger = logging.getLogger(__name__)

class PedidoController:
    
    @staticmethod
    def generar_pedido_automatico() -> List[int]:
        """Genera pedidos automáticos por stock bajo"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor()
            
            conexion.start_transaction()
            
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
            
            if not proveedores:
                logger.info("No hay productos con stock bajo que tengan proveedor asignado")
                return []
            
            pedidos_generados = []
            
            for proveedor in proveedores:
                id_prov = proveedor[0]
                nombre_prov = proveedor[1]
                productos_ids = str(proveedor[2]).split(',') if proveedor[2] else []
                cantidades = str(proveedor[3]).split(',') if proveedor[3] else []
                
                if not productos_ids:
                    continue
                
                # Crear pedido
                numero_pedido = f"AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}-{id_prov}"
                cursor.execute("""
                    INSERT INTO pedidos (numero_pedido, id_proveedor, fecha_pedido, id_estado, observaciones)
                    VALUES (%s, %s, NOW(), 1, %s)
                """, (numero_pedido, id_prov, f"Pedido automático por stock bajo - {nombre_prov}"))
                
                id_pedido = cursor.lastrowid
                pedidos_generados.append(id_pedido)
                
                subtotal_total = 0
                # Procesar productos del pedido
                for i, id_prod in enumerate(productos_ids):
                    try:
                        cantidad = int(cantidades[i]) if i < len(cantidades) else 5
                        if cantidad <= 0:
                            cantidad = 5
                        
                        # Obtener precio de compra del producto
                        cursor.execute("SELECT precio_compra FROM productos WHERE id_producto = %s", (id_prod,))
                        precio = cursor.fetchone()
                        precio_unitario = precio[0] if precio and precio[0] else 0
                        
                        subtotal = cantidad * precio_unitario
                        subtotal_total += subtotal
                        
                        cursor.execute("""
                            INSERT INTO detalles_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (id_pedido, id_prod, cantidad, precio_unitario, subtotal))
                    except Exception as e:
                        logger.error(f"Error al agregar producto {id_prod}: {e}")
                
                # Actualizar total del pedido
                iva = subtotal_total * 0.21
                total = subtotal_total + iva
                cursor.execute("""
                    UPDATE pedidos 
                    SET subtotal = %s, iva = %s, total = %s
                    WHERE id_pedido = %s
                """, (subtotal_total, iva, total, id_pedido))
            
            conexion.commit()
            logger.info(f"Se generaron {len(pedidos_generados)} pedidos automáticos")
            return pedidos_generados
            
        except Exception as e:
            if conexion:
                conexion.rollback()
            logger.error(f"Error al generar pedido automático: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_pedidos_pendientes() -> List[Dict[str, Any]]:
        """Obtiene pedidos pendientes (estado 1 o 2)"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT p.*, pr.nombre as proveedor_nombre,
                       (SELECT COUNT(*) FROM detalles_pedido WHERE id_pedido = p.id_pedido) as cantidad_productos
                FROM pedidos p
                JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                WHERE p.id_estado IN (1, 2)
                ORDER BY p.fecha_pedido DESC
            """)
            
            pedidos = cursor.fetchall()
            return pedidos
            
        except Exception as e:
            logger.error(f"Error al obtener pedidos pendientes: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_detalles_pedido(id_pedido: int) -> List[Dict[str, Any]]:
        """Obtiene los detalles de un pedido específico"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT dp.*, p.nombre as producto_nombre, p.codigo
                FROM detalles_pedido dp
                JOIN productos p ON dp.id_producto = p.id_producto
                WHERE dp.id_pedido = %s
            """, (id_pedido,))
            
            detalles = cursor.fetchall()
            return detalles
            
        except Exception as e:
            logger.error(f"Error al obtener detalles del pedido {id_pedido}: {e}")
            return []
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def crear_pedido_manual(
        id_proveedor: int,
        detalles: List[Dict[str, Any]],
        observaciones: Optional[str] = None,
        usuario: str = "admin"
    ) -> int:
        """Crea un pedido manual"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor()
            
            conexion.start_transaction()
            
            # Verificar proveedor
            cursor.execute(
                "SELECT id_proveedor, nombre FROM proveedores WHERE id_proveedor = %s",
                (id_proveedor,)
            )
            proveedor = cursor.fetchone()
            if not proveedor:
                raise ValueError(f"Proveedor con ID {id_proveedor} no encontrado")
            
            # Generar número de pedido
            numero_pedido = f"MAN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Insertar pedido
            cursor.execute("""
                INSERT INTO pedidos 
                (numero_pedido, id_proveedor, fecha_pedido, id_estado, observaciones, usuario)
                VALUES (%s, %s, NOW(), 1, %s, %s)
            """, (numero_pedido, id_proveedor, observaciones, usuario))
            
            id_pedido = cursor.lastrowid
            
            # Procesar detalles
            subtotal_total = 0
            for detalle in detalles:
                # Verificar producto
                cursor.execute(
                    "SELECT precio_compra FROM productos WHERE id_producto = %s",
                    (detalle['id_producto'],)
                )
                producto = cursor.fetchone()
                if not producto:
                    raise ValueError(f"Producto con ID {detalle['id_producto']} no encontrado")
                
                precio_unitario = detalle.get('precio_unitario', producto[0])
                subtotal = detalle['cantidad'] * precio_unitario
                subtotal_total += subtotal
                
                cursor.execute("""
                    INSERT INTO detalles_pedido 
                    (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                """, (id_pedido, detalle['id_producto'], detalle['cantidad'], 
                      precio_unitario, subtotal))
            
            # Actualizar totales
            iva = subtotal_total * 0.21
            total = subtotal_total + iva
            cursor.execute("""
                UPDATE pedidos 
                SET subtotal = %s, iva = %s, total = %s
                WHERE id_pedido = %s
            """, (subtotal_total, iva, total, id_pedido))
            
            conexion.commit()
            logger.info(f"Pedido manual creado: {numero_pedido} - Total: ${total:.2f}")
            return id_pedido
            
        except Exception as e:
            if conexion:
                conexion.rollback()
            logger.error(f"Error al crear pedido manual: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
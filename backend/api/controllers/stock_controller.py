# -*- coding: utf-8 -*-
"""
Controlador de Stock - Version Profesional
Maneja todas las operaciones de inventario con consistencia
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
from api.database.connection import get_connection
from api.models import Producto, Categoria, Proveedor

# Configurar logging
logger = logging.getLogger(__name__)

class StockController:
    """Controlador profesional para gestion de stock"""
    
    # Constantes de tipos de movimiento
    TIPO_VENTA = 1
    TIPO_COMPRA = 2
    TIPO_AJUSTE_POSITIVO = 3
    TIPO_AJUSTE_NEGATIVO = 4
    TIPO_DEVOLUCION_VENTA = 5
    TIPO_DEVOLUCION_COMPRA = 6
    TIPO_MERMA = 7
    
    @staticmethod
    def get_all_productos() -> List[Producto]:
        """Obtiene todos los productos activos con sus relaciones"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            # OPTIMIZADO: SELECT específicos en lugar de SELECT *
            cursor.execute("""
                SELECT 
                    p.id_producto,
                    p.codigo,
                    p.nombre,
                    p.descripcion,
                    p.id_categoria,
                    p.id_proveedor,
                    p.precio_compra,
                    p.precio_venta,
                    p.stock_actual,
                    p.stock_minimo,
                    p.stock_maximo,
                    p.ubicacion,
                    p.unidad_medida,
                    p.activo,
                    p.fecha_creacion,
                    c.nombre as categoria_nombre,
                    pr.nombre as proveedor_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                WHERE p.activo = TRUE
                ORDER BY p.nombre
            """)
            
            productos = []
            for row in cursor.fetchall():
                producto = Producto(
                    id_producto=row['id_producto'],
                    codigo=row['codigo'],
                    nombre=row['nombre'],
                    descripcion=row['descripcion'],
                    id_categoria=row['id_categoria'],
                    id_proveedor=row['id_proveedor'],
                    precio_compra=row['precio_compra'],
                    precio_venta=row['precio_venta'],
                    stock_actual=row['stock_actual'],
                    stock_minimo=row['stock_minimo'],
                    stock_maximo=row['stock_maximo'],
                    ubicacion=row['ubicacion'],
                    unidad_medida=row['unidad_medida'],
                    activo=row['activo']
                )
                productos.append(producto)
            
            logger.info(f"Obtenidos {len(productos)} productos activos")
            return productos
            
        except Exception as e:
            logger.error(f"Error al obtener productos: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_productos_con_alerta() -> List[Dict[str, Any]]:
        """Obtiene productos con stock critico"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
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
            
            resultados = cursor.fetchall()
            logger.info(f"Encontrados {len(resultados)} productos con alerta")
            return resultados
            
        except Exception as e:
            logger.error(f"Error al obtener alertas: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def actualizar_stock(
        id_producto: int,
        cantidad: int,
        tipo_movimiento: int,
        usuario: str,
        referencia: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Actualiza el stock de un producto y registra el movimiento
        
        IMPORTANTE: 
        - cantidad POSITIVA = ENTRADA (agregar stock)
        - cantidad NEGATIVA = SALIDA (quitar stock)
        
        Args:
            id_producto: ID del producto
            cantidad: Cantidad a modificar (POSITIVA para ENTRADA, NEGATIVA para SALIDA)
            tipo_movimiento: Tipo de movimiento (1=Venta, 2=Compra, 3=Ajuste+, 4=Ajuste-)
            usuario: Usuario que realiza la operacion
            referencia: Informacion adicional de referencia
            
        Returns:
            int: Nuevo stock del producto
        """
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor()
            
            # Iniciar transaccion
            conexion.start_transaction()
            
            # Obtener stock actual con bloqueo para actualizacion
            cursor.execute(
                "SELECT stock_actual, nombre FROM productos WHERE id_producto = %s FOR UPDATE",
                (id_producto,)
            )
            resultado = cursor.fetchone()
            
            if not resultado:
                raise ValueError(f"Producto con ID {id_producto} no encontrado")
            
            stock_actual = resultado[0]
            nombre_producto = resultado[1]
            stock_nuevo = stock_actual + cantidad
            
            # Validaciones
            if stock_nuevo < 0:
                raise ValueError(
                    f"Stock insuficiente. Stock actual: {stock_actual}, intenta quitar: {-cantidad}"
                )
            
            if tipo_movimiento in [StockController.TIPO_VENTA, StockController.TIPO_AJUSTE_NEGATIVO]:
                if cantidad > 0:
                    raise ValueError("Los movimientos de SALIDA deben tener cantidad NEGATIVA")
            elif tipo_movimiento in [StockController.TIPO_COMPRA, StockController.TIPO_AJUSTE_POSITIVO]:
                if cantidad < 0:
                    raise ValueError("Los movimientos de ENTRADA deben tener cantidad POSITIVA")
            
            # Actualizar stock
            cursor.execute("""
                UPDATE productos 
                SET stock_actual = %s 
                WHERE id_producto = %s
            """, (stock_nuevo, id_producto))
            
            # Registrar movimiento
            motivo = referencia.get('motivo', 'Ajuste manual') if referencia else 'Ajuste manual'
            referencia_tipo = referencia.get('tipo') if referencia else 'ajuste'
            referencia_id = referencia.get('id') if referencia else None
            
            cursor.execute("""
                INSERT INTO movimientos_stock 
                (id_producto, id_tipo_movimiento, cantidad, stock_antes, stock_despues, 
                 referencia_tipo, referencia_id, usuario, fecha, observacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
            """, (
                id_producto, tipo_movimiento, cantidad, stock_actual, stock_nuevo,
                referencia_tipo, referencia_id, usuario, motivo
            ))
            
            conexion.commit()
            
            # Logging
            tipo_texto = "ENTRADA" if cantidad > 0 else "SALIDA"
            logger.info(
                f"Stock actualizado: {nombre_producto} - "
                f"{stock_actual} -> {stock_nuevo} ({tipo_texto}: {abs(cantidad)})"
            )
            
            return stock_nuevo
            
        except Exception as e:
            if conexion:
                conexion.rollback()
            logger.error(f"Error al actualizar stock: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_producto_by_id(id_producto: int) -> Optional[Producto]:
        """Obtiene un producto especifico por su ID"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
            cursor.execute("SELECT * FROM productos WHERE id_producto = %s", (id_producto,))
            row = cursor.fetchone()
            
            if row:
                return Producto(
                    id_producto=row['id_producto'],
                    codigo=row['codigo'],
                    nombre=row['nombre'],
                    descripcion=row['descripcion'],
                    id_categoria=row['id_categoria'],
                    id_proveedor=row['id_proveedor'],
                    precio_compra=row['precio_compra'],
                    precio_venta=row['precio_venta'],
                    stock_actual=row['stock_actual'],
                    stock_minimo=row['stock_minimo'],
                    stock_maximo=row['stock_maximo'],
                    ubicacion=row['ubicacion'],
                    unidad_medida=row['unidad_medida'],
                    activo=row['activo']
                )
            return None
            
        except Exception as e:
            logger.error(f"Error al obtener producto {id_producto}: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
    
    @staticmethod
    def get_resumen_stock() -> Dict[str, Any]:
        """Obtiene resumen de stock"""
        conexion = None
        cursor = None
        
        try:
            conexion = get_connection()
            cursor = conexion.cursor(dictionary=True)
            
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
            
        except Exception as e:
            logger.error(f"Error al obtener resumen de stock: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conexion:
                conexion.close()
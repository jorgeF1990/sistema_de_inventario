# -*- coding: utf-8 -*-
"""
Rutas para Gestion de Compras (Entradas de Stock)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
import logging
import traceback

from ..database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compras", tags=["Compras"])

# ============================================
# MODELOS
# ============================================

class DetalleCompraRequest(BaseModel):
    id_producto: int
    cantidad: int
    precio_unitario: float
    
    @validator('cantidad')
    def validar_cantidad(cls, v):
        if v <= 0:
            raise ValueError('La cantidad debe ser mayor a 0')
        return v
    
    @validator('precio_unitario')
    def validar_precio(cls, v):
        if v < 0:
            raise ValueError('El precio no puede ser negativo')
        return v

class CompraRequest(BaseModel):
    id_proveedor: int
    observaciones: Optional[str] = None
    usuario: str = "admin"
    detalles: List[DetalleCompraRequest]
    
    @validator('id_proveedor')
    def validar_proveedor(cls, v):
        if v <= 0:
            raise ValueError('ID de proveedor invalido')
        return v

# ============================================
# ENDPOINTS
# ============================================

@router.post("/", status_code=status.HTTP_201_CREATED)
async def registrar_compra(compra: CompraRequest):
    """Registra una compra (entrada de stock) con proveedor"""
    try:
        if not compra.detalles:
            raise HTTPException(status_code=400, detail="La compra debe tener al menos un producto")
        
        with get_db() as (conn, cursor):
            conn.start_transaction()
            
            # Verificar proveedor
            cursor.execute(
                "SELECT id_proveedor, nombre FROM proveedores WHERE id_proveedor = %s AND activo = TRUE",
                (compra.id_proveedor,)
            )
            proveedor = cursor.fetchone()
            if not proveedor:
                raise HTTPException(status_code=404, detail="Proveedor no encontrado")
            
            # Generar número de compra
            numero_compra = f"COMP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Calcular totales
            subtotal = 0
            for detalle in compra.detalles:
                subtotal += detalle.cantidad * detalle.precio_unitario
            
            iva = subtotal * 0.21
            total = subtotal + iva
            
            # Insertar pedido (compra)
            cursor.execute("""
                INSERT INTO pedidos 
                (numero_pedido, id_proveedor, fecha_pedido, id_estado, observaciones, usuario)
                VALUES (%s, %s, NOW(), 3, %s, %s)
            """, (numero_compra, compra.id_proveedor, 
                  compra.observaciones or f"Compra a {proveedor['nombre']}", 
                  compra.usuario))
            
            id_pedido = cursor.lastrowid
            
            # Procesar cada producto
            for detalle in compra.detalles:
                # Verificar producto
                cursor.execute(
                    "SELECT stock_actual, nombre FROM productos WHERE id_producto = %s FOR UPDATE",
                    (detalle.id_producto,)
                )
                producto = cursor.fetchone()
                if not producto:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Producto ID {detalle.id_producto} no encontrado"
                    )
                
                stock_actual = producto['stock_actual']
                stock_nuevo = stock_actual + detalle.cantidad
                
                # Actualizar stock (ENTRADA)
                cursor.execute("""
                    UPDATE productos 
                    SET stock_actual = %s, precio_compra = %s 
                    WHERE id_producto = %s
                """, (stock_nuevo, detalle.precio_unitario, detalle.id_producto))
                
                # Registrar movimiento de stock
                cursor.execute("""
                    INSERT INTO movimientos_stock 
                    (id_producto, id_tipo_movimiento, cantidad, stock_antes, stock_despues,
                     referencia_tipo, referencia_id, usuario, observacion)
                    VALUES (%s, 2, %s, %s, %s, 'pedido', %s, %s, %s)
                """, (detalle.id_producto, detalle.cantidad, stock_actual, stock_nuevo,
                      id_pedido, compra.usuario, 
                      f"Compra a {proveedor['nombre']} - {detalle.cantidad}x {producto['nombre']}"))
                
                # Insertar detalle del pedido
                subtotal_detalle = detalle.cantidad * detalle.precio_unitario
                cursor.execute("""
                    INSERT INTO detalles_pedido 
                    (id_pedido, id_producto, cantidad, cantidad_recibida, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (id_pedido, detalle.id_producto, detalle.cantidad, detalle.cantidad,
                      detalle.precio_unitario, subtotal_detalle))
            
            # Actualizar totales del pedido
            cursor.execute("""
                UPDATE pedidos SET subtotal = %s, iva = %s, total = %s 
                WHERE id_pedido = %s
            """, (subtotal, iva, total, id_pedido))
            
            conn.commit()
            
            # Obtener la compra registrada
            cursor.execute("""
                SELECT 
                    p.id_pedido,
                    p.numero_pedido,
                    pr.nombre as proveedor_nombre,
                    p.fecha_pedido,
                    p.subtotal,
                    p.iva,
                    p.total,
                    p.observaciones,
                    COUNT(dp.id_detalle) as cantidad_productos
                FROM pedidos p
                JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                LEFT JOIN detalles_pedido dp ON p.id_pedido = dp.id_pedido
                WHERE p.id_pedido = %s
                GROUP BY p.id_pedido
            """, (id_pedido,))
            
            compra_registrada = cursor.fetchone()
            if compra_registrada and compra_registrada.get('fecha_pedido'):
                compra_registrada['fecha_pedido'] = str(compra_registrada['fecha_pedido'])
            
            logger.info(f"Compra registrada: {numero_compra} - Proveedor: {proveedor['nombre']}")
            return compra_registrada
            
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error al registrar compra: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_compras(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    id_proveedor: Optional[int] = None
):
    """Obtiene el historial de compras"""
    try:
        with get_db() as (conn, cursor):
            query = """
                SELECT 
                    p.id_pedido,
                    p.numero_pedido,
                    p.fecha_pedido,
                    pr.nombre as proveedor_nombre,
                    pr.ruc as proveedor_ruc,
                    pr.telefono as proveedor_telefono,
                    p.subtotal,
                    p.iva,
                    p.total,
                    p.observaciones,
                    p.usuario,
                    COUNT(dp.id_detalle) as cantidad_productos
                FROM pedidos p
                JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                LEFT JOIN detalles_pedido dp ON p.id_pedido = dp.id_pedido
                WHERE p.id_estado = 3
            """
            params = []
            
            if id_proveedor:
                query += " AND p.id_proveedor = %s"
                params.append(id_proveedor)
            
            if fecha_inicio:
                query += " AND DATE(p.fecha_pedido) >= %s"
                params.append(fecha_inicio)
            
            if fecha_fin:
                query += " AND DATE(p.fecha_pedido) <= %s"
                params.append(fecha_fin)
            
            query += " GROUP BY p.id_pedido ORDER BY p.fecha_pedido DESC LIMIT 100"
            
            cursor.execute(query, tuple(params))
            compras = cursor.fetchall()
            for c in compras:
                if c.get('fecha_pedido'):
                    c['fecha_pedido'] = str(c['fecha_pedido'])
            return compras
            
    except Exception as e:
        logger.error(f"Error al obtener compras: {e}")
        return []

@router.get("/{id_pedido}")
async def get_compra(id_pedido: int):
    """Obtiene una compra específica con todos sus detalles"""
    try:
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    p.id_pedido,
                    p.numero_pedido,
                    p.fecha_pedido,
                    pr.id_proveedor,
                    pr.nombre as proveedor_nombre,
                    pr.ruc as proveedor_ruc,
                    pr.telefono as proveedor_telefono,
                    pr.email as proveedor_email,
                    pr.direccion as proveedor_direccion,
                    pr.contacto_nombre,
                    pr.contacto_telefono,
                    p.subtotal,
                    p.iva,
                    p.total,
                    p.observaciones,
                    p.usuario,
                    ep.nombre as estado
                FROM pedidos p
                JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                JOIN estados_pedido ep ON p.id_estado = ep.id_estado
                WHERE p.id_pedido = %s
            """, (id_pedido,))
            
            compra = cursor.fetchone()
            if not compra:
                raise HTTPException(status_code=404, detail="Compra no encontrada")
            
            if compra.get('fecha_pedido'):
                compra['fecha_pedido'] = str(compra['fecha_pedido'])
            
            cursor.execute("""
                SELECT 
                    dp.id_detalle,
                    dp.cantidad,
                    dp.cantidad_recibida,
                    dp.precio_unitario,
                    dp.subtotal,
                    p2.id_producto,
                    p2.nombre as producto_nombre,
                    p2.codigo as producto_codigo,
                    p2.precio_compra,
                    p2.precio_venta
                FROM detalles_pedido dp
                JOIN productos p2 ON dp.id_producto = p2.id_producto
                WHERE dp.id_pedido = %s
            """, (id_pedido,))
            
            compra['detalles'] = cursor.fetchall()
            return compra
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener compra: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINT SIMPLIFICADO PARA COMPRAS RÁPIDAS
# ============================================

@router.post("/simple")
async def registrar_compra_simple(
    id_proveedor: int,
    id_producto: int,
    cantidad: int,
    precio_unitario: float,
    observaciones: Optional[str] = None,
    usuario: str = "admin"
):
    """Registra una compra simple de un solo producto"""
    try:
        compra_data = {
            "id_proveedor": id_proveedor,
            "observaciones": observaciones,
            "usuario": usuario,
            "detalles": [
                {
                    "id_producto": id_producto,
                    "cantidad": cantidad,
                    "precio_unitario": precio_unitario
                }
            ]
        }
        
        # Crear un objeto CompraRequest
        compra = CompraRequest(**compra_data)
        
        # Usar la función principal
        return await registrar_compra(compra)
        
    except Exception as e:
        logger.error(f"Error en compra simple: {e}")
        raise HTTPException(status_code=500, detail=str(e))

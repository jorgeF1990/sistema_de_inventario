# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import logging

from api.database.connection import get_db
from api.utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])

class DetallePedidoRequest(BaseModel):
    id_producto: int
    cantidad: int = Field(..., gt=0)
    precio_unitario: Optional[float] = None

class PedidoRequest(BaseModel):
    id_proveedor: int
    observaciones: Optional[str] = None
    usuario: str = "admin"
    detalles: List[DetallePedidoRequest]

@router.get("/pendientes")
async def get_pedidos_pendientes(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT p.*, pr.nombre as proveedor_nombre,
                       ep.nombre as estado_nombre,
                       (SELECT COUNT(*) FROM detalles_pedido WHERE id_pedido = p.id_pedido) as cantidad_productos
                FROM pedidos p
                JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                JOIN estados_pedido ep ON p.id_estado = ep.id_estado
                WHERE p.id_estado IN (1, 2) AND p.id_empresa = %s
                ORDER BY p.fecha_pedido DESC
            """, (empresa_id,))
            pedidos = cursor.fetchall()
            for p in pedidos:
                if p.get('fecha_pedido'):
                    p['fecha_pedido'] = str(p['fecha_pedido'])
            return pedidos
            
    except Exception as e:
        logger.error(f"Error al obtener pedidos pendientes: {e}")
        return []

@router.get("/historial")
async def get_historial_pedidos(
    limit: int = Query(50, ge=1, le=200),
    estado: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            query = """
                SELECT p.*, pr.nombre as proveedor_nombre,
                       ep.nombre as estado_nombre,
                       (SELECT COUNT(*) FROM detalles_pedido WHERE id_pedido = p.id_pedido) as cantidad_productos
                FROM pedidos p
                JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                JOIN estados_pedido ep ON p.id_estado = ep.id_estado
                WHERE p.id_empresa = %s
            """
            params = [empresa_id]
            
            if estado:
                query += " AND p.id_estado = %s"
                params.append(estado)
            
            query += " ORDER BY p.fecha_pedido DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, tuple(params))
            pedidos = cursor.fetchall()
            for p in pedidos:
                if p.get('fecha_pedido'):
                    p['fecha_pedido'] = str(p['fecha_pedido'])
            return pedidos
            
    except Exception as e:
        logger.error(f"Error al obtener historial: {e}")
        return []

@router.get("/{id_pedido}/detalles")
async def get_detalles_pedido(
    id_pedido: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT dp.*, p.nombre as producto_nombre, p.codigo
                FROM detalles_pedido dp
                JOIN productos p ON dp.id_producto = p.id_producto
                WHERE dp.id_pedido = %s AND p.id_empresa = %s
            """, (id_pedido, empresa_id))
            return cursor.fetchall()
            
    except Exception as e:
        logger.error(f"Error al obtener detalles del pedido {id_pedido}: {e}")
        return []

@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_pedido(
    pedido: PedidoRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['empresa_id']
        
        if not pedido.detalles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El pedido debe tener al menos un producto"
            )
        
        with get_db() as (conn, cursor):
            conn.start_transaction()
            
            cursor.execute(
                "SELECT id_proveedor FROM proveedores WHERE id_proveedor = %s AND id_empresa = %s",
                (pedido.id_proveedor, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Proveedor no encontrado"
                )
            
            numero_pedido = f"MAN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            cursor.execute("""
                INSERT INTO pedidos 
                (numero_pedido, id_proveedor, fecha_pedido, id_estado, observaciones, usuario, id_empresa)
                VALUES (%s, %s, NOW(), 1, %s, %s, %s)
            """, (numero_pedido, pedido.id_proveedor, pedido.observaciones, pedido.usuario, empresa_id))
            
            id_pedido = cursor.lastrowid
            
            subtotal_total = 0
            for detalle in pedido.detalles:
                cursor.execute(
                    "SELECT precio_compra FROM productos WHERE id_producto = %s AND id_empresa = %s",
                    (detalle.id_producto, empresa_id)
                )
                producto = cursor.fetchone()
                if not producto:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Producto ID {detalle.id_producto} no encontrado"
                    )
                
                precio_unitario = detalle.precio_unitario or producto['precio_compra']
                subtotal = detalle.cantidad * precio_unitario
                subtotal_total += subtotal
                
                cursor.execute("""
                    INSERT INTO detalles_pedido 
                    (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                """, (id_pedido, detalle.id_producto, detalle.cantidad, 
                      precio_unitario, subtotal))
            
            iva = subtotal_total * 0.21
            total = subtotal_total + iva
            cursor.execute("""
                UPDATE pedidos 
                SET subtotal = %s, iva = %s, total = %s
                WHERE id_pedido = %s
            """, (subtotal_total, iva, total, id_pedido))
            
            conn.commit()
            
            logger.info(f"Pedido creado: {numero_pedido}")
            return {"message": "Pedido creado correctamente", "id_pedido": id_pedido}
            
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error al crear pedido: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id_pedido}/estado")
async def cambiar_estado_pedido(
    id_pedido: int,
    estado: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                UPDATE pedidos 
                SET id_estado = %s 
                WHERE id_pedido = %s AND id_empresa = %s
            """, (estado, id_pedido, empresa_id))
            conn.commit()
            
            return {"message": "Estado actualizado correctamente"}
            
    except Exception as e:
        logger.error(f"Error al cambiar estado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/automatico")
async def generar_pedido_automatico(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_producto, nombre, stock_actual, stock_minimo, id_proveedor
                FROM productos
                WHERE stock_actual <= stock_minimo 
                AND activo = TRUE 
                AND id_empresa = %s
                AND id_proveedor IS NOT NULL
            """, (empresa_id,))
            
            productos_bajo = cursor.fetchall()
            
            if not productos_bajo:
                return {"message": "No hay productos con stock bajo", "pedidos": []}
            
            pedidos_generados = []
            
            for producto in productos_bajo:
                cursor.execute("""
                    SELECT id_pedido FROM pedidos 
                    WHERE id_proveedor = %s AND id_estado IN (1, 2)
                    LIMIT 1
                """, (producto['id_proveedor'],))
                
                pedido_existente = cursor.fetchone()
                
                if not pedido_existente:
                    numero_pedido = f"AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    cursor.execute("""
                        INSERT INTO pedidos 
                        (numero_pedido, id_proveedor, fecha_pedido, id_estado, usuario, id_empresa)
                        VALUES (%s, %s, NOW(), 1, 'Sistema', %s)
                    """, (numero_pedido, producto['id_proveedor'], empresa_id))
                    id_pedido = cursor.lastrowid
                    pedidos_generados.append({"id_pedido": id_pedido, "numero": numero_pedido})
                else:
                    id_pedido = pedido_existente['id_pedido']
                
                cantidad = producto['stock_minimo'] * 2
                cursor.execute("""
                    INSERT INTO detalles_pedido 
                    (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, 0, 0)
                """, (id_pedido, producto['id_producto'], cantidad))
            
            conn.commit()
            
            return {
                "message": f"Se generaron {len(pedidos_generados)} pedidos automaticos",
                "pedidos": pedidos_generados
            }
            
    except Exception as e:
        logger.error(f"Error al generar pedidos automaticos: {e}")
        raise HTTPException(status_code=500, detail=str(e))
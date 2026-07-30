# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from datetime import datetime, timedelta
import logging
import traceback

from api.database.connection import get_db
from api.utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reportes", tags=["Reportes"])

@router.get("/movimientos")
async def get_movimientos_stock(
    id_producto: Optional[int] = None,
    dias: int = Query(90, ge=1, le=365),
    tipo: Optional[str] = Query("TODOS", pattern="^(ENTRADA|SALIDA|TODOS)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    try:
        # CAMBIADO: empresa_id -> id_empresa
        empresa_id = current_user['id_empresa']
        fecha_limite = datetime.now() - timedelta(days=dias)
        offset = (page - 1) * limit
        
        with get_db() as (conn, cursor):
            query = """
                SELECT 
                    m.id_movimiento,
                    m.id_producto,
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
                    CASE 
                        WHEN m.cantidad > 0 THEN 'ENTRADA'
                        WHEN m.cantidad < 0 THEN 'SALIDA'
                        ELSE 'AJUSTE'
                    END as tipo_movimiento
                FROM movimientos_stock m
                JOIN productos p ON m.id_producto = p.id_producto AND p.id_empresa = %s
                WHERE m.fecha >= %s AND m.id_empresa = %s
            """
            params = [empresa_id, fecha_limite, empresa_id]
            
            if id_producto:
                query += " AND m.id_producto = %s"
                params.append(id_producto)
            
            if tipo == "ENTRADA":
                query += " AND m.cantidad > 0"
            elif tipo == "SALIDA":
                query += " AND m.cantidad < 0"
            
            query += " ORDER BY m.fecha DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, tuple(params))
            movimientos = cursor.fetchall()
            for m in movimientos:
                if m.get('fecha'):
                    m['fecha'] = str(m['fecha'])
            return movimientos
            
    except Exception as e:
        logger.error(f"Error al obtener movimientos: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movimiento/{id_movimiento}")
async def get_movimiento_detalle(
    id_movimiento: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        # CAMBIADO: empresa_id -> id_empresa
        empresa_id = current_user['id_empresa']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    m.id_movimiento,
                    m.id_producto,
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
                    CASE 
                        WHEN m.cantidad > 0 THEN 'ENTRADA'
                        WHEN m.cantidad < 0 THEN 'SALIDA'
                        ELSE 'AJUSTE'
                    END as tipo_movimiento
                FROM movimientos_stock m
                JOIN productos p ON m.id_producto = p.id_producto AND p.id_empresa = %s
                WHERE m.id_movimiento = %s AND m.id_empresa = %s
            """, (empresa_id, id_movimiento, empresa_id))
            
            movimiento = cursor.fetchone()
            if not movimiento:
                raise HTTPException(status_code=404, detail="Movimiento no encontrado")
            
            if movimiento.get('fecha'):
                movimiento['fecha'] = str(movimiento['fecha'])
            
            return movimiento
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener detalle del movimiento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resumen-general")
async def get_resumen_general(current_user: dict = Depends(get_current_user)):
    try:
        # CAMBIADO: empresa_id -> id_empresa
        empresa_id = current_user['id_empresa']
        
        with get_db() as (conn, cursor):
            cursor.execute(
                "SELECT COUNT(*) as total FROM productos WHERE activo = TRUE AND id_empresa = %s",
                (empresa_id,)
            )
            total_productos = cursor.fetchone()
            
            cursor.execute("""
                SELECT COUNT(*) as total FROM productos 
                WHERE activo = TRUE AND stock_actual <= stock_minimo AND id_empresa = %s
            """, (empresa_id,))
            productos_bajo = cursor.fetchone()
            
            cursor.execute("""
                SELECT COUNT(*) as total FROM productos 
                WHERE activo = TRUE AND stock_actual <= 0 AND id_empresa = %s
            """, (empresa_id,))
            productos_sin_stock = cursor.fetchone()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(total), 0) as monto_total
                FROM ventas 
                WHERE DATE(fecha_venta) = CURDATE() AND id_estado = 2 AND id_empresa = %s
            """, (empresa_id,))
            ventas_hoy = cursor.fetchone()
            
            cursor.execute("""
                SELECT COUNT(*) as total FROM pedidos 
                WHERE id_estado IN (1, 2) AND id_empresa = %s
            """, (empresa_id,))
            pedidos_pendientes = cursor.fetchone()
            
            return {
                "productos": {
                    "total": total_productos['total'] if total_productos else 0,
                    "stock_bajo": productos_bajo['total'] if productos_bajo else 0,
                    "sin_stock": productos_sin_stock['total'] if productos_sin_stock else 0
                },
                "ventas": {
                    "hoy": ventas_hoy['total_ventas'] if ventas_hoy else 0,
                    "monto_hoy": float(ventas_hoy['monto_total']) if ventas_hoy else 0
                },
                "pedidos_pendientes": pedidos_pendientes['total'] if pedidos_pendientes else 0
            }
            
    except Exception as e:
        logger.error(f"Error al obtener resumen general: {e}")
        return {}

@router.get("/productos-mas-vendidos")
async def get_productos_mas_vendidos(
    limite: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    try:
        # CAMBIADO: empresa_id -> id_empresa
        empresa_id = current_user['id_empresa']
        
        with get_db() as (conn, cursor):
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
                LEFT JOIN ventas v ON dv.id_venta = v.id_venta AND v.id_estado = 2 AND v.id_empresa = %s
                WHERE p.activo = TRUE AND p.id_empresa = %s
                GROUP BY p.id_producto, p.codigo, p.nombre
                HAVING total_vendido > 0
                ORDER BY total_vendido DESC
                LIMIT %s
            """, (empresa_id, empresa_id, limite))
            return cursor.fetchall()
            
    except Exception as e:
        logger.error(f"Error al obtener productos mas vendidos: {e}")
        return []
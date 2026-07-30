# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import logging
import traceback

from api.database.connection import get_db
from api.utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ventas", tags=["Ventas"])

class DetalleVentaRequest(BaseModel):
    id_producto: int
    cantidad: int = Field(..., gt=0)
    precio_unitario: float = Field(..., gt=0)

class VentaRequest(BaseModel):
    id_cliente: Optional[int] = None
    cliente_nombre: str = "CONSUMIDOR FINAL"
    detalles: List[DetalleVentaRequest]
    usuario: str = "admin"
    observaciones: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def registrar_venta(venta: VentaRequest, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['empresa_id']
        
        if not venta.detalles:
            raise HTTPException(status_code=400, detail="El carrito no puede estar vacio")
        
        with get_db() as (conn, cursor):
            conn.start_transaction()
            
            cliente_nombre = venta.cliente_nombre.upper().strip()
            
            if venta.id_cliente:
                cursor.execute(
                    "SELECT nombre FROM clientes WHERE id_cliente = %s AND id_empresa = %s AND activo = TRUE",
                    (venta.id_cliente, empresa_id)
                )
                cliente = cursor.fetchone()
                if cliente:
                    cliente_nombre = cliente['nombre']
            
            numero_factura = f"F-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            subtotal = sum(d.cantidad * d.precio_unitario for d in venta.detalles)
            iva = subtotal * 0.21
            total = subtotal + iva
            
            cursor.execute("""
                INSERT INTO ventas 
                (numero_factura, cliente_nombre, subtotal, iva, total, usuario, id_estado, observaciones, id_empresa)
                VALUES (%s, %s, %s, %s, %s, %s, 2, %s, %s)
            """, (numero_factura, cliente_nombre, subtotal, iva, total, 
                  venta.usuario, venta.observaciones, empresa_id))
            
            id_venta = cursor.lastrowid
            
            for detalle in venta.detalles:
                cursor.execute(
                    "SELECT stock_actual, nombre FROM productos WHERE id_producto = %s AND id_empresa = %s FOR UPDATE",
                    (detalle.id_producto, empresa_id)
                )
                producto = cursor.fetchone()
                if not producto:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Producto ID {detalle.id_producto} no encontrado"
                    )
                
                if producto['stock_actual'] < detalle.cantidad:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stock insuficiente para {producto['nombre']}. Stock: {producto['stock_actual']}"
                    )
                
                stock_actual = producto['stock_actual']
                stock_nuevo = stock_actual - detalle.cantidad
                
                cursor.execute("""
                    INSERT INTO detalles_venta 
                    (id_venta, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                """, (id_venta, detalle.id_producto, detalle.cantidad, 
                      detalle.precio_unitario, detalle.cantidad * detalle.precio_unitario))
                
                cursor.execute("""
                    UPDATE productos SET stock_actual = %s 
                    WHERE id_producto = %s AND id_empresa = %s
                """, (stock_nuevo, detalle.id_producto, empresa_id))
                
                cursor.execute("""
                    INSERT INTO movimientos_stock 
                    (id_producto, id_tipo_movimiento, cantidad, stock_antes, stock_despues,
                     referencia_tipo, referencia_id, usuario, observacion, id_empresa)
                    VALUES (%s, 1, %s, %s, %s, 'venta', %s, %s, %s, %s)
                """, (detalle.id_producto, -detalle.cantidad, stock_actual, 
                      stock_nuevo, id_venta, venta.usuario,
                      f"Venta a {cliente_nombre} - {detalle.cantidad}x {producto['nombre']}", empresa_id))
            
            conn.commit()
            
            cursor.execute("""
                SELECT v.*, COUNT(dv.id_detalle) as cantidad_productos
                FROM ventas v
                LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
                WHERE v.id_venta = %s
                GROUP BY v.id_venta
            """, (id_venta,))
            
            venta_registrada = cursor.fetchone()
            if venta_registrada and venta_registrada.get('fecha_venta'):
                venta_registrada['fecha_venta'] = str(venta_registrada['fecha_venta'])
            
            logger.info(f"Venta registrada: {numero_factura} - Total: ${total:.2f}")
            return venta_registrada
            
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error al registrar venta: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/hoy")
async def get_ventas_hoy(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT v.*, COUNT(dv.id_detalle) as cantidad_productos
                FROM ventas v
                LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
                WHERE DATE(v.fecha_venta) = CURDATE() AND v.id_empresa = %s AND v.id_estado = 2
                GROUP BY v.id_venta
                ORDER BY v.fecha_venta DESC
            """, (empresa_id,))
            ventas = cursor.fetchall()
            for v in ventas:
                if v.get('fecha_venta'):
                    v['fecha_venta'] = str(v['fecha_venta'])
            return ventas
    except Exception as e:
        logger.error(f"Error al obtener ventas de hoy: {e}")
        return []

@router.get("/resumen-dia")
async def get_resumen_dia(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    COALESCE(COUNT(*), 0) as total_ventas,
                    COALESCE(SUM(total), 0) as monto_total,
                    COALESCE(AVG(total), 0) as promedio_venta
                FROM ventas
                WHERE DATE(fecha_venta) = CURDATE() 
                AND id_estado = 2 
                AND id_empresa = %s
            """, (empresa_id,))
            return cursor.fetchone()
    except Exception as e:
        logger.error(f"Error al obtener resumen: {e}")
        return {"total_ventas": 0, "monto_total": 0, "promedio_venta": 0}

@router.get("/periodo")
async def get_ventas_periodo(dias: int = Query(7, ge=1, le=365), current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['empresa_id']
        fecha_inicio = datetime.now() - timedelta(days=dias)
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    DATE(fecha_venta) as fecha,
                    COUNT(*) as cantidad,
                    COALESCE(SUM(total), 0) as total
                FROM ventas
                WHERE DATE(fecha_venta) >= %s 
                AND id_estado = 2 
                AND id_empresa = %s
                GROUP BY DATE(fecha_venta)
                ORDER BY fecha
            """, (fecha_inicio.date(), empresa_id))
            return cursor.fetchall()
            
    except Exception as e:
        logger.error(f"Error al obtener ventas por periodo: {e}")
        return []

@router.get("/{id_venta}")
async def get_venta(id_venta: int, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    v.id_venta,
                    v.numero_factura,
                    v.fecha_venta,
                    v.cliente_nombre,
                    v.subtotal,
                    v.iva,
                    v.total,
                    v.observaciones,
                    v.usuario,
                    v.id_estado
                FROM ventas v
                WHERE v.id_venta = %s AND v.id_empresa = %s
            """, (id_venta, empresa_id))
            
            venta = cursor.fetchone()
            if not venta:
                raise HTTPException(status_code=404, detail="Venta no encontrada")
            
            if venta.get('fecha_venta'):
                venta['fecha_venta'] = str(venta['fecha_venta'])
            
            cursor.execute("""
                SELECT 
                    dv.id_detalle,
                    dv.cantidad,
                    dv.precio_unitario,
                    dv.subtotal,
                    p.id_producto,
                    p.nombre as producto_nombre,
                    p.codigo as producto_codigo
                FROM detalles_venta dv
                JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = %s
            """, (id_venta,))
            
            venta['detalles'] = cursor.fetchall()
            return venta
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener venta {id_venta}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
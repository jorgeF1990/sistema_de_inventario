# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import logging

from api.database.connection import execute_query, execute_update, execute_insert
from api.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/productos", tags=["Productos"])

@router.get("")
async def get_productos(
    current_user: dict = Depends(get_current_user),
    categoria: Optional[int] = Query(None),
    proveedor: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    try:
        empresa_id = current_user['id_empresa']
        
        query = """
            SELECT 
                p.id_producto,
                p.codigo,
                p.nombre,
                p.descripcion,
                p.stock_actual,
                p.stock_minimo,
                p.precio_compra,
                p.precio_venta,
                p.ubicacion,
                p.unidad_medida,
                p.id_categoria,
                c.nombre as categoria_nombre,
                p.id_proveedor,
                pr.nombre as proveedor_nombre,
                CASE 
                    WHEN p.stock_actual = 0 THEN 'SIN STOCK'
                    WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK BAJO'
                    ELSE 'NORMAL'
                END as estado_stock
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
            WHERE p.activo = 1 AND p.id_empresa = %s
        """
        params = [empresa_id]
        
        if categoria:
            query += " AND p.id_categoria = %s"
            params.append(categoria)
        if proveedor:
            query += " AND p.id_proveedor = %s"
            params.append(proveedor)
        if estado:
            if estado == 'SIN STOCK':
                query += " AND p.stock_actual = 0"
            elif estado == 'STOCK BAJO':
                query += " AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0"
        
        query += " ORDER BY p.nombre LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        result = execute_query(query, tuple(params))
        return result
        
    except Exception as e:
        logger.error(f"Error en get_productos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def crear_producto(
    producto: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['id_empresa']
        
        if not producto.get('codigo') or not producto.get('nombre'):
            raise HTTPException(status_code=400, detail="Codigo y nombre son requeridos")
        
        check_query = "SELECT id_producto FROM productos WHERE codigo = %s AND id_empresa = %s"
        existing = execute_query(check_query, (producto['codigo'], empresa_id))
        if existing:
            raise HTTPException(status_code=400, detail="El codigo ya existe en esta empresa")
        
        query = """
            INSERT INTO productos 
            (codigo, nombre, descripcion, id_categoria, id_proveedor, 
             precio_compra, precio_venta, stock_actual, stock_minimo, 
             ubicacion, unidad_medida, id_empresa, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        producto_id = execute_insert(query, (
            producto.get('codigo'),
            producto.get('nombre'),
            producto.get('descripcion', ''),
            producto.get('id_categoria') if producto.get('id_categoria') else None,
            producto.get('id_proveedor') if producto.get('id_proveedor') else None,
            producto.get('precio_compra', 0),
            producto.get('precio_venta', 0),
            producto.get('stock_actual', 0),
            producto.get('stock_minimo', 5),
            producto.get('ubicacion', ''),
            producto.get('unidad_medida', 'unidad'),
            empresa_id,
            1
        ))
        
        logger.info(f"Producto creado: {producto['codigo']} - Empresa ID: {empresa_id}")
        
        return {
            "message": "Producto creado correctamente",
            "id_producto": producto_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear producto: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categorias")
async def get_categorias(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        query = """
            SELECT id_categoria, nombre, descripcion 
            FROM categorias 
            WHERE activo = 1 AND id_empresa = %s 
            ORDER BY nombre
        """
        return execute_query(query, (empresa_id,))
    except Exception as e:
        logger.error(f"Error en get_categorias: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categorias")
async def crear_categoria(
    categoria: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['id_empresa']
        
        if not categoria.get('nombre'):
            raise HTTPException(status_code=400, detail="El nombre de la categoria es requerido")
        
        check_query = "SELECT id_categoria FROM categorias WHERE nombre = %s AND id_empresa = %s"
        existing = execute_query(check_query, (categoria['nombre'], empresa_id))
        if existing:
            return {"message": "La categoria ya existe", "id_categoria": existing[0]['id_categoria']}
        
        query = """
            INSERT INTO categorias (nombre, descripcion, id_empresa, activo)
            VALUES (%s, %s, %s, %s)
        """
        categoria_id = execute_insert(query, (
            categoria['nombre'],
            categoria.get('descripcion', ''),
            empresa_id,
            1
        ))
        
        return {
            "message": "Categoria creada correctamente",
            "id_categoria": categoria_id
        }
        
    except Exception as e:
        logger.error(f"Error al crear categoria: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proveedores")
async def get_proveedores(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        query = """
            SELECT id_proveedor, nombre, ruc, telefono, email 
            FROM proveedores 
            WHERE activo = 1 AND id_empresa = %s 
            ORDER BY nombre
        """
        return execute_query(query, (empresa_id,))
    except Exception as e:
        logger.error(f"Error en get_proveedores: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alertas")
async def get_alertas(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        query = """
            SELECT 
                id_producto,
                codigo,
                nombre,
                stock_actual,
                stock_minimo,
                CASE 
                    WHEN stock_actual = 0 THEN 'SIN STOCK'
                    ELSE 'STOCK BAJO'
                END as estado_stock
            FROM productos
            WHERE stock_actual <= stock_minimo 
            AND activo = 1 
            AND id_empresa = %s
            ORDER BY stock_actual, nombre
        """
        return execute_query(query, (empresa_id,))
    except Exception as e:
        logger.error(f"Error en get_alertas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id_producto}")
async def actualizar_producto(
    id_producto: int,
    producto: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['id_empresa']
        
        check_query = "SELECT id_producto FROM productos WHERE id_producto = %s AND id_empresa = %s"
        existing = execute_query(check_query, (id_producto, empresa_id))
        if not existing:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        query = """
            UPDATE productos 
            SET codigo = %s, nombre = %s, descripcion = %s, 
                id_categoria = %s, id_proveedor = %s,
                precio_compra = %s, precio_venta = %s, 
                stock_actual = %s, stock_minimo = %s,
                ubicacion = %s, unidad_medida = %s
            WHERE id_producto = %s AND id_empresa = %s
        """
        execute_update(query, (
            producto.get('codigo'),
            producto.get('nombre'),
            producto.get('descripcion', ''),
            producto.get('id_categoria') if producto.get('id_categoria') else None,
            producto.get('id_proveedor') if producto.get('id_proveedor') else None,
            producto.get('precio_compra', 0),
            producto.get('precio_venta', 0),
            producto.get('stock_actual', 0),
            producto.get('stock_minimo', 5),
            producto.get('ubicacion', ''),
            producto.get('unidad_medida', 'unidad'),
            id_producto,
            empresa_id
        ))
        
        return {"message": "Producto actualizado correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar producto: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id_producto}")
async def delete_producto(
    id_producto: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['id_empresa']
        
        check_query = """
            SELECT id_producto 
            FROM productos 
            WHERE id_producto = %s AND activo = 1 AND id_empresa = %s
        """
        result = execute_query(check_query, (id_producto, empresa_id))
        
        if not result:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        query = "UPDATE productos SET activo = 0 WHERE id_producto = %s AND id_empresa = %s"
        execute_update(query, (id_producto, empresa_id))
        
        return {"message": "Producto eliminado correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en delete_producto: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# AJUSTAR STOCK - CORREGIDO USANDO id_tipo_movimiento
# ============================================================

@router.post("/{id_producto}/ajustar-stock")
async def ajustar_stock(
    id_producto: int,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['id_empresa']
        
        cantidad = data.get('cantidad', 0)
        id_tipo_movimiento = data.get('tipo_movimiento', 3)
        motivo = data.get('motivo', 'Ajuste manual')
        
        if cantidad == 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser diferente de 0")
        
        # Verificar que el producto existe
        check_query = """
            SELECT id_producto, stock_actual, nombre 
            FROM productos 
            WHERE id_producto = %s AND activo = 1 AND id_empresa = %s
        """
        result = execute_query(check_query, (id_producto, empresa_id))
        
        if not result:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        producto = result[0]
        stock_actual = producto['stock_actual']
        stock_nuevo = stock_actual + cantidad
        
        if stock_nuevo < 0:
            raise HTTPException(status_code=400, detail="Stock insuficiente")
        
        # Actualizar stock
        update_query = """
            UPDATE productos 
            SET stock_actual = %s 
            WHERE id_producto = %s AND id_empresa = %s
        """
        execute_update(update_query, (stock_nuevo, id_producto, empresa_id))
        
        # Registrar movimiento - USANDO id_tipo_movimiento (nombre correcto)
        movimiento_query = """
            INSERT INTO movimientos_stock 
            (id_producto, cantidad, stock_antes, stock_despues, id_tipo_movimiento, 
             observacion, id_empresa, fecha)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """
        execute_insert(movimiento_query, (
            id_producto,
            cantidad,
            stock_actual,
            stock_nuevo,
            id_tipo_movimiento,
            motivo,
            empresa_id
        ))
        
        logger.info(f"Stock ajustado: Producto {producto['nombre']} - Cantidad: {cantidad} - Nuevo stock: {stock_nuevo}")
        
        return {
            "message": "Stock ajustado correctamente",
            "stock_anterior": stock_actual,
            "stock_nuevo": stock_nuevo,
            "cantidad_ajustada": cantidad
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al ajustar stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))
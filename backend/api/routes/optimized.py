# -*- coding: utf-8 -*-
from fastapi import APIRouter, Query, Depends
from typing import Optional
from api.database.connection import execute_query
from api.utils.auth import get_current_user

router = APIRouter(prefix="/api/optimized", tags=["Optimized"])

@router.get("/dashboard-completo")
async def get_dashboard_completo(current_user: dict = Depends(get_current_user)):
    try:
        # OBTENER ID DE EMPRESA DEL USUARIO
        empresa_id = current_user['id_empresa']
        
        # Obtener resumen filtrado por empresa
        resumen = execute_query(
            "SELECT * FROM vw_dashboard_resumen WHERE id_empresa = %s",
            (empresa_id,)
        )
        
        # Obtener alertas filtradas por empresa
        alertas = execute_query(
            "SELECT * FROM vw_stock_alertas WHERE id_empresa = %s LIMIT 10",
            (empresa_id,)
        )
        
        # Obtener ventas diarias filtradas por empresa
        ventas_diario = execute_query(
            "SELECT * FROM vw_resumen_ventas_diario WHERE id_empresa = %s LIMIT 7",
            (empresa_id,)
        )
        
        # Obtener top productos de la empresa
        top_productos = execute_query("""
            SELECT 
                p.id_producto,
                p.codigo,
                p.nombre,
                COALESCE(SUM(vd.cantidad), 0) AS total_vendido,
                COUNT(DISTINCT vd.id_venta) AS numero_ventas,
                COALESCE(SUM(vd.subtotal), 0) AS ingreso_total
            FROM productos p
            LEFT JOIN detalles_venta vd ON p.id_producto = vd.id_producto
            LEFT JOIN ventas v ON vd.id_venta = v.id_venta AND v.id_estado = 2
            WHERE p.activo = 1 AND p.id_empresa = %s
            GROUP BY p.id_producto, p.codigo, p.nombre
            HAVING total_vendido > 0
            ORDER BY total_vendido DESC
            LIMIT 5
        """, (empresa_id,))
        
        return {
            "resumen": resumen[0] if resumen else {},
            "alertas": alertas,
            "ventasDiario": ventas_diario,
            "topProductos": top_productos,
            "ultimaActualizacion": "2026-07-30T00:00:00Z"
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        result = execute_query(
            "SELECT * FROM vw_dashboard_resumen WHERE id_empresa = %s",
            (empresa_id,)
        )
        return result[0] if result else {}
    except Exception as e:
        return {"error": str(e)}

@router.get("/productos-stock")
async def get_productos_stock(
    current_user: dict = Depends(get_current_user),
    categoria: Optional[str] = Query(None),
    proveedor: Optional[str] = Query(None),
    estado: Optional[str] = Query(None)
):
    try:
        empresa_id = current_user['id_empresa']
        query = "SELECT * FROM vw_resumen_productos WHERE id_empresa = %s"
        params = [empresa_id]
        
        if categoria:
            query += " AND categoria_nombre = %s"
            params.append(categoria)
        if proveedor:
            query += " AND proveedor_nombre = %s"
            params.append(proveedor)
        if estado:
            query += " AND estado_stock = %s"
            params.append(estado)
        
        query += " ORDER BY nombre"
        return execute_query(query, tuple(params))
    except Exception as e:
        return {"error": str(e)}

@router.get("/alertas-stock")
async def get_alertas_stock(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        return execute_query(
            "SELECT * FROM vw_stock_alertas WHERE id_empresa = %s",
            (empresa_id,)
        )
    except Exception as e:
        return {"error": str(e)}

@router.get("/ventas-diario")
async def get_ventas_diario(
    current_user: dict = Depends(get_current_user),
    dias: int = Query(30)
):
    try:
        empresa_id = current_user['id_empresa']
        query = "SELECT * FROM vw_resumen_ventas_diario WHERE id_empresa = %s LIMIT %s"
        return execute_query(query, (empresa_id, dias))
    except Exception as e:
        return {"error": str(e)}

@router.get("/top-productos")
async def get_top_productos(
    current_user: dict = Depends(get_current_user),
    limite: int = Query(10)
):
    try:
        empresa_id = current_user['id_empresa']
        # Usar consulta directa en lugar de vista para filtrar por empresa
        query = """
            SELECT 
                p.id_producto,
                p.codigo,
                p.nombre,
                COALESCE(SUM(vd.cantidad), 0) AS total_vendido,
                COUNT(DISTINCT vd.id_venta) AS numero_ventas,
                COALESCE(SUM(vd.subtotal), 0) AS ingreso_total
            FROM productos p
            LEFT JOIN detalles_venta vd ON p.id_producto = vd.id_producto
            LEFT JOIN ventas v ON vd.id_venta = v.id_venta AND v.id_estado = 2
            WHERE p.activo = 1 AND p.id_empresa = %s
            GROUP BY p.id_producto, p.codigo, p.nombre
            HAVING total_vendido > 0
            ORDER BY total_vendido DESC
            LIMIT %s
        """
        return execute_query(query, (empresa_id, limite))
    except Exception as e:
        return {"error": str(e)}

@router.get("/ventas-cliente")
async def get_ventas_cliente(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        return execute_query("""
            SELECT * FROM vw_ventas_por_cliente 
            WHERE id_empresa = %s
            ORDER BY total_gastado DESC 
            LIMIT 10
        """, (empresa_id,))
    except Exception as e:
        return {"error": str(e)}
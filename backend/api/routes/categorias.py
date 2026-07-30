# -*- coding: utf-8 -*-
"""
Rutas para Gestion de Categorias - Multi-empresa
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List
import logging
import traceback

from ..database.connection import get_db
from ..utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/categorias", tags=["Categorias"])

class CategoriaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    activo: bool = True

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None

class CategoriaResponse(CategoriaBase):
    id_categoria: int
    fecha_creacion: Optional[str] = None

@router.get("/", response_model=List[CategoriaResponse])
async def get_categorias(current_user: dict = Depends(get_current_user)):
    """Obtiene todas las categorias de la empresa"""
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_categoria, nombre, descripcion, activo, fecha_creacion
                FROM categorias 
                WHERE id_empresa = %s
                ORDER BY nombre
            """, (empresa_id,))
            categorias = cursor.fetchall()
            for c in categorias:
                if c.get('fecha_creacion'):
                    c['fecha_creacion'] = str(c['fecha_creacion'])
            return categorias
    except Exception as e:
        logger.error(f"Error al obtener categorias: {e}")
        return []

@router.post("/", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
async def crear_categoria(categoria: CategoriaCreate, current_user: dict = Depends(get_current_user)):
    """Crea una nueva categoria para la empresa"""
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            # Verificar nombre único en la empresa
            cursor.execute(
                "SELECT id_categoria FROM categorias WHERE nombre = %s AND id_empresa = %s",
                (categoria.nombre, empresa_id)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Ya existe una categoria con ese nombre")
            
            cursor.execute("""
                INSERT INTO categorias (nombre, descripcion, activo, id_empresa)
                VALUES (%s, %s, %s, %s)
            """, (categoria.nombre, categoria.descripcion, categoria.activo, empresa_id))
            conn.commit()
            id_categoria = cursor.lastrowid
            
            cursor.execute("""
                SELECT id_categoria, nombre, descripcion, activo, fecha_creacion
                FROM categorias WHERE id_categoria = %s
            """, (id_categoria,))
            nueva_categoria = cursor.fetchone()
            if nueva_categoria and nueva_categoria.get('fecha_creacion'):
                nueva_categoria['fecha_creacion'] = str(nueva_categoria['fecha_creacion'])
            
            logger.info(f"Categoria creada: {categoria.nombre} - Empresa: {empresa_id}")
            return nueva_categoria
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear categoria: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id_categoria}", response_model=CategoriaResponse)
async def actualizar_categoria(
    id_categoria: int, 
    categoria: CategoriaUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Actualiza una categoria de la empresa"""
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            # Verificar que la categoria existe y pertenece a la empresa
            cursor.execute(
                "SELECT id_categoria FROM categorias WHERE id_categoria = %s AND id_empresa = %s",
                (id_categoria, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Categoria no encontrada")
            
            updates = []
            values = []
            update_data = categoria.model_dump(exclude_unset=True)
            
            for field, value in update_data.items():
                if value is not None:
                    updates.append(f"{field} = %s")
                    values.append(value)
            
            if not updates:
                raise HTTPException(status_code=400, detail="No hay campos para actualizar")
            
            values.append(id_categoria)
            values.append(empresa_id)
            query = f"UPDATE categorias SET {', '.join(updates)} WHERE id_categoria = %s AND id_empresa = %s"
            
            cursor.execute(query, values)
            conn.commit()
            
            cursor.execute("""
                SELECT id_categoria, nombre, descripcion, activo, fecha_creacion
                FROM categorias WHERE id_categoria = %s
            """, (id_categoria,))
            categoria_actualizada = cursor.fetchone()
            if categoria_actualizada and categoria_actualizada.get('fecha_creacion'):
                categoria_actualizada['fecha_creacion'] = str(categoria_actualizada['fecha_creacion'])
            
            return categoria_actualizada
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar categoria: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id_categoria}")
async def eliminar_categoria(id_categoria: int, current_user: dict = Depends(get_current_user)):
    """Elimina una categoria de la empresa"""
    try:
        empresa_id = current_user['empresa_id']
        
        with get_db() as (conn, cursor):
            cursor.execute(
                "DELETE FROM categorias WHERE id_categoria = %s AND id_empresa = %s",
                (id_categoria, empresa_id)
            )
            conn.commit()
            return {"message": "Categoria eliminada correctamente"}
    except Exception as e:
        logger.error(f"Error al eliminar categoria: {e}")
        raise HTTPException(status_code=500, detail=str(e))

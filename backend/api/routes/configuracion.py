# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from api.database.connection import get_db
from api.utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/configuracion", tags=["Configuracion"])

class ConfiguracionEmpresa(BaseModel):
    empresa: str
    direccion: Optional[str] = ""
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    ruc: Optional[str] = ""
    iva: float = 21.0
    stock_minimo_default: int = 5
    alertas_stock: bool = True
    notificaciones_email: bool = False
    moneda: str = "ARS"

class Cliente(BaseModel):
    id_cliente: Optional[int] = None
    nombre: str
    ruc: Optional[str] = ""
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    tipo: str = "CONSUMIDOR FINAL"

class Proveedor(BaseModel):
    id_proveedor: Optional[int] = None
    nombre: str
    ruc: Optional[str] = ""
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    contacto_nombre: Optional[str] = ""
    contacto_telefono: Optional[str] = ""

# ============================================================
# CONFIGURACION DE EMPRESA
# ============================================================

@router.get("/")
async def get_configuracion(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            cursor.execute(
                "SELECT * FROM empresas WHERE id_empresa = %s AND activo = TRUE",
                (empresa_id,)
            )
            empresa = cursor.fetchone()
            if empresa:
                return {
                    "empresa": empresa['nombre'],
                    "direccion": empresa['direccion'] or "",
                    "telefono": empresa['telefono'] or "",
                    "email": empresa['email'] or "",
                    "website": "",
                    "ruc": empresa['ruc'] or "",
                    "iva": float(empresa['iva']) if empresa['iva'] else 21.0,
                    "stock_minimo_default": empresa['stock_minimo_default'] or 5,
                    "alertas_stock": True,
                    "notificaciones_email": False,
                    "moneda": empresa['moneda'] or "ARS"
                }
        return {}
    except Exception as e:
        logger.error(f"Error al obtener configuracion: {e}")
        return {}

@router.post("/")
async def guardar_configuracion(config: ConfiguracionEmpresa, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            cursor.execute("""
                UPDATE empresas 
                SET nombre = %s, ruc = %s, telefono = %s, email = %s, direccion = %s,
                    moneda = %s, iva = %s, stock_minimo_default = %s
                WHERE id_empresa = %s
            """, (
                config.empresa, config.ruc, config.telefono, config.email,
                config.direccion, config.moneda, config.iva,
                config.stock_minimo_default, empresa_id
            ))
            conn.commit()
        return {"message": "Configuracion guardada correctamente"}
    except Exception as e:
        logger.error(f"Error al guardar configuracion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# CLIENTES
# ============================================================

@router.get("/clientes")
async def get_clientes(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_cliente, nombre, ruc, telefono, email, direccion, tipo, activo
                FROM clientes
                WHERE id_empresa = %s AND activo = TRUE
                ORDER BY nombre
            """, (empresa_id,))
            return cursor.fetchall()
    except Exception as e:
        logger.error(f"Error al obtener clientes: {e}")
        return []

@router.post("/clientes")
async def crear_cliente(cliente: Cliente, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            cursor.execute("""
                INSERT INTO clientes (nombre, ruc, telefono, email, direccion, tipo, id_empresa)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (cliente.nombre, cliente.ruc, cliente.telefono, 
                  cliente.email, cliente.direccion, cliente.tipo, empresa_id))
            conn.commit()
            return {"message": "Cliente creado correctamente", "id": cursor.lastrowid}
    except Exception as e:
        logger.error(f"Error al crear cliente: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/clientes/{id_cliente}")
async def actualizar_cliente(id_cliente: int, cliente: Cliente, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            # Verificar que el cliente existe
            cursor.execute(
                "SELECT id_cliente FROM clientes WHERE id_cliente = %s AND id_empresa = %s",
                (id_cliente, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cliente no encontrado"
                )
            
            cursor.execute("""
                UPDATE clientes 
                SET nombre = %s, ruc = %s, telefono = %s, email = %s, direccion = %s, tipo = %s
                WHERE id_cliente = %s AND id_empresa = %s
            """, (cliente.nombre, cliente.ruc, cliente.telefono, 
                  cliente.email, cliente.direccion, cliente.tipo, id_cliente, empresa_id))
            conn.commit()
            return {"message": "Cliente actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar cliente: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clientes/{id_cliente}")
async def eliminar_cliente(id_cliente: int, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            # Verificar que el cliente existe
            cursor.execute(
                "SELECT id_cliente FROM clientes WHERE id_cliente = %s AND id_empresa = %s",
                (id_cliente, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Cliente no encontrado"
                )
            
            cursor.execute(
                "UPDATE clientes SET activo = FALSE WHERE id_cliente = %s AND id_empresa = %s",
                (id_cliente, empresa_id)
            )
            conn.commit()
            return {"message": "Cliente eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar cliente: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# PROVEEDORES
# ============================================================

@router.get("/proveedores")
async def get_proveedores_config(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_proveedor, nombre, ruc, telefono, email, direccion, 
                       contacto_nombre, contacto_telefono, activo
                FROM proveedores
                WHERE id_empresa = %s AND activo = TRUE
                ORDER BY nombre
            """, (empresa_id,))
            return cursor.fetchall()
    except Exception as e:
        logger.error(f"Error al obtener proveedores: {e}")
        return []

@router.post("/proveedores")
async def crear_proveedor_config(proveedor: Proveedor, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            cursor.execute("""
                INSERT INTO proveedores 
                (nombre, ruc, telefono, email, direccion, contacto_nombre, contacto_telefono, id_empresa)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (proveedor.nombre, proveedor.ruc, proveedor.telefono,
                  proveedor.email, proveedor.direccion, 
                  proveedor.contacto_nombre, proveedor.contacto_telefono, empresa_id))
            conn.commit()
            return {"message": "Proveedor creado correctamente", "id": cursor.lastrowid}
    except Exception as e:
        logger.error(f"Error al crear proveedor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/proveedores/{id_proveedor}")
async def actualizar_proveedor_config(id_proveedor: int, proveedor: Proveedor, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            # Verificar que el proveedor existe
            cursor.execute(
                "SELECT id_proveedor FROM proveedores WHERE id_proveedor = %s AND id_empresa = %s",
                (id_proveedor, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado"
                )
            
            cursor.execute("""
                UPDATE proveedores 
                SET nombre = %s, ruc = %s, telefono = %s, email = %s, direccion = %s,
                    contacto_nombre = %s, contacto_telefono = %s
                WHERE id_proveedor = %s AND id_empresa = %s
            """, (proveedor.nombre, proveedor.ruc, proveedor.telefono,
                  proveedor.email, proveedor.direccion,
                  proveedor.contacto_nombre, proveedor.contacto_telefono, id_proveedor, empresa_id))
            conn.commit()
            return {"message": "Proveedor actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar proveedor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/proveedores/{id_proveedor}")
async def eliminar_proveedor_config(id_proveedor: int, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            # Verificar que el proveedor existe
            cursor.execute(
                "SELECT id_proveedor FROM proveedores WHERE id_proveedor = %s AND id_empresa = %s",
                (id_proveedor, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proveedor no encontrado"
                )
            
            cursor.execute(
                "UPDATE proveedores SET activo = FALSE WHERE id_proveedor = %s AND id_empresa = %s",
                (id_proveedor, empresa_id)
            )
            conn.commit()
            return {"message": "Proveedor eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar proveedor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# USUARIOS - CORREGIDO
# ============================================================

@router.get("/usuarios")
async def get_usuarios(current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_usuario, nombre_usuario, nombre_completo, email, id_rol, activo
                FROM usuarios
                WHERE id_empresa = %s
                ORDER BY nombre_usuario
            """, (empresa_id,))
            return cursor.fetchall()
    except Exception as e:
        logger.error(f"Error al obtener usuarios: {e}")
        return []

@router.post("/usuarios")
async def crear_usuario(usuario: dict, current_user: dict = Depends(get_current_user)):
    try:
        empresa_id = current_user['id_empresa']
        nombre_usuario = usuario.get('nombre_usuario', '').lower().strip()
        
        with get_db() as (conn, cursor):
            # Verificar si el usuario ya existe en esta empresa
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE nombre_usuario = %s AND id_empresa = %s",
                (nombre_usuario, empresa_id)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El nombre de usuario ya existe en esta empresa"
                )
            
            import bcrypt
            hashed = bcrypt.hashpw(
                usuario.get('contrasena', 'admin123').encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            cursor.execute("""
                INSERT INTO usuarios 
                (nombre_usuario, nombre_completo, email, contrasena, id_rol, id_empresa, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                nombre_usuario,
                usuario.get('nombre_completo', ''),
                usuario.get('email', ''),
                hashed,
                usuario.get('id_rol', 2),
                empresa_id,
                usuario.get('activo', True)
            ))
            conn.commit()
            return {"message": "Usuario creado correctamente", "id": cursor.lastrowid}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# ACTUALIZAR USUARIO - CORREGIDO
# ============================================================

@router.put("/usuarios/{id_usuario}")
async def actualizar_usuario(
    id_usuario: int,
    usuario: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['id_empresa']
        
        with get_db() as (conn, cursor):
            # Verificar que el usuario existe y pertenece a la empresa
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE id_usuario = %s AND id_empresa = %s",
                (id_usuario, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado en esta empresa"
                )
            
            updates = []
            values = []
            for key in ['nombre_completo', 'email', 'id_rol', 'activo']:
                if key in usuario:
                    updates.append(f"{key} = %s")
                    values.append(usuario[key])
            
            if not updates:
                return {"message": "No hay datos para actualizar"}
            
            values.append(id_usuario)
            values.append(empresa_id)
            cursor.execute(f"""
                UPDATE usuarios SET {', '.join(updates)} 
                WHERE id_usuario = %s AND id_empresa = %s
            """, values)
            conn.commit()
            return {"message": "Usuario actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# ELIMINAR USUARIO - CORREGIDO
# ============================================================

@router.delete("/usuarios/{id_usuario}")
async def eliminar_usuario(
    id_usuario: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        empresa_id = current_user['id_empresa']
        
        # No permitir eliminarse a sí mismo
        if id_usuario == current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes eliminarte a ti mismo"
            )
        
        with get_db() as (conn, cursor):
            # Verificar que el usuario existe y pertenece a la empresa
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE id_usuario = %s AND id_empresa = %s",
                (id_usuario, empresa_id)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado en esta empresa"
                )
            
            # Eliminar usuario
            cursor.execute(
                "DELETE FROM usuarios WHERE id_usuario = %s AND id_empresa = %s",
                (id_usuario, empresa_id)
            )
            conn.commit()
            return {"message": "Usuario eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))
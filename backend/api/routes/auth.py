# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import logging
from jose import jwt
import bcrypt
import secrets
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

from api.database.connection import get_db, execute_query, execute_insert, execute_update
from api.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class LoginRequest(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class EmpresaRegistro(BaseModel):
    nombre: str
    ruc: Optional[str] = ""
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    direccion: Optional[str] = ""
    moneda: str = "ARS"
    iva: float = 21.0
    stock_minimo_default: int = 5

class UsuarioRegistro(BaseModel):
    nombre_usuario: str
    contrasena: str
    nombre_completo: str
    email: EmailStr
    empresa: EmpresaRegistro

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

# ============================================================
# FUNCION PARA ENVIAR EMAIL DE RECUPERACION
# ============================================================

def send_reset_email(email: str, nombre: str, token: str) -> bool:
    """Envía email con enlace de recuperación"""
    try:
        reset_link = f"http://localhost:5173/reset-password?token={token}"
        
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        smtp_user = os.getenv('SMTP_USER', '')
        smtp_password = os.getenv('SMTP_PASSWORD', '')
        
        # Si no hay credenciales, mostrar en consola (modo debug)
        if not smtp_user or not smtp_password:
            logger.info(f"=== EMAIL DE RECUPERACION (MODO DEMO) ===")
            logger.info(f"Para: {email}")
            logger.info(f"Nombre: {nombre}")
            logger.info(f"Enlace: {reset_link}")
            logger.info(f"Token: {token}")
            logger.info(f"==========================================")
            return True
        
        # Crear mensaje
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = email
        msg['Subject'] = 'Recuperacion de Contraseña - Control de Stock'
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1A2332;">Recuperacion de Contraseña</h2>
            <p>Hola <strong>{nombre}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
            <p>Para crear una nueva contraseña, haz clic en el siguiente boton:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background-color: #3498DB; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Restablecer Contraseña
                </a>
            </p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #3498DB; font-size: 12px;">{reset_link}</p>
            <p><strong>Este enlace expirara en 1 hora.</strong></p>
            <p>Si no solicitaste este cambio, ignora este mensaje.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Sistema de Control de Stock</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        logger.info(f"Email de recuperacion enviado a {email}")
        return True
        
    except Exception as e:
        logger.error(f"Error al enviar email: {e}")
        return False

@router.post("/login")
async def login(request: LoginRequest):
    try:
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    u.id_usuario,
                    u.nombre_usuario,
                    u.nombre_completo,
                    u.email,
                    u.id_rol,
                    u.id_empresa,
                    u.contrasena,
                    u.activo,
                    e.nombre as empresa_nombre
                FROM usuarios u
                LEFT JOIN empresas e ON u.id_empresa = e.id_empresa
                WHERE u.nombre_usuario = %s AND u.activo = TRUE
            """, (request.username,))
            
            usuario = cursor.fetchone()
            
            if not usuario:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario o contrasena incorrectos"
                )
            
            if not verify_password(request.password, usuario['contrasena']):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario o contrasena incorrectos"
                )
            
            token_data = {
                "sub": usuario['nombre_usuario'],
                "id": usuario['id_usuario'],
                "nombre": usuario['nombre_completo'],
                "rol": usuario['id_rol'],
                "empresa_id": usuario['id_empresa']
            }
            access_token = create_access_token(token_data)
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "usuario": {
                    "id": usuario['id_usuario'],
                    "nombre_usuario": usuario['nombre_usuario'],
                    "nombre_completo": usuario['nombre_completo'],
                    "email": usuario['email'],
                    "id_rol": usuario['id_rol'],
                    "id_empresa": usuario['id_empresa']
                },
                "empresa": {
                    "id": usuario['id_empresa'],
                    "nombre": usuario['empresa_nombre']
                } if usuario['id_empresa'] else None,
                "tiene_empresa": usuario['id_empresa'] is not None
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/registro")
async def registro(usuario: UsuarioRegistro):
    try:
        with get_db() as (conn, cursor):
            conn.start_transaction()
            
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE nombre_usuario = %s",
                (usuario.nombre_usuario,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El nombre de usuario ya existe"
                )
            
            cursor.execute(
                "SELECT id_usuario FROM usuarios WHERE email = %s",
                (usuario.email,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El email ya esta registrado"
                )
            
            cursor.execute("""
                INSERT INTO empresas 
                (nombre, ruc, telefono, email, direccion, moneda, iva, stock_minimo_default)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                usuario.empresa.nombre,
                usuario.empresa.ruc or '',
                usuario.empresa.telefono or '',
                usuario.empresa.email or '',
                usuario.empresa.direccion or '',
                usuario.empresa.moneda,
                usuario.empresa.iva,
                usuario.empresa.stock_minimo_default
            ))
            
            id_empresa = cursor.lastrowid
            
            hashed = hash_password(usuario.contrasena)
            cursor.execute("""
                INSERT INTO usuarios 
                (nombre_usuario, contrasena, nombre_completo, email, id_rol, id_empresa, activo)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                usuario.nombre_usuario,
                hashed,
                usuario.nombre_completo,
                usuario.email,
                1,
                id_empresa,
                True
            ))
            
            conn.commit()
            
            logger.info(f"Usuario registrado: {usuario.nombre_usuario}")
            
            return {
                "message": "Usuario registrado correctamente",
                "id_usuario": cursor.lastrowid,
                "id_empresa": id_empresa,
                "nombre_usuario": usuario.nombre_usuario,
                "empresa": usuario.empresa.nombre
            }
            
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error al registrar usuario: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    try:
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_usuario, nombre_usuario, nombre_completo, email
                FROM usuarios 
                WHERE email = %s AND activo = TRUE
            """, (request.email,))
            
            usuario = cursor.fetchone()
            
            if not usuario:
                return {
                    "message": "Si el email esta registrado, recibiras un enlace de recuperacion.",
                    "success": True
                }
            
            token = generate_reset_token()
            expiracion = datetime.now() + timedelta(hours=1)
            
            cursor.execute("""
                INSERT INTO password_resets (id_usuario, token, expiracion)
                VALUES (%s, %s, %s)
            """, (usuario['id_usuario'], token, expiracion))
            conn.commit()
            
            # ENVIAR EMAIL
            email_enviado = send_reset_email(
                usuario['email'],
                usuario['nombre_completo'],
                token
            )
            
            if email_enviado:
                logger.info(f"Email de recuperacion enviado a {usuario['email']}")
                return {
                    "message": "Se ha enviado un enlace de recuperacion a tu email.",
                    "success": True
                }
            else:
                # Si falla el email, devolver el token para debug
                reset_link = f"http://localhost:5173/reset-password?token={token}"
                logger.info(f"=== ENLACE DE RECUPERACION (FALLO EMAIL) ===")
                logger.info(f"Email: {usuario['email']}")
                logger.info(f"Enlace: {reset_link}")
                logger.info(f"Token: {token}")
                logger.info(f"==========================================")
                return {
                    "message": "No se pudo enviar el email. Contacte al administrador.",
                    "success": False,
                    "debug_token": token
                }
            
    except Exception as e:
        logger.error(f"Error en forgot-password: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    try:
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_reset, id_usuario, expiracion, usado
                FROM password_resets 
                WHERE token = %s AND usado = FALSE
            """, (request.token,))
            
            reset = cursor.fetchone()
            
            if not reset:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token invalido o ya utilizado"
                )
            
            if reset['expiracion'] < datetime.now():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El token ha expirado"
                )
            
            hashed = hash_password(request.new_password)
            
            cursor.execute("""
                UPDATE usuarios SET contrasena = %s
                WHERE id_usuario = %s
            """, (hashed, reset['id_usuario']))
            
            cursor.execute("""
                UPDATE password_resets SET usado = TRUE
                WHERE id_reset = %s
            """, (reset['id_reset'],))
            
            conn.commit()
            
            return {
                "message": "Contraseña actualizada correctamente",
                "success": True
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en reset-password: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify-reset-token")
async def verify_reset_token(token: str):
    try:
        with get_db() as (conn, cursor):
            cursor.execute("""
                SELECT id_reset, expiracion, usado
                FROM password_resets 
                WHERE token = %s
            """, (token,))
            
            reset = cursor.fetchone()
            
            if not reset:
                return {"valid": False, "message": "Token invalido"}
            
            if reset['usado']:
                return {"valid": False, "message": "Token ya utilizado"}
            
            if reset['expiracion'] < datetime.now():
                return {"valid": False, "message": "Token expirado"}
            
            return {"valid": True, "message": "Token valido"}
            
    except Exception as e:
        logger.error(f"Error al verificar token: {e}")
        return {"valid": False, "message": "Error al verificar token"}

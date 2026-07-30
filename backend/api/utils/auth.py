# -*- coding: utf-8 -*-
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

from api.database.connection import execute_query

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'tu_clave_secreta')
ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Obtiene el usuario actual a partir del token JWT.
    Retorna un diccionario con ambos formatos para compatibilidad.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        user_id = payload.get('id')
        username = payload.get('sub')
        
        if user_id is None or username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido"
            )
        
        query = """
            SELECT id_usuario, nombre_usuario, nombre_completo, email, id_rol, id_empresa, activo
            FROM usuarios 
            WHERE id_usuario = %s AND activo = TRUE
        """
        result = execute_query(query, (user_id,))
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )
        
        usuario = result[0]
        
        # Retornar con ambos nombres de clave para compatibilidad
        id_empresa = usuario['id_empresa']
        
        return {
            "id": usuario['id_usuario'],
            "nombre_usuario": usuario['nombre_usuario'],
            "nombre_completo": usuario['nombre_completo'],
            "email": usuario['email'],
            "id_rol": usuario['id_rol'],
            # Clave principal (usada en la mayoría de las rutas)
            "id_empresa": id_empresa,
            # Alias para compatibilidad con rutas que usan 'empresa_id'
            "empresa_id": id_empresa,
            "activo": usuario['activo']
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticacion: {str(e)}"
        )
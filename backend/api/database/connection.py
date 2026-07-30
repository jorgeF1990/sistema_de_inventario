# -*- coding: utf-8 -*-
"""
Conexion a Base de Datos - Optimizado
"""

import os
import logging
from contextlib import contextmanager
from typing import Generator, Tuple, Any, Optional, Dict, List

import mysql.connector
from mysql.connector import pooling, Error
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseConfig:
    @staticmethod
    def get_config() -> Dict[str, any]:
        """Obtiene la configuracion optimizada"""
        host = os.getenv('DB_HOST', 'reseau.proxy.rlwy.net')
        port = int(os.getenv('DB_PORT', 23144))
        
        config = {
            'host': host,
            'port': port,
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'VdkyqjpCsNOaOgmztkiiSdnCxIEuvuAo'),
            'database': os.getenv('DB_NAME', 'railway'),
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_unicode_ci',
            'use_pure': True,
            'pool_name': 'mypool',
            'pool_size': 5,
            'pool_reset_session': True,
            'autocommit': False,
            'connection_timeout': 30,
            'get_warnings': False,
            'raise_on_warnings': False,
        }
        
        logger.info(f"Configuracion: {host}:{port}")
        return config


class DatabasePool:
    _instance = None
    _pool = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._init_pool()
            self._initialized = True
    
    def _init_pool(self):
        try:
            config = DatabaseConfig.get_config()
            self._pool = mysql.connector.pooling.MySQLConnectionPool(**config)
            logger.info("Pool de conexiones inicializado")
            
            test_conn = self._pool.get_connection()
            test_conn.close()
            logger.info("Conexion de prueba exitosa")
            
        except Error as e:
            logger.error(f"Error al inicializar pool: {e}")
            raise RuntimeError(f"Error de conexion: {e}")
    
    @contextmanager
    def get_connection(self) -> Generator[Tuple[Any, Any], None, None]:
        conn = None
        cursor = None
        try:
            conn = self._pool.get_connection()
            cursor = conn.cursor(dictionary=True)
            yield conn, cursor
        except Error as e:
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            logger.error(f"Error en conexion: {e}")
            raise
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def is_connected(self) -> bool:
        try:
            conn = self._pool.get_connection()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error verificando conexion: {e}")
            return False


db_pool = DatabasePool()

def get_db():
    return db_pool.get_connection()

def get_cursor():
    with db_pool.get_connection() as (conn, cursor):
        yield cursor

def execute_query(query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    with db_pool.get_connection() as (conn, cursor):
        cursor.execute(query, params or ())
        return cursor.fetchall()

def execute_insert(query: str, params: Optional[tuple] = None) -> int:
    with db_pool.get_connection() as (conn, cursor):
        cursor.execute(query, params or ())
        conn.commit()
        return cursor.lastrowid

def execute_update(query: str, params: Optional[tuple] = None) -> int:
    with db_pool.get_connection() as (conn, cursor):
        cursor.execute(query, params or ())
        conn.commit()
        return cursor.rowcount

def execute_transaction(queries: List[tuple]) -> bool:
    with db_pool.get_connection() as (conn, cursor):
        try:
            for query, params in queries:
                cursor.execute(query, params)
            conn.commit()
            return True
        except Error as e:
            conn.rollback()
            logger.error(f"Error en transaccion: {e}")
            raise

def execute_many(query: str, params_list: List[tuple]) -> int:
    with db_pool.get_connection() as (conn, cursor):
        cursor.executemany(query, params_list)
        conn.commit()
        return cursor.rowcount

def is_connected() -> bool:
    return db_pool.is_connected()

get_connection = get_db
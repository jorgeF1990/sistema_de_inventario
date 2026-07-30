# -*- coding: utf-8 -*-
"""
Utilidades para operaciones de base de datos
"""

from typing import Dict, Any, List, Optional
from api.database.connection import (
    get_db, 
    execute_query, 
    execute_insert, 
    execute_update, 
    execute_transaction,
    execute_many,
    is_connected
)


def get_table_schema(table_name: str) -> List[Dict[str, Any]]:
    """Obtiene el esquema de una tabla."""
    query = f"DESCRIBE {table_name}"
    return execute_query(query)


def table_exists(table_name: str) -> bool:
    """Verifica si una tabla existe."""
    query = """
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = %s
    """
    result = execute_query(query, (table_name,))
    return result[0]['count'] > 0 if result else False


def get_table_count(table_name: str) -> int:
    """Obtiene el numero de registros de una tabla."""
    query = f"SELECT COUNT(*) as total FROM {table_name}"
    result = execute_query(query)
    return result[0]['total'] if result else 0


def get_table_names() -> List[str]:
    """Obtiene los nombres de todas las tablas."""
    query = "SHOW TABLES"
    result = execute_query(query)
    if not result:
        return []
    key = list(result[0].keys())[0]
    return [row[key] for row in result]


def execute_raw_sql(sql: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    """Ejecuta SQL crudo."""
    return execute_query(sql, params)


def get_connection_info() -> Dict[str, Any]:
    """Obtiene informacion de la conexion a la base de datos."""
    with get_db() as (conn, cursor):
        cursor.execute("SELECT DATABASE() as db, USER() as user, NOW() as time")
        result = cursor.fetchone()
        return {
            'database': result['db'],
            'user': result['user'],
            'server_time': str(result['time']),
            'status': 'connected'
        }


def paginate_query(query: str, params: tuple, page: int = 1, limit: int = 20) -> Dict[str, Any]:
    """Ejecuta una consulta con paginacion."""
    offset = (page - 1) * limit
    
    paginated_query = f"{query} LIMIT %s OFFSET %s"
    paginated_params = list(params) if params else []
    paginated_params.extend([limit, offset])
    
    data = execute_query(paginated_query, tuple(paginated_params))
    
    count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
    count_result = execute_query(count_query, params)
    total = count_result[0]['total'] if count_result else 0
    
    return {
        'data': data,
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit if total > 0 else 0
    }


def get_column_names(table_name: str) -> List[str]:
    """Obtiene los nombres de las columnas de una tabla."""
    query = f"SHOW COLUMNS FROM {table_name}"
    result = execute_query(query)
    return [row['Field'] for row in result]


def get_primary_key(table_name: str) -> Optional[str]:
    """Obtiene el nombre de la clave primaria de una tabla."""
    query = f"SHOW KEYS FROM {table_name} WHERE Key_name = 'PRIMARY'"
    result = execute_query(query)
    return result[0]['Column_name'] if result else None


def check_connection() -> bool:
    """Verifica si la conexion a la base de datos esta activa."""
    return is_connected()


def bulk_insert(table_name: str, columns: List[str], values: List[tuple]) -> int:
    """Inserta multiples registros en una tabla."""
    if not values:
        return 0
    
    placeholders = ', '.join(['%s'] * len(columns))
    columns_str = ', '.join(columns)
    query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
    
    return execute_many(query, values)


def get_db_stats() -> Dict[str, Any]:
    """Obtiene estadisticas de la base de datos."""
    stats = {
        'tables': [],
        'total_tables': 0,
        'total_records': 0
    }
    
    tables = get_table_names()
    stats['total_tables'] = len(tables)
    
    for table in tables:
        count = get_table_count(table)
        stats['tables'].append({
            'name': table,
            'records': count
        })
        stats['total_records'] += count
    
    return stats

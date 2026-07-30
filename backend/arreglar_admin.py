from database.connection import get_db

print("Conectando a la base de datos...")

try:
    with get_db() as (conn, cursor):
        cursor.execute("""
            UPDATE usuarios 
            SET contrasena = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW' 
            WHERE nombre_usuario = 'admin';
        """)
        conn.commit()
        print("¡ÉXITO! La contraseña del usuario 'admin' fue actualizada a 'admin123' (encriptada).")
except Exception as e:
    print(f"Ocurrió un error: {e}")
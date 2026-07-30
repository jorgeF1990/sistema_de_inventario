# Sistema de Control de Stock v3.0.0

Sistema profesional de gestión de inventario multi-empresa con autenticación, dashboards en tiempo real y API REST.

## 📋 Características

- **Multi-empresa**: Cada empresa tiene sus propios datos aislados (productos, proveedores, usuarios, ventas)
- **Autenticación y Autorización**: Login seguro con JWT, roles (Administrador, Vendedor, Encargado de Compras)
- **Gestión de Productos**: CRUD completo, control de stock, alertas de stock bajo
- **Ventas**: Registro de ventas con actualización automática de stock
- **Pedidos**: Gestión de pedidos a proveedores
- **Reportes**: Dashboard con KPIs, gráficos de ventas, productos más vendidos
- **Recuperación de contraseña**: Envío de emails via SMTP
- **Interfaz Responsiva**: Diseño moderno con Material-UI
- **Exportación a CSV**: Reportes exportables

## 🛠️ Tecnologías

### Backend
- **FastAPI** - Framework REST API
- **MySQL** - Base de datos
- **JWT** - Autenticación
- **Bcrypt** - Hash de contraseñas
- **Python 3.13**

### Frontend
- **React 18** - Biblioteca UI
- **Material-UI** - Componentes visuales
- **Chart.js** - Gráficos interactivos
- **Vite** - Build tool
- **Axios** - Cliente HTTP

### Servicios
- **Railway** - Hosting del backend
- **Vercel** - Hosting del frontend
- **Mailtrap** - Servicio de emails para pruebas

## 🚀 Instalación

### Clonar el repositorio

```bash
git clone https://github.com/jorgeF1990/sistema_de_inventario.git
cd sistema_de_inventario


Configurar el Backend
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de base de datos

# Ejecutar el servidor
python -m uvicorn api.index:app --reload --host 0.0.0.0 --port 8000

Configurar el Frontend

cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con la URL del backend

# Ejecutar en desarrollo
npm run dev

📁 Estructura del Proyecto

sistema_de_inventario/
├── backend/
│   ├── api/
│   │   ├── routes/          # Endpoints de la API
│   │   │   ├── auth.py
│   │   │   ├── productos.py
│   │   │   ├── ventas.py
│   │   │   ├── pedidos.py
│   │   │   ├── reportes.py
│   │   │   ├── configuracion.py
│   │   │   └── optimized.py
│   │   ├── database/
│   │   │   └── connection.py
│   │   ├── utils/
│   │   │   └── auth.py
│   │   └── index.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/              # Clientes API
│   │   ├── components/       # Componentes React
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Productos/
│   │   │   ├── Ventas/
│   │   │   ├── Pedidos/
│   │   │   ├── Reportes/
│   │   │   └── Configuracion/
│   │   ├── context/          # Contextos de React
│   │   ├── styles/           # Estilos globales
│   │   └── App.jsx
│   ├── package.json
│   └── .env
└── README.md

🔐 Variables de Entorno
Backend (.env)

# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=stock_db

# JWT
JWT_SECRET_KEY=tu_clave_secreta
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_contraseña_aplicacion

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

Frontend (.env)
env
VITE_API_URL=http://localhost:8000
🚢 Despliegue
Backend (Railway)
Conecta tu repositorio a Railway

Configura el root directory: backend

Añade todas las variables de entorno

El comando de inicio: uvicorn api.index:app --host 0.0.0.0 --port 8000

Frontend (Vercel)
Conecta tu repositorio a Vercel

Configura el root directory: frontend

Añade la variable de entorno: VITE_API_URL

Vercel detectará automáticamente Vite

📊 API Endpoints
Método	Endpoint	Descripción
POST	/api/auth/login	Inicio de sesión
POST	/api/auth/registro	Registro de empresa y usuario
POST	/api/auth/forgot-password	Solicitar recuperación de contraseña
POST	/api/auth/reset-password	Restablecer contraseña
GET	/api/productos	Listar productos
POST	/api/productos	Crear producto
PUT	/api/productos/{id}	Actualizar producto
DELETE	/api/productos/{id}	Eliminar producto
POST	/api/productos/{id}/ajustar-stock	Ajustar stock
GET	/api/productos/categorias	Listar categorías
GET	/api/productos/proveedores	Listar proveedores
GET	/api/ventas/hoy	Ventas del día
GET	/api/ventas/resumen-dia	Resumen de ventas
GET	/api/ventas/periodo	Ventas por período
GET	/api/pedidos/pendientes	Pedidos pendientes
GET	/api/reportes/resumen-general	Resumen general
GET	/api/reportes/movimientos	Movimientos de stock
GET	/api/reportes/productos-mas-vendidos	Productos más vendidos
GET	/api/optimized/dashboard-completo	Dashboard completo
👥 Roles y Permisos
Rol	Permisos
Administrador	Acceso total a todas las funcionalidades
Vendedor	Ventas, consulta de productos y stock
Encargado de Compras	Pedidos, gestión de proveedores
📦 Dependencias
Backend
fastapi

uvicorn

mysql-connector-python

python-dotenv

bcrypt

PyJWT

pydantic

pydantic-settings

Frontend
react

react-dom

@mui/material

@mui/icons-material

chart.js

react-chartjs-2

axios

react-router-dom

react-toastify

🤝 Contribuciones
Las contribuciones son bienvenidas. Por favor:

Fork el repositorio

Crea una rama para tu feature (git checkout -b feature/nueva-funcionalidad)

Commit tus cambios (git commit -m 'Agrega nueva funcionalidad')

Push a la rama (git push origin feature/nueva-funcionalidad)

Abre un Pull Request

📄 Licencia
Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para más detalles.

👤 Autor
Jorge Fernandez

GitHub: @jorgeF1990

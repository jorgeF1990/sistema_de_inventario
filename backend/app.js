const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// IMPORTAR RUTAS EXISTENTES
// ============================================================
const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const pedidosRoutes = require('./routes/pedidos');
const reportesRoutes = require('./routes/reportes');
const configuracionRoutes = require('./routes/configuracion');

// ============================================================
// REGISTRAR RUTAS EXISTENTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/configuracion', configuracionRoutes);

// ============================================================
//  RUTAS OPTIMIZADAS CON VISTAS (AGREGAR AQUÍ)
// ============================================================
const optimizedRoutes = require('./routes/optimized');
app.use('/api/optimized', optimizedRoutes);

// ============================================================
// MANEJO DE ERRORES
// ============================================================
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor'
    });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
    console.log(` API optimizada en http://localhost:${PORT}/api/optimized`);
});

module.exports = app;
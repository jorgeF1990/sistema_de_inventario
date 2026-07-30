import api from './axios';

// ============================================================
// API OPTIMIZADA USANDO VISTAS MATERIALIZADAS
// ============================================================

export const OptimizedAPI = {
  // Dashboard - Usa mv_dashboard_resumen (SUPER RÁPIDO)
  getDashboardResumen: () => 
    api.get('/api/optimized/dashboard-resumen', { timeout: 5000 }),

  // Productos - Usa mv_resumen_productos
  getProductosConStock: () => 
    api.get('/api/optimized/productos-stock', { timeout: 5000 }),

  // Top Productos - Usa mv_top_productos_vendidos
  getTopProductos: (mes) => 
    api.get('/api/optimized/top-productos', { 
      params: { mes },
      timeout: 5000 
    }),

  // Resumen Ventas Diario - Usa mv_resumen_ventas_diario
  getResumenVentasDiario: (fecha) => 
    api.get('/api/optimized/resumen-ventas-diario', { 
      params: { fecha },
      timeout: 5000 
    }),

  // Pedidos - Usa mv_resumen_pedidos
  getResumenPedidos: () => 
    api.get('/api/optimized/resumen-pedidos', { timeout: 5000 }),

  // Movimientos - Usa mv_movimientos_stock
  getMovimientosRecientes: (dias = 30) => 
    api.get('/api/optimized/movimientos', { 
      params: { dias },
      timeout: 5000 
    }),

  // Ventas por Cliente - Usa mv_ventas_por_cliente
  getVentasPorCliente: () => 
    api.get('/api/optimized/ventas-por-cliente', { timeout: 5000 }),
};
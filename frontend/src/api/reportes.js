import api from './axios';

export const ReportesAPI = {
  getResumenGeneral: () => api.get('/api/reportes/resumen-general'),
  getMovimientos: (params) => api.get('/api/reportes/movimientos', { params }),
  getProductosMasVendidos: (limite) => api.get('/api/reportes/productos-mas-vendidos', { params: { limite } }),
  getVentasCompletas: (params) => api.get('/api/reportes/ventas-completas', { params }),
  getComprasCompletas: (params) => api.get('/api/reportes/compras-completas', { params }),
  getPedidosCompletos: (params) => api.get('/api/reportes/pedidos-completos', { params }),
  getMovimientoDetalle: (id) => api.get(`/api/reportes/movimiento/${id}`),
  getMovimientosPorProducto: (idProducto, dias) => 
    api.get('/api/reportes/movimientos-por-producto', { params: { id_producto: idProducto, dias } }),
};
import api from './axios';

export const PedidosAPI = {
  getAll: (params) => api.get('/api/pedidos', { params }),
  getPendientes: () => api.get('/api/pedidos/pendientes'),
  getHistorial: (params) => api.get('/api/pedidos/historial', { params }),
  getDetalles: (id) => api.get(`/api/pedidos/${id}/detalles`),
  crear: (data) => api.post('/api/pedidos', data),
  cambiarEstado: (id, estado) => api.put(`/api/pedidos/${id}/estado?estado=${estado}`),
  generarAutomatico: () => api.post('/api/pedidos/automatico'),
};
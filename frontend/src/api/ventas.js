import api from './axios';

export const VentasAPI = {
  registrar: (data) => api.post('/api/ventas', data),
  getHoy: () => api.get('/api/ventas/hoy'),
  getResumenDia: () => api.get('/api/ventas/resumen-dia'),
  getPeriodo: (dias) => api.get(`/api/ventas/periodo?dias=${dias}`),
  getById: (id) => api.get(`/api/ventas/${id}`),
};
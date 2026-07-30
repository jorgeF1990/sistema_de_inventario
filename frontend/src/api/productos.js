import api from './axios';

export const ProductosAPI = {
  getAll: (params) => api.get('/api/productos', { params }),
  getAlertas: () => api.get('/api/productos/alertas'),
  getById: (id) => api.get(`/api/productos/${id}`),
  create: (data) => api.post('/api/productos', data),
  update: (id, data) => api.put(`/api/productos/${id}`, data),
  ajustarStock: (id, data) => api.post(`/api/productos/${id}/ajustar-stock`, data),
  delete: (id) => api.delete(`/api/productos/${id}`),
  getCategorias: () => api.get('/api/productos/categorias'),
  getProveedores: () => api.get('/api/productos/proveedores'),
};
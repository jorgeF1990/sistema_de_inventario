import api from './axios';

export const ConfiguracionAPI = {
  getConfiguracion: () => api.get('/api/configuracion'),
  guardarConfiguracion: (data) => api.post('/api/configuracion', data),
  getClientes: () => api.get('/api/configuracion/clientes'),
  crearCliente: (data) => api.post('/api/configuracion/clientes', data),
  actualizarCliente: (id, data) => api.put(`/api/configuracion/clientes/${id}`, data),
  eliminarCliente: (id) => api.delete(`/api/configuracion/clientes/${id}`),
  getProveedores: () => api.get('/api/configuracion/proveedores'),
  crearProveedor: (data) => api.post('/api/configuracion/proveedores', data),
  actualizarProveedor: (id, data) => api.put(`/api/configuracion/proveedores/${id}`, data),
  eliminarProveedor: (id) => api.delete(`/api/configuracion/proveedores/${id}`),
  getUsuarios: () => api.get('/api/configuracion/usuarios'),
  crearUsuario: (data) => api.post('/api/configuracion/usuarios', data),
  actualizarUsuario: (id, data) => api.put(`/api/configuracion/usuarios/${id}`, data),
  eliminarUsuario: (id) => api.delete(`/api/configuracion/usuarios/${id}`),
};
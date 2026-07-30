export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    registro: '/auth/registro',
    me: '/auth/me',
    logout: '/auth/logout',
    verify: '/auth/verify',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  productos: {
    list: '/productos',
    detail: (id) => `/productos/${id}`,
    alertas: '/productos/alertas',
    categorias: '/productos/categorias',
    proveedores: '/productos/proveedores',
  },
  categorias: {
    list: '/categorias',
  },
  ventas: {
    hoy: '/ventas/hoy',
    resumen: '/ventas/resumen-dia',
    periodo: '/ventas/periodo',
    create: '/ventas',
    detail: (id) => `/ventas/${id}`,
  },
  pedidos: {
    pendientes: '/pedidos/pendientes',
    historial: '/pedidos/historial',
    create: '/pedidos',
    detalles: (id) => `/pedidos/${id}/detalles`,
  },
  reportes: {
    resumen: '/reportes/resumen-general',
    movimientos: '/reportes/movimientos',
    masVendidos: '/reportes/productos-mas-vendidos',
  },
  configuracion: {
    root: '/configuracion',
    clientes: '/configuracion/clientes',
    proveedores: '/configuracion/proveedores',
    usuarios: '/configuracion/usuarios',
  },
};

export default ENDPOINTS;

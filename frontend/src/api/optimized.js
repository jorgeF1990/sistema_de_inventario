import api from './axios';

export const OptimizedAPI = {
    getDashboardCompleto: () => 
        api.get('/api/optimized/dashboard-completo', { timeout: 30000 }),

    getDashboard: () => 
        api.get('/api/optimized/dashboard', { timeout: 15000 }),

    getProductosStock: (params) => 
        api.get('/api/optimized/productos-stock', { params, timeout: 15000 }),

    getAlertasStock: () => 
        api.get('/api/optimized/alertas-stock', { timeout: 15000 }),

    getVentasDiario: (dias = 30) => 
        api.get(`/api/optimized/ventas-diario?dias=${dias}`, { timeout: 15000 }),

    getVentasCliente: () => 
        api.get('/api/optimized/ventas-cliente', { timeout: 15000 }),

    getTopProductos: (limite = 10) => 
        api.get(`/api/optimized/top-productos?limite=${limite}`, { timeout: 15000 }),
};

class OptimizedAPICache {
    constructor() {
        this.cache = new Map();
        this.ttl = 60000;
    }

    async getDashboardCompleto(force = false) {
        const key = 'dashboard_completo';
        if (!force && this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < this.ttl) {
                return cached.data;
            }
        }

        try {
            const response = await OptimizedAPI.getDashboardCompleto();
            this.cache.set(key, {
                data: response.data,
                timestamp: Date.now()
            });
            return response.data;
        } catch (error) {
            console.error('Error en getDashboardCompleto:', error);
            throw error;
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

export const optimizedCache = new OptimizedAPICache();

export default OptimizedAPI;

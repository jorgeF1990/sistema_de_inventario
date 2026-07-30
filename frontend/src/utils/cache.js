class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = 120000; // 2 minutos
    this.pendingRequests = new Map(); // Para evitar duplicados
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data, customTTL = null) {
    const ttl = customTTL || this.ttl;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl
    });
  }

  getPending(key) {
    return this.pendingRequests.get(key) || null;
  }

  setPending(key, promise) {
    this.pendingRequests.set(key, promise);
    return promise;
  }

  clearPending(key) {
    this.pendingRequests.delete(key);
  }

  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  remove(key) {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }
}

export const cache = new CacheManager();
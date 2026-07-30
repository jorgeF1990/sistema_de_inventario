import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ProductosAPI } from '../api/productos';

const StockContext = createContext();

export const StockProvider = ({ children }) => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargarProductos = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    
    try {
      const response = await ProductosAPI.getAll({ timeout: 10000 });
      setProductos(response.data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  }, []);

  const cargarCategorias = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await ProductosAPI.getCategorias();
      setCategorias(response.data || []);
    } catch (error) {
      console.error('Error cargando categorias:', error);
    }
  }, []);

  const cargarProveedores = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await ProductosAPI.getProveedores();
      setProveedores(response.data || []);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    }
  }, []);

  const cargarAlertas = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await ProductosAPI.getAlertas();
      setAlertas(response.data || []);
    } catch (error) {
      console.error('Error cargando alertas:', error);
    }
  }, []);

  // NO cargar automáticamente - dejar que cada componente decida
  const cargarTodos = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      await Promise.all([
        cargarProductos(),
        cargarCategorias(),
        cargarProveedores(),
        cargarAlertas(),
      ]);
    } catch (error) {
      console.error('Error cargando todos los datos:', error);
    }
  }, [cargarProductos, cargarCategorias, cargarProveedores, cargarAlertas]);

  const value = {
    productos,
    categorias,
    proveedores,
    alertas,
    loading,
    cargarProductos,
    cargarCategorias,
    cargarProveedores,
    cargarAlertas,
    cargarTodos,
  };

  return React.createElement(
    StockContext.Provider,
    { value },
    children
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock debe ser usado dentro de un StockProvider');
  }
  return context;
};

export default StockContext;
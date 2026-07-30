import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [tieneEmpresa, setTieneEmpresa] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');
    
    if (token && usuarioGuardado) {
      try {
        const userData = JSON.parse(usuarioGuardado);
        setUsuario(userData);
        
        const empresaGuardada = localStorage.getItem('empresa');
        if (empresaGuardada) {
          setEmpresa(JSON.parse(empresaGuardada));
        }
        
        const tieneEmpresaGuardada = localStorage.getItem('tiene_empresa');
        if (tieneEmpresaGuardada) {
          setTieneEmpresa(JSON.parse(tieneEmpresaGuardada));
        }
      } catch (error) {
        console.error('Error restaurando sesion:', error);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      
      if (response.data?.access_token) {
        const { access_token, usuario, empresa, tiene_empresa } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
        
        if (empresa) {
          localStorage.setItem('empresa', JSON.stringify(empresa));
        }
        if (tiene_empresa !== undefined) {
          localStorage.setItem('tiene_empresa', JSON.stringify(tiene_empresa));
        }
        
        setUsuario(usuario);
        setEmpresa(empresa || null);
        setTieneEmpresa(tiene_empresa || false);
        
        return { success: true, usuario, empresa };
      }
      
      return { success: false, error: 'No se recibio token' };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Credenciales incorrectas' 
      };
    }
  }, []);

  // FUNCION DE REGISTRO - CORREGIDA
  const registro = useCallback(async (data) => {
    try {
      const response = await api.post('/api/auth/registro', data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error en registro:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Error en el registro' 
      };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUsuario(null);
    setEmpresa(null);
    setTieneEmpresa(false);
  }, []);

  const value = { 
    usuario, 
    empresa, 
    tieneEmpresa, 
    loading, 
    login, 
    registro,
    logout 
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;

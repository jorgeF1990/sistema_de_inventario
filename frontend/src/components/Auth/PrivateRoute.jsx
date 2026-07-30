import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function PrivateRoute({ children }) {
  const { usuario, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
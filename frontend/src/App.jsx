import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { StockProvider } from './context/StockContext';
import theme from './styles/theme';
import Login from './components/Auth/Login';
import Registro from './components/Auth/Registro';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Layout from './components/Layout/Layout';
import LoadingFallback from './components/Common/LoadingFallback';

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const Productos = lazy(() => import('./components/Productos/Productos'));
const Ventas = lazy(() => import('./components/Ventas/Ventas'));
const Pedidos = lazy(() => import('./components/Pedidos/Pedidos'));
const Reportes = lazy(() => import('./components/Reportes/Reportes'));
const Configuracion = lazy(() => import('./components/Configuracion/Configuracion'));

function AppRoutes() {
  const { usuario, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {usuario ? (
          <>
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/productos" element={<Layout><Productos /></Layout>} />
            <Route path="/ventas" element={<Layout><Ventas /></Layout>} />
            <Route path="/pedidos" element={<Layout><Pedidos /></Layout>} />
            <Route path="/reportes" element={<Layout><Reportes /></Layout>} />
            <Route path="/configuracion" element={<Layout><Configuracion /></Layout>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <StockProvider>
            <AppRoutes />
            <ToastContainer position="bottom-right" autoClose={3000} />
          </StockProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
// Force new build - Fri, Jul 31, 2026  3:31:57 PM

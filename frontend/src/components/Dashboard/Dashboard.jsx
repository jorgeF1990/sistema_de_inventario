import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Inventory,
  AttachMoney,
  LocalShipping,
  Warning,
  Refresh,
  Receipt,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Graficos from './Graficos';

function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$ 0.00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/optimized/dashboard-completo');
      setData(response.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 400 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }} color="textSecondary">
            Cargando datos...
          </Typography>
          <LinearProgress sx={{ mt: 3, height: 6, borderRadius: 3 }} />
        </Box>
      </Box>
    );
  }

  const resumen = data?.resumen || {};
  const alertas = data?.alertas || [];
  const ventasDiario = data?.ventasDiario || [];
  const topProductos = data?.topProductos || [];

  const totalProductos = resumen.total_productos || 0;
  const sinStock = resumen.sin_stock || 0;
  const stockBajo = resumen.stock_bajo || 0;
  const ventasHoy = resumen.ventas_hoy || 0;
  const ventasHoyMonto = resumen.ventas_hoy_monto || 0;
  const pedidosPendientes = resumen.pedidos_pendientes || 0;

  const KPICards = [
    {
      title: 'Productos',
      value: totalProductos,
      subtitle: `${sinStock} sin stock, ${stockBajo} bajo`,
      icon: <Inventory sx={{ fontSize: isMobile ? 24 : 32 }} />,
      color: '#3498DB',
      bgColor: 'rgba(52, 152, 219, 0.12)',
    },
    {
      title: 'Ventas Hoy',
      value: formatCurrency(ventasHoyMonto),
      subtitle: `${ventasHoy} transacciones`,
      icon: <AttachMoney sx={{ fontSize: isMobile ? 24 : 32 }} />,
      color: '#2ECC71',
      bgColor: 'rgba(46, 204, 113, 0.12)',
    },
    {
      title: 'Stock Critico',
      value: sinStock + stockBajo,
      subtitle: `${sinStock} sin stock`,
      icon: <Warning sx={{ fontSize: isMobile ? 24 : 32 }} />,
      color: '#E74C3C',
      bgColor: 'rgba(231, 76, 60, 0.12)',
    },
    {
      title: 'Pedidos Pendientes',
      value: pedidosPendientes,
      subtitle: 'Requieren atencion',
      icon: <LocalShipping sx={{ fontSize: isMobile ? 24 : 32 }} />,
      color: '#F39C12',
      bgColor: 'rgba(243, 156, 18, 0.12)',
    },
  ];

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'flex-start' : 'center'} mb={4} gap={2}>
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="700">
            Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Bienvenido, {usuario?.nombre_completo || 'Usuario'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={cargarDatos}
          disabled={loading}
          size={isMobile ? 'small' : 'medium'}
          fullWidth={isMobile}
        >
          Actualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 4 }}>
        {KPICards.map((kpi, index) => (
          <Grid item xs={6} sm={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" variant={isMobile ? 'caption' : 'subtitle2'} gutterBottom>
                      {kpi.title}
                    </Typography>
                    <Typography variant={isMobile ? 'h6' : 'h4'} fontWeight="700" component="div">
                      {kpi.value}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {kpi.subtitle}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: kpi.bgColor, color: kpi.color, width: isMobile ? 40 : 56, height: isMobile ? 40 : 56 }}>
                    {kpi.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Gráficos */}
      <Graficos 
        ventasSemana={ventasDiario} 
        productosTop={topProductos} 
        resumenStock={{
          normal: totalProductos - sinStock - stockBajo,
          bajo: stockBajo,
          sin_stock: sinStock
        }}
      />

      <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: isMobile ? 2 : 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="600">
                Alertas de Stock
              </Typography>
              <Chip 
                label={`${alertas.length} productos`} 
                size="small" 
                color={alertas.length > 0 ? 'warning' : 'success'}
              />
            </Box>
            <Box>
              {alertas.length > 0 ? (
                alertas.slice(0, 5).map((item, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    <Box>
                      <Typography variant="body2" component="span">
                        {item.nombre || 'Producto'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" component="div">
                        Stock: {item.stock_actual || 0}/{item.stock_minimo || 0}
                      </Typography>
                    </Box>
                    <Chip 
                      label={item.estado_stock || 'NORMAL'} 
                      size="small" 
                      color={item.estado_stock === 'SIN STOCK' ? 'error' : 'warning'}
                    />
                  </Box>
                ))
              ) : (
                <Typography color="textSecondary">No hay alertas de stock</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: isMobile ? 2 : 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Receipt color="success" />
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="600">
                  Ultimas Ventas
                </Typography>
              </Box>
              <Chip label="Hoy" size="small" color="success" />
            </Box>
            <Box>
              {ventasDiario.length > 0 ? (
                ventasDiario.slice(0, 5).map((venta, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2">
                        {venta.fecha ? new Date(venta.fecha).toLocaleDateString() : 'Sin fecha'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {venta.total_ventas || 0} ventas
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="600" color="success.main">
                      {formatCurrency(venta.monto_total || 0)}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography color="textSecondary">No hay ventas registradas</Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
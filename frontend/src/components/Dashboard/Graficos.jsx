import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const getChartOptions = (isMobile) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: isMobile ? 'bottom' : 'top',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 11, weight: '500' },
        boxWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 10,
      cornerRadius: 6,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
      ticks: { font: { size: 10 }, maxTicksLimit: 6 },
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 }, maxRotation: 30 },
    },
  },
});

const getDoughnutOptions = (isMobile) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: isMobile ? 'bottom' : 'right',
      labels: {
        usePointStyle: true,
        padding: 15,
        font: { size: 11, weight: '500' },
        boxWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 10,
      cornerRadius: 6,
      callbacks: {
        label: function(context) {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
          return `${context.label}: ${context.parsed} (${percentage}%)`;
        }
      }
    },
  },
  cutout: '70%',
});

const Graficos = ({ ventasSemana, productosTop, resumenStock }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const colores = ['#3498DB', '#2ECC71', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C'];

  const ventasData = useMemo(() => ({
    labels: ventasSemana?.length > 0 
      ? ventasSemana.map(item => {
          const fecha = new Date(item.fecha);
          return fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
        })
      : ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
    datasets: [{
      label: 'Ventas ($)',
      data: ventasSemana?.length > 0 ? ventasSemana.map(item => item.total || 0) : [0,0,0,0,0,0,0],
      backgroundColor: colores,
      borderColor: '#3498DB',
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.5,
    }],
  }), [ventasSemana]);

  const productosData = useMemo(() => ({
    labels: productosTop?.slice(0, 6).map(item => item.nombre) || ['Sin datos'],
    datasets: [{
      label: 'Unidades Vendidas',
      data: productosTop?.slice(0, 6).map(item => item.total_vendido || 0) || [0],
      backgroundColor: colores.slice(0, 6),
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 4,
    }],
  }), [productosTop]);

  const stockData = useMemo(() => ({
    labels: ['Stock Normal', 'Stock Bajo', 'Sin Stock'],
    datasets: [{
      data: [
        resumenStock?.normal || 0,
        resumenStock?.bajo || 0,
        resumenStock?.sin_stock || 0,
      ],
      backgroundColor: ['#2ECC71', '#F39C12', '#E74C3C'],
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }],
  }), [resumenStock]);

  const chartOptions = useMemo(() => getChartOptions(isMobile), [isMobile]);
  const doughnutOptions = useMemo(() => getDoughnutOptions(isMobile), [isMobile]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3, height: isMobile ? 320 : 400 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            Ventas Semanales
          </Typography>
          <Box sx={{ height: isMobile ? 220 : 300 }}>
            <Bar data={ventasData} options={chartOptions} />
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, height: isMobile ? 320 : 400 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            Estado de Stock
          </Typography>
          <Box sx={{ height: isMobile ? 220 : 300 }}>
            <Doughnut data={stockData} options={doughnutOptions} />
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: isMobile ? 320 : 400 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            Productos Mas Vendidos
          </Typography>
          <Box sx={{ height: isMobile ? 220 : 300 }}>
            <Bar 
              data={productosData} 
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: { ...chartOptions.plugins, legend: { display: false } },
              }} 
            />
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: isMobile ? 320 : 400 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            Tendencia de Ventas
          </Typography>
          <Box sx={{ height: isMobile ? 220 : 300 }}>
            <Line data={ventasData} options={chartOptions} />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(Graficos);
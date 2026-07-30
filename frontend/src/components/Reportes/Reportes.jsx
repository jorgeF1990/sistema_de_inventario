import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  useMediaQuery,
  useTheme,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { 
  Download, 
  Visibility, 
  Print, 
  Close,
  Receipt,
  Inventory,
  LocalShipping,
  Person,
  AttachMoney,
  DateRange,
  ExpandMore,
  Business,
  Phone,
  Email,
  LocationOn,
  Badge,
  FileCopy,
} from '@mui/icons-material';
import { ReportesAPI } from '../../api/reportes';
import api from '../../api/axios';

function Reportes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroDias, setFiltroDias] = useState(30);
  const [filtroProducto, setFiltroProducto] = useState('');
  const [productos, setProductos] = useState([]);
  const [exportando, setExportando] = useState(false);

  const cargarMovimientos = async () => {
    setLoading(true);
    try {
      const response = await ReportesAPI.getMovimientos({ 
        dias: filtroDias,
        tipo: filtroTipo,
      });
      setMovimientos(response.data || []);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await api.get('/api/productos');
      setProductos(response.data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  useEffect(() => {
    cargarMovimientos();
    cargarProductos();
  }, []);

  const handleVerDetalle = async (id) => {
    try {
      const response = await ReportesAPI.getMovimientoDetalle(id);
      setMovimientoSeleccionado(response.data);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  const handleAplicarFiltros = () => {
    cargarMovimientos();
  };

  const handleExportarCSV = async () => {
    if (movimientos.length === 0) return;
    setExportando(true);
    
    try {
      const headers = ['Fecha', 'Producto', 'Codigo', 'Cantidad', 'Tipo', 'Stock Anterior', 'Stock Nuevo', 'Usuario', 'Referencia'];
      const rows = movimientos.map(m => [
        m.fecha ? new Date(m.fecha).toLocaleString() : '-',
        m.producto_nombre || '-',
        m.producto_codigo || '-',
        Math.abs(m.cantidad || 0),
        m.cantidad > 0 ? 'ENTRADA' : 'SALIDA',
        m.stock_antes || 0,
        m.stock_despues || 0,
        m.usuario || 'admin',
        m.referencia_nombre || '-',
      ]);

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `movimientos_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exportando CSV:', error);
    } finally {
      setExportando(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const getTipoColor = (cantidad) => {
    return cantidad > 0 ? 'success' : 'error';
  };

  const getTipoLabel = (cantidad) => {
    return cantidad > 0 ? 'ENTRADA' : 'SALIDA';
  };

  const getReferenciaColor = (tipo) => {
    switch (tipo) {
      case 'pedido': return 'warning';
      case 'venta': return 'success';
      default: return 'default';
    }
  };

  const getReferenciaLabel = (tipo, nombre) => {
    switch (tipo) {
      case 'pedido': return `Pedido: ${nombre || 'Proveedor'}`;
      case 'venta': return `Venta: ${nombre || 'Cliente'}`;
      default: return 'Ajuste Manual';
    }
  };

  const filteredMovimientos = movimientos.filter(m => {
    if (filtroProducto) {
      return m.producto_nombre?.toLowerCase().includes(filtroProducto.toLowerCase()) ||
             m.producto_codigo?.toLowerCase().includes(filtroProducto.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Reportes de Movimientos
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<Print />} onClick={handleImprimir}>
            Imprimir
          </Button>
          <Button variant="contained" startIcon={<Download />} onClick={handleExportarCSV} disabled={exportando}>
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                label="Tipo"
              >
                <MenuItem value="TODOS">Todos</MenuItem>
                <MenuItem value="ENTRADA">Entradas</MenuItem>
                <MenuItem value="SALIDA">Salidas</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Dias</InputLabel>
              <Select
                value={filtroDias}
                onChange={(e) => setFiltroDias(e.target.value)}
                label="Dias"
              >
                <MenuItem value={7}>Ultimos 7 dias</MenuItem>
                <MenuItem value={15}>Ultimos 15 dias</MenuItem>
                <MenuItem value={30}>Ultimos 30 dias</MenuItem>
                <MenuItem value={60}>Ultimos 60 dias</MenuItem>
                <MenuItem value={90}>Ultimos 90 dias</MenuItem>
                <MenuItem value={180}>Ultimos 180 dias</MenuItem>
                <MenuItem value={365}>Ultimo año</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por producto..."
              value={filtroProducto}
              onChange={(e) => setFiltroProducto(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button fullWidth variant="contained" onClick={handleAplicarFiltros}>
              Filtrar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tarjetas de Resumen */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2">
                Total Movimientos
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {filteredMovimientos.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2">
                Entradas
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {filteredMovimientos.filter(m => m.cantidad > 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2">
                Salidas
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {filteredMovimientos.filter(m => m.cantidad < 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="subtitle2">
                Balance Neto
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {filteredMovimientos.reduce((sum, m) => sum + (m.cantidad || 0), 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla de Movimientos */}
      <Paper sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table size={isMobile ? "small" : "medium"} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Fecha
                </TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Producto
                </TableCell>
                {!isTablet && (
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                    Codigo
                  </TableCell>
                )}
                <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Cantidad
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Tipo
                </TableCell>
                {!isTablet && (
                  <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                    Stock
                  </TableCell>
                )}
                {!isMobile && (
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                    Usuario
                  </TableCell>
                )}
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc', minWidth: 150, maxWidth: 180 }}>
                  Referencia
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMovimientos.slice(0, 100).map((mov) => (
                <TableRow key={mov.id_movimiento} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {mov.fecha ? new Date(mov.fecha).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>{mov.producto_nombre || '-'}</TableCell>
                  {!isTablet && <TableCell>{mov.producto_codigo || '-'}</TableCell>}
                  <TableCell align="center">
                    <Chip
                      label={Math.abs(mov.cantidad || 0)}
                      color={getTipoColor(mov.cantidad)}
                      size="small"
                      sx={{ minWidth: 40, fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getTipoLabel(mov.cantidad)}
                      color={getTipoColor(mov.cantidad)}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 70, fontWeight: 500 }}
                    />
                  </TableCell>
                  {!isTablet && (
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      {mov.stock_antes} → {mov.stock_despues}
                    </TableCell>
                  )}
                  {!isMobile && <TableCell>{mov.usuario || 'admin'}</TableCell>}
                  <TableCell>
                    <Chip
                      label={getReferenciaLabel(mov.referencia_tipo, mov.referencia_nombre)}
                      color={getReferenciaColor(mov.referencia_tipo)}
                      size="small"
                      sx={{ 
                        width: 150,
                        minWidth: 150,
                        maxWidth: 150,
                        '& .MuiChip-label': {
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0 8px',
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleVerDetalle(mov.id_movimiento)}
                      title="Ver detalle completo"
                      sx={{ 
                        '&:hover': { backgroundColor: 'rgba(52, 152, 219, 0.12)' },
                      }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredMovimientos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No hay movimientos registrados con estos filtros
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog de Detalle del Movimiento */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Detalle Completo del Movimiento</Typography>
            <IconButton onClick={() => setDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {movimientoSeleccionado && (
            <Box>
              {/* Informacion General */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Receipt color="primary" />
                    <Typography variant="subtitle2" color="textSecondary">
                      Movimiento #{movimientoSeleccionado.id_movimiento}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DateRange color="primary" />
                    <Typography variant="subtitle2" color="textSecondary">
                      {movimientoSeleccionado.fecha ? new Date(movimientoSeleccionado.fecha).toLocaleString() : '-'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Badge color="primary" />
                    <Typography variant="subtitle2" color="textSecondary">
                      Tipo: <Chip 
                        label={movimientoSeleccionado.tipo_movimiento || getTipoLabel(movimientoSeleccionado.cantidad)} 
                        color={getTipoColor(movimientoSeleccionado.cantidad)}
                        size="small"
                      />
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Person color="primary" />
                    <Typography variant="subtitle2" color="textSecondary">
                      Usuario: {movimientoSeleccionado.usuario || 'admin'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {movimientoSeleccionado.referencia_tipo === 'pedido' && (
                      <LocalShipping color="warning" />
                    )}
                    {movimientoSeleccionado.referencia_tipo === 'venta' && (
                      <Receipt color="success" />
                    )}
                    {!movimientoSeleccionado.referencia_tipo && (
                      <Inventory color="default" />
                    )}
                    <Typography variant="subtitle2" color="textSecondary">
                      Referencia: <Chip
                        label={getReferenciaLabel(
                          movimientoSeleccionado.referencia_tipo, 
                          movimientoSeleccionado.referencia_nombre
                        )}
                        color={getReferenciaColor(movimientoSeleccionado.referencia_tipo)}
                        size="small"
                      />
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Datos del Producto */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Inventory color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Datos del Producto
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">Nombre</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {movimientoSeleccionado.producto_nombre || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">Codigo</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {movimientoSeleccionado.producto_codigo || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">Categoria</Typography>
                      <Typography variant="body1">{movimientoSeleccionado.categoria_nombre || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="textSecondary">Ubicacion</Typography>
                      <Typography variant="body1">{movimientoSeleccionado.ubicacion || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">Descripcion</Typography>
                      <Typography variant="body1">{movimientoSeleccionado.producto_descripcion || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="textSecondary">Precio Compra</Typography>
                      <Typography variant="body1">${movimientoSeleccionado.precio_compra?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="textSecondary">Precio Venta</Typography>
                      <Typography variant="body1">${movimientoSeleccionado.precio_venta?.toFixed(2) || '0.00'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="textSecondary">Unidad</Typography>
                      <Typography variant="body1">{movimientoSeleccionado.unidad_medida || 'unidad'}</Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Detalle de Stock */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AttachMoney color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Movimiento de Stock
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="textSecondary">Cantidad</Typography>
                      <Typography variant="h6" color={getTipoColor(movimientoSeleccionado.cantidad)}>
                        {movimientoSeleccionado.cantidad > 0 ? '+' : ''}{movimientoSeleccionado.cantidad}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="textSecondary">Stock Anterior</Typography>
                      <Typography variant="h6">{movimientoSeleccionado.stock_antes || 0}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="textSecondary">Stock Nuevo</Typography>
                      <Typography variant="h6" color="primary.main">
                        {movimientoSeleccionado.stock_despues || 0}
                      </Typography>
                    </Grid>
                    {movimientoSeleccionado.observacion && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary">Observacion</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.observacion}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Detalle de Compra - ENTRADA con Proveedor */}
              {movimientoSeleccionado.detalle_compra && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocalShipping color="warning" />
                      <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                        Detalle de Compra - Proveedor
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Datos del Proveedor
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3, bgcolor: '#fff8e1', p: 2, borderRadius: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Nombre</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {movimientoSeleccionado.detalle_compra.proveedor_nombre || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">RUC</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_compra.proveedor_ruc || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Telefono</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_compra.proveedor_telefono || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Email</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_compra.proveedor_email || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary">Direccion</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_compra.proveedor_direccion || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Contacto</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_compra.contacto_nombre || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Telefono Contacto</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_compra.contacto_telefono || '-'}</Typography>
                      </Grid>
                    </Grid>

                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Informacion de la Compra
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">N° Pedido</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {movimientoSeleccionado.detalle_compra.numero_pedido || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Usuario</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_compra.usuario || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="textSecondary">Fecha</Typography>
                        <Typography variant="body1">
                          {movimientoSeleccionado.detalle_compra.fecha_pedido ? 
                            new Date(movimientoSeleccionado.detalle_compra.fecha_pedido).toLocaleDateString() : '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="textSecondary">Subtotal</Typography>
                        <Typography variant="body1">${movimientoSeleccionado.detalle_compra.subtotal?.toFixed(2) || '0.00'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="textSecondary">Total</Typography>
                        <Typography variant="body1" fontWeight="bold" color="warning.main">
                          ${movimientoSeleccionado.detalle_compra.total?.toFixed(2) || '0.00'}
                        </Typography>
                      </Grid>
                      {movimientoSeleccionado.detalle_compra.observaciones && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="textSecondary">Observaciones</Typography>
                          <Typography variant="body1">{movimientoSeleccionado.detalle_compra.observaciones}</Typography>
                        </Grid>
                      )}
                    </Grid>

                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      <Inventory sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Productos de la Compra
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Codigo</TableCell>
                            <TableCell>Producto</TableCell>
                            <TableCell align="center">Cantidad</TableCell>
                            <TableCell align="center">Recibido</TableCell>
                            <TableCell align="right">Precio Unit.</TableCell>
                            <TableCell align="right">Subtotal</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {movimientoSeleccionado.detalle_compra.items?.map((item) => (
                            <TableRow key={item.id_detalle}>
                              <TableCell>{item.producto_codigo}</TableCell>
                              <TableCell>{item.producto_nombre}</TableCell>
                              <TableCell align="center">{item.cantidad}</TableCell>
                              <TableCell align="center">{item.cantidad_recibida || 0}</TableCell>
                              <TableCell align="right">${item.precio_unitario?.toFixed(2)}</TableCell>
                              <TableCell align="right">${item.subtotal?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Detalle de Venta */}
              {movimientoSeleccionado.detalle_venta && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Receipt color="success" />
                      <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                        Detalle de Venta
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Datos del Cliente
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3, bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Nombre</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {movimientoSeleccionado.detalle_venta.cliente_nombre || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Tipo</Typography>
                        <Chip 
                          label={movimientoSeleccionado.detalle_venta.cliente_tipo || 'CONSUMIDOR FINAL'} 
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          <Badge sx={{ mr: 0.5, fontSize: 14, verticalAlign: 'middle' }} />
                          RUC
                        </Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_venta.cliente_ruc || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          <Phone sx={{ mr: 0.5, fontSize: 14, verticalAlign: 'middle' }} />
                          Telefono
                        </Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_venta.cliente_telefono || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          <Email sx={{ mr: 0.5, fontSize: 14, verticalAlign: 'middle' }} />
                          Email
                        </Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_venta.cliente_email || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">
                          <LocationOn sx={{ mr: 0.5, fontSize: 14, verticalAlign: 'middle' }} />
                          Direccion
                        </Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_venta.cliente_direccion || '-'}</Typography>
                      </Grid>
                    </Grid>

                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Informacion de la Venta
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Factura</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {movimientoSeleccionado.detalle_venta.numero_factura || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Vendedor</Typography>
                        <Typography variant="body1">{movimientoSeleccionado.detalle_venta.vendedor || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="textSecondary">Subtotal</Typography>
                        <Typography variant="body1">${movimientoSeleccionado.detalle_venta.subtotal?.toFixed(2) || '0.00'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="textSecondary">IVA (21%)</Typography>
                        <Typography variant="body1">${movimientoSeleccionado.detalle_venta.iva?.toFixed(2) || '0.00'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="textSecondary">Total</Typography>
                        <Typography variant="body1" fontWeight="bold" color="success.main">
                          ${movimientoSeleccionado.detalle_venta.total?.toFixed(2) || '0.00'}
                        </Typography>
                      </Grid>
                      {movimientoSeleccionado.detalle_venta.observaciones && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="textSecondary">Observaciones</Typography>
                          <Typography variant="body1">{movimientoSeleccionado.detalle_venta.observaciones}</Typography>
                        </Grid>
                      )}
                    </Grid>

                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      <Inventory sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Productos Vendidos
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Codigo</TableCell>
                            <TableCell>Producto</TableCell>
                            <TableCell align="center">Cantidad</TableCell>
                            <TableCell align="right">Precio Unit.</TableCell>
                            <TableCell align="right">Subtotal</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {movimientoSeleccionado.detalle_venta.items?.map((item) => (
                            <TableRow key={item.id_detalle}>
                              <TableCell>{item.producto_codigo}</TableCell>
                              <TableCell>{item.producto_nombre}</TableCell>
                              <TableCell align="center">{item.cantidad}</TableCell>
                              <TableCell align="right">${item.precio_unitario?.toFixed(2)}</TableCell>
                              <TableCell align="right">${item.subtotal?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
          <Button 
            variant="contained" 
            startIcon={<FileCopy />}
            onClick={() => {
              if (movimientoSeleccionado) {
                const text = JSON.stringify(movimientoSeleccionado, null, 2);
                navigator.clipboard.writeText(text);
              }
            }}
          >
            Copiar Datos
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Print />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Reportes;
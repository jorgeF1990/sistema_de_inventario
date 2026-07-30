import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import { 
  Add, 
  Delete, 
  ShoppingCart, 
  Close, 
  Remove, 
  Search,
  PersonAdd,
} from '@mui/icons-material';
import { VentasAPI } from '../../api/ventas';
import { ProductosAPI } from '../../api/productos';
import { ConfiguracionAPI } from '../../api/configuracion';

function Ventas() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cliente, setCliente] = useState(null);
  const [clienteInput, setClienteInput] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [dialogClienteOpen, setDialogClienteOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
    tipo: 'CONSUMIDOR FINAL',
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [ventasRes, productosRes, clientesRes] = await Promise.all([
        VentasAPI.getHoy(),
        ProductosAPI.getAll(),
        ConfiguracionAPI.getClientes(),
      ]);
      setVentas(ventasRes.data || []);
      setProductos(productosRes.data || []);
      setClientes(clientesRes.data || []);
      
      const defaultCliente = clientesRes.data?.find(c => c.tipo === 'CONSUMIDOR FINAL');
      if (defaultCliente) {
        setCliente(defaultCliente);
        setClienteInput(defaultCliente.nombre);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const subtotal = carrito.reduce((sum, item) => sum + (item.cantidad * item.precio_venta), 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const handleAddToCart = (producto) => {
    const existente = carrito.find(c => c.id_producto === producto.id_producto);
    if (existente) {
      if (existente.cantidad + 1 > producto.stock_actual) {
        setError('Stock insuficiente');
        return;
      }
      setCarrito(carrito.map(c =>
        c.id_producto === producto.id_producto
          ? { ...c, cantidad: c.cantidad + 1 }
          : c
      ));
    } else {
      if (1 > producto.stock_actual) {
        setError('Stock insuficiente');
        return;
      }
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const handleRemoveFromCart = (id) => {
    setCarrito(carrito.filter(c => c.id_producto !== id));
  };

  const handleUpdateQuantity = (id, cantidad) => {
    const producto = productos.find(p => p.id_producto === id);
    if (cantidad > producto.stock_actual) {
      setError('Stock insuficiente');
      return;
    }
    if (cantidad <= 0) {
      handleRemoveFromCart(id);
      return;
    }
    setCarrito(carrito.map(c =>
      c.id_producto === id ? { ...c, cantidad } : c
    ));
  };

  const handleRegisterSale = async () => {
    if (carrito.length === 0) {
      setError('El carrito está vacío');
      return;
    }

    try {
      const ventaData = {
        cliente_nombre: cliente?.nombre || 'CONSUMIDOR FINAL',
        id_cliente: cliente?.id_cliente || null,
        detalles: carrito.map(item => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_venta,
        })),
        usuario: 'admin',
      };

      await VentasAPI.registrar(ventaData);
      setSuccessMessage('Venta registrada exitosamente');
      setSuccess(true);
      setCarrito([]);
      cargarDatos();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar la venta');
    }
  };

  const handleVerDetalle = async (id) => {
    try {
      const response = await VentasAPI.getById(id);
      setVentaSeleccionada(response.data);
      setDialogOpen(true);
    } catch (error) {
      setError('Error al obtener el detalle de la venta');
    }
  };

  const handleSaveCliente = async () => {
    if (!nuevoCliente.nombre) {
      setError('El nombre del cliente es requerido');
      return;
    }

    try {
      await ConfiguracionAPI.crearCliente(nuevoCliente);
      setDialogClienteOpen(false);
      cargarDatos();
      setSuccessMessage('Cliente creado correctamente');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Error al crear el cliente');
    }
  };

  const filteredProductos = productos.filter(p =>
    p.stock_actual > 0 &&
    (p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
     p.codigo?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" mb={3}>
        Ventas
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar productos por código o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              size={isMobile ? "small" : "medium"}
            />
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size={isMobile ? "small" : "medium"} stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Producto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Stock</TableCell>
                    {!isTablet && <TableCell align="right" sx={{ fontWeight: 600 }}>Precio</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProductos.slice(0, 20).map((producto) => (
                    <TableRow key={producto.id_producto} hover>
                      <TableCell>{producto.codigo}</TableCell>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={producto.stock_actual}
                          color={producto.stock_actual <= producto.stock_minimo ? 'warning' : 'success'}
                          size="small"
                          sx={{ minWidth: 30 }}
                        />
                      </TableCell>
                      {!isTablet && (
                        <TableCell align="right" sx={{ fontWeight: 500 }}>
                          {formatCurrency(producto.precio_venta)}
                        </TableCell>
                      )}
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleAddToCart(producto)}
                          disabled={producto.stock_actual === 0}
                          sx={{ 
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                            '&:disabled': { bgcolor: 'grey.300' }
                          }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProductos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="textSecondary">
                          No hay productos disponibles
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Carrito de Compras
              </Typography>

              <Box display="flex" gap={1} alignItems="center" mb={2}>
                <Autocomplete
                  fullWidth
                  options={clientes}
                  getOptionLabel={(option) => option.nombre}
                  value={cliente}
                  onChange={(e, newValue) => {
                    setCliente(newValue);
                    setClienteInput(newValue?.nombre || '');
                  }}
                  inputValue={clienteInput}
                  onInputChange={(e, newInputValue) => {
                    setClienteInput(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cliente"
                      size="small"
                      placeholder="Buscar cliente..."
                    />
                  )}
                  isOptionEqualToValue={(option, value) => option.id_cliente === value?.id_cliente}
                  size="small"
                />
                <IconButton 
                  color="primary" 
                  onClick={() => setDialogClienteOpen(true)}
                  title="Nuevo Cliente"
                  sx={{ 
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: isMobile ? 36 : 40,
                    height: isMobile ? 36 : 40,
                  }}
                >
                  <PersonAdd fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
              </Box>

              <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', maxHeight: 300 }}>
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Producto</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, minWidth: 80 }}>Cant.</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Subtotal</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {carrito.map((item) => (
                        <TableRow key={item.id_producto}>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: isMobile ? 60 : 100 }}>
                              {item.nombre}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" alignItems="center" justifyContent="center">
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateQuantity(item.id_producto, item.cantidad - 1)}
                                sx={{ 
                                  border: '1px solid #e0e0e0', 
                                  borderRadius: 1,
                                  width: isMobile ? 24 : 28,
                                  height: isMobile ? 24 : 28,
                                }}
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                              <Typography sx={{ mx: 1, minWidth: 24, textAlign: 'center' }}>
                                {item.cantidad}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateQuantity(item.id_producto, item.cantidad + 1)}
                                sx={{ 
                                  border: '1px solid #e0e0e0', 
                                  borderRadius: 1,
                                  width: isMobile ? 24 : 28,
                                  height: isMobile ? 24 : 28,
                                }}
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>
                            {formatCurrency(item.cantidad * item.precio_venta)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveFromCart(item.id_producto)}
                              sx={{
                                width: isMobile ? 24 : 28,
                                height: isMobile ? 24 : 28,
                              }}
                            >
                              <Close fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {carrito.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            <Typography variant="body2" color="textSecondary">
                              Carrito vacío
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Box display="flex" justifyContent="space-between" py={0.5}>
                  <Typography variant="body2" color="textSecondary">Subtotal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(subtotal)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={0.5}>
                  <Typography variant="body2" color="textSecondary">IVA (21%):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(iva)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1} sx={{ borderTop: '2px solid #e0e0e0', mt: 1 }}>
                  <Typography variant="h6" fontWeight="600">Total:</Typography>
                  <Typography variant="h6" fontWeight="600" color="primary.main">
                    {formatCurrency(total)}
                  </Typography>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<ShoppingCart />}
                sx={{ mt: 2, py: 1.5 }}
                disabled={carrito.length === 0}
                onClick={handleRegisterSale}
              >
                Registrar Venta
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de Detalle de Venta */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de Venta</DialogTitle>
        <DialogContent>
          {ventaSeleccionada && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Factura</Typography>
                  <Typography variant="body1" fontWeight="500">{ventaSeleccionada.numero_factura}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Cliente</Typography>
                  <Typography variant="body1" fontWeight="500">{ventaSeleccionada.cliente_nombre}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Fecha</Typography>
                  <Typography variant="body1">{new Date(ventaSeleccionada.fecha_venta).toLocaleString()}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight="600" gutterBottom>Productos</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ventaSeleccionada.detalles?.map((detalle) => (
                      <TableRow key={detalle.id_detalle}>
                        <TableCell>{detalle.producto_nombre}</TableCell>
                        <TableCell align="center">{detalle.cantidad}</TableCell>
                        <TableCell align="right">{formatCurrency(detalle.precio_unitario)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(detalle.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right"><strong>Total:</strong></TableCell>
                      <TableCell align="right"><strong>{formatCurrency(ventaSeleccionada.total)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Nuevo Cliente */}
      <Dialog open={dialogClienteOpen} onClose={() => setDialogClienteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Nombre" 
                value={nuevoCliente.nombre} 
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} 
                required 
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth 
                label="RUC" 
                value={nuevoCliente.ruc} 
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, ruc: e.target.value })} 
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth 
                label="Teléfono" 
                value={nuevoCliente.telefono} 
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} 
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Email" 
                type="email" 
                value={nuevoCliente.email} 
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} 
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Dirección" 
                value={nuevoCliente.direccion} 
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} 
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogClienteOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCliente}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Ventas;

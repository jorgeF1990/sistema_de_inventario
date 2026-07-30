import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Receipt, Delete, Check, Close } from '@mui/icons-material';
import { PedidosAPI } from '../../api/pedidos';
import { ProductosAPI } from '../../api/productos';

function Pedidos() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [detallesPedido, setDetallesPedido] = useState([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [nuevoPedido, setNuevoPedido] = useState({
    id_proveedor: '',
    observaciones: '',
    detalles: [],
  });

  const [productoSeleccionado, setProductoSeleccionado] = useState({
    id_producto: '',
    cantidad: 1,
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [pedidosRes, productosRes] = await Promise.all([
        PedidosAPI.getPendientes(),
        ProductosAPI.getAll(),
      ]);
      setPedidos(pedidosRes.data || []);
      setProductos(productosRes.data || []);
      
      // Cargar proveedores desde productos
      const proveedoresSet = new Set();
      productosRes.data?.forEach(p => {
        if (p.id_proveedor && p.proveedor_nombre) {
          proveedoresSet.add(JSON.stringify({
            id: p.id_proveedor,
            nombre: p.proveedor_nombre,
          }));
        }
      });
      setProveedores(Array.from(proveedoresSet).map(p => JSON.parse(p)));
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

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 1: return 'warning';
      case 2: return 'info';
      case 3: return 'success';
      case 4: return 'error';
      default: return 'default';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 1: return 'Pendiente';
      case 2: return 'Enviado';
      case 3: return 'Recibido';
      case 4: return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const handleOpenDialog = () => {
    setNuevoPedido({
      id_proveedor: '',
      observaciones: '',
      detalles: [],
    });
    setProductoSeleccionado({
      id_producto: '',
      cantidad: 1,
    });
    setDialogOpen(true);
  };

  const handleAgregarProducto = () => {
    if (!productoSeleccionado.id_producto) {
      setError('Seleccione un producto');
      return;
    }
    if (productoSeleccionado.cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    const producto = productos.find(p => p.id_producto === parseInt(productoSeleccionado.id_producto));
    if (!producto) return;

    const existente = nuevoPedido.detalles.find(d => d.id_producto === producto.id_producto);
    if (existente) {
      setNuevoPedido({
        ...nuevoPedido,
        detalles: nuevoPedido.detalles.map(d =>
          d.id_producto === producto.id_producto
            ? { ...d, cantidad: d.cantidad + productoSeleccionado.cantidad }
            : d
        ),
      });
    } else {
      setNuevoPedido({
        ...nuevoPedido,
        detalles: [
          ...nuevoPedido.detalles,
          {
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            codigo: producto.codigo,
            cantidad: productoSeleccionado.cantidad,
            precio_unitario: producto.precio_compra || 0,
          },
        ],
      });
    }
    setProductoSeleccionado({ id_producto: '', cantidad: 1 });
  };

  const handleEliminarProductoPedido = (index) => {
    setNuevoPedido({
      ...nuevoPedido,
      detalles: nuevoPedido.detalles.filter((_, i) => i !== index),
    });
  };

  const handleGuardarPedido = async () => {
    if (!nuevoPedido.id_proveedor) {
      setError('Seleccione un proveedor');
      return;
    }
    if (nuevoPedido.detalles.length === 0) {
      setError('Agregue al menos un producto');
      return;
    }

    try {
      const pedidoData = {
        id_proveedor: parseInt(nuevoPedido.id_proveedor),
        observaciones: nuevoPedido.observaciones,
        usuario: 'admin',
        detalles: nuevoPedido.detalles.map(d => ({
          id_producto: d.id_producto,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
        })),
      };

      await PedidosAPI.crear(pedidoData);
      setSuccessMessage('Pedido creado correctamente');
      setSuccess(true);
      setDialogOpen(false);
      cargarDatos();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el pedido');
    }
  };

  const handleVerDetalle = async (id) => {
    try {
      const response = await PedidosAPI.getDetalles(id);
      setDetallesPedido(response.data || []);
      const pedido = pedidos.find(p => p.id_pedido === id);
      setPedidoSeleccionado(pedido);
      setDetalleOpen(true);
    } catch (error) {
      setError('Error al obtener el detalle del pedido');
    }
  };

  const handleCambiarEstado = async (id, estado) => {
    try {
      await PedidosAPI.cambiarEstado(id, estado);
      setSuccessMessage('Estado actualizado correctamente');
      setSuccess(true);
      cargarDatos();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Error al cambiar el estado');
    }
  };

  const handleGenerarAutomatico = async () => {
    try {
      const response = await PedidosAPI.generarAutomatico();
      setSuccessMessage(response.data.message || 'Pedidos generados automáticamente');
      setSuccess(true);
      cargarDatos();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Error al generar pedidos automáticos');
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Pedidos
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            color="warning"
            onClick={handleGenerarAutomatico}
          >
            Generar Automático
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
            Nuevo Pedido
          </Button>
        </Box>
      </Box>

      <Paper sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>N° Pedido</TableCell>
                <TableCell>Proveedor</TableCell>
                {!isMobile && <TableCell>Fecha</TableCell>}
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id_pedido}>
                  <TableCell>{pedido.numero_pedido}</TableCell>
                  <TableCell>{pedido.proveedor_nombre}</TableCell>
                  {!isMobile && (
                    <TableCell>
                      {pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toLocaleDateString() : '-'}
                    </TableCell>
                  )}
                  <TableCell align="right">
                    ${pedido.total?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getEstadoTexto(pedido.id_estado)}
                      color={getEstadoColor(pedido.id_estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleVerDetalle(pedido.id_pedido)}
                      title="Ver Detalle"
                    >
                      <Receipt fontSize="small" />
                    </IconButton>
                    {pedido.id_estado === 1 && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleCambiarEstado(pedido.id_pedido, 2)}
                          title="Marcar como Enviado"
                        >
                          <Check fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCambiarEstado(pedido.id_pedido, 4)}
                          title="Cancelar Pedido"
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    {pedido.id_estado === 2 && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleCambiarEstado(pedido.id_pedido, 3)}
                        title="Marcar como Recibido"
                      >
                        <Check fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {pedidos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No hay pedidos pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog Nuevo Pedido */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Pedido</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={nuevoPedido.id_proveedor}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, id_proveedor: e.target.value })}
                  label="Proveedor"
                >
                  {proveedores.map((prov) => (
                    <MenuItem key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones"
                multiline
                rows={2}
                value={nuevoPedido.observaciones}
                onChange={(e) => setNuevoPedido({ ...nuevoPedido, observaciones: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Agregar Productos
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <FormControl sx={{ minWidth: 200, flex: 1 }}>
                  <InputLabel>Producto</InputLabel>
                  <Select
                    value={productoSeleccionado.id_producto}
                    onChange={(e) => setProductoSeleccionado({ ...productoSeleccionado, id_producto: e.target.value })}
                    label="Producto"
                  >
                    {productos.map((p) => (
                      <MenuItem key={p.id_producto} value={p.id_producto}>
                        {p.codigo} - {p.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  type="number"
                  label="Cantidad"
                  value={productoSeleccionado.cantidad}
                  onChange={(e) => setProductoSeleccionado({ ...productoSeleccionado, cantidad: parseInt(e.target.value) || 1 })}
                  sx={{ width: 100 }}
                  inputProps={{ min: 1 }}
                />
                <Button variant="outlined" onClick={handleAgregarProducto}>
                  Agregar
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Productos del Pedido
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                      <TableCell align="center"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {nuevoPedido.detalles.map((detalle, index) => (
                      <TableRow key={index}>
                        <TableCell>{detalle.codigo}</TableCell>
                        <TableCell>{detalle.nombre}</TableCell>
                        <TableCell align="center">{detalle.cantidad}</TableCell>
                        <TableCell align="right">${detalle.precio_unitario.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          ${(detalle.cantidad * detalle.precio_unitario).toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarProductoPedido(index)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {nuevoPedido.detalles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No hay productos agregados
                        </TableCell>
                      </TableRow>
                    )}
                    {nuevoPedido.detalles.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="right">
                          <strong>Total:</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            ${nuevoPedido.detalles.reduce((sum, d) => sum + (d.cantidad * d.precio_unitario), 0).toFixed(2)}
                          </strong>
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarPedido}>
            Guardar Pedido
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Detalle Pedido */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle del Pedido</DialogTitle>
        <DialogContent>
          {pedidoSeleccionado && (
            <Box>
              <Typography variant="body2" color="textSecondary">
                N° Pedido: {pedidoSeleccionado.numero_pedido}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Proveedor: {pedidoSeleccionado.proveedor_nombre}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Fecha: {pedidoSeleccionado.fecha_pedido ? new Date(pedidoSeleccionado.fecha_pedido).toLocaleString() : '-'}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detallesPedido.map((detalle) => (
                      <TableRow key={detalle.id_detalle}>
                        <TableCell>{detalle.codigo}</TableCell>
                        <TableCell>{detalle.producto_nombre}</TableCell>
                        <TableCell align="center">{detalle.cantidad}</TableCell>
                        <TableCell align="right">${detalle.precio_unitario.toFixed(2)}</TableCell>
                        <TableCell align="right">${detalle.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <strong>Total:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>${pedidoSeleccionado.total?.toFixed(2) || '0.00'}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleOpen(false)}>Cerrar</Button>
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

export default Pedidos;

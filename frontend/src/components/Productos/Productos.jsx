import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextField,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { Add, Search, Edit, Delete, Inventory } from '@mui/icons-material';
import { ProductosAPI } from '../../api/productos';
import { useStock } from '../../context/StockContext';
import useDebounce from '../../hooks/useDebounce';

function Productos() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const { 
    productos, 
    categorias, 
    proveedores, 
    loading,
    loadingCategorias,
    loadingProveedores,
    cargarProductos, 
    cargarCategorias, 
    cargarProveedores,
  } = useStock();
  
  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStockOpen, setDialogStockOpen] = useState(false);
  const [productoEdit, setProductoEdit] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    id_categoria: '',
    id_proveedor: '',
    precio_compra: 0,
    precio_venta: 0,
    stock_actual: 0,
    stock_minimo: 5,
    ubicacion: '',
    unidad_medida: 'unidad',
  });

  const [stockData, setStockData] = useState({
    cantidad: 1,
    tipo_movimiento: 3,
    motivo: 'Ajuste manual',
  });

  const generarCodigo = useCallback(() => {
    const fecha = new Date();
    const anio = fecha.getFullYear().toString().slice(-2);
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `PROD-${anio}${mes}${dia}-${random}`;
  }, []);

  // Cargar datos al montar
  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    cargarProveedores();
  }, [cargarProductos, cargarCategorias, cargarProveedores]);

  // Filtrar productos con debounce
  const filteredProductos = useMemo(() => {
    if (!debouncedBusqueda) return productos;
    const search = debouncedBusqueda.toLowerCase();
    return productos.filter(p =>
      p.nombre?.toLowerCase().includes(search) ||
      p.codigo?.toLowerCase().includes(search)
    );
  }, [productos, debouncedBusqueda]);

  const getStockColor = (estado) => {
    switch (estado) {
      case 'SIN STOCK': return 'error';
      case 'STOCK BAJO': return 'warning';
      default: return 'success';
    }
  };

  const handleOpenDialog = useCallback((producto = null) => {
    if (producto) {
      setProductoEdit(producto);
      setFormData({
        codigo: producto.codigo || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        id_categoria: producto.id_categoria || '',
        id_proveedor: producto.id_proveedor || '',
        precio_compra: producto.precio_compra || 0,
        precio_venta: producto.precio_venta || 0,
        stock_actual: producto.stock_actual || 0,
        stock_minimo: producto.stock_minimo || 5,
        ubicacion: producto.ubicacion || '',
        unidad_medida: producto.unidad_medida || 'unidad',
      });
    } else {
      setProductoEdit(null);
      setFormData({
        codigo: generarCodigo(),
        nombre: '',
        descripcion: '',
        id_categoria: '',
        id_proveedor: '',
        precio_compra: 0,
        precio_venta: 0,
        stock_actual: 0,
        stock_minimo: 5,
        ubicacion: '',
        unidad_medida: 'unidad',
      });
    }
    setDialogOpen(true);
  }, [generarCodigo]);

  const handleSaveProducto = useCallback(async () => {
    if (!formData.codigo || !formData.nombre) {
      setError('Codigo y nombre son requeridos');
      return;
    }

    setSaving(true);
    try {
      if (productoEdit) {
        await ProductosAPI.update(productoEdit.id_producto, formData);
        setSuccessMessage('Producto actualizado correctamente');
      } else {
        await ProductosAPI.create(formData);
        setSuccessMessage('Producto creado correctamente');
      }

      setDialogOpen(false);
      setSuccess(true);
      await cargarProductos(true); // Forzar recarga
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  }, [formData, productoEdit, cargarProductos]);

  const handleDeleteProducto = useCallback(async (id) => {
    if (window.confirm('¿Esta seguro de eliminar este producto?')) {
      try {
        await ProductosAPI.delete(id);
        setSuccessMessage('Producto eliminado correctamente');
        setSuccess(true);
        await cargarProductos(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError('Error al eliminar el producto');
      }
    }
  }, [cargarProductos]);

  const handleAjustarStock = useCallback(async () => {
    try {
      const cantidad = stockData.tipo_movimiento === 3 ? stockData.cantidad : -stockData.cantidad;
      await ProductosAPI.ajustarStock(productoEdit.id_producto, {
        cantidad: cantidad,
        tipo_movimiento: stockData.tipo_movimiento,
        motivo: stockData.motivo,
      });
      setDialogStockOpen(false);
      setSuccessMessage('Stock ajustado correctamente');
      setSuccess(true);
      await cargarProductos(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al ajustar el stock');
    }
  }, [productoEdit, stockData, cargarProductos]);

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Productos
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Nuevo Producto
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por codigo o nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          size={isMobile ? "small" : "medium"}
        />
      </Paper>

      <Paper sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table size={isMobile ? "small" : "medium"} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Codigo
                </TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Producto
                </TableCell>
                {!isTablet && (
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                    Categoria
                  </TableCell>
                )}
                <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Stock
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Estado
                </TableCell>
                {!isMobile && (
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                    Precio
                  </TableCell>
                )}
                <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProductos.map((producto) => (
                <TableRow key={producto.id_producto} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{producto.codigo}</TableCell>
                  <TableCell>{producto.nombre}</TableCell>
                  {!isTablet && (
                    <TableCell>{producto.categoria_nombre || '-'}</TableCell>
                  )}
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {producto.stock_actual} / {producto.stock_minimo}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={producto.estado_stock || 'NORMAL'}
                      color={getStockColor(producto.estado_stock)}
                      size="small"
                      sx={{ minWidth: 90, fontWeight: 500 }}
                    />
                  </TableCell>
                  {!isMobile && (
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      ${producto.precio_venta?.toFixed(2) || '0.00'}
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => {
                          setProductoEdit(producto);
                          setDialogStockOpen(true);
                        }}
                        title="Ajustar Stock"
                      >
                        <Inventory fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(producto)}
                        title="Editar"
                      >
                        <Edit fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteProducto(producto.id_producto)}
                        title="Eliminar"
                      >
                        <Delete fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProductos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isMobile ? 5 : 7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No hay productos registrados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog Producto */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {productoEdit ? 'Editar Producto' : 'Nuevo Producto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                required
                disabled={!!productoEdit}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripcion"
                multiline
                rows={2}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"} disabled={loadingCategorias}>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.id_categoria}
                  onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value })}
                  label="Categoria"
                >
                  <MenuItem value="">Sin categoria</MenuItem>
                  {categorias.map((cat) => (
                    <MenuItem key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"} disabled={loadingProveedores}>
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={formData.id_proveedor}
                  onChange={(e) => setFormData({ ...formData, id_proveedor: e.target.value })}
                  label="Proveedor"
                >
                  <MenuItem value="">Sin proveedor</MenuItem>
                  {proveedores.map((prov) => (
                    <MenuItem key={prov.id_proveedor} value={prov.id_proveedor}>
                      {prov.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Precio Compra"
                value={formData.precio_compra}
                onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) || 0 })}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Precio Venta"
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Stock Minimo"
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                InputProps={{ inputProps: { min: 0 } }}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ubicacion"
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Unidad de Medida</InputLabel>
                <Select
                  value={formData.unidad_medida}
                  onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                  label="Unidad de Medida"
                >
                  <MenuItem value="unidad">Unidad</MenuItem>
                  <MenuItem value="kg">Kilogramo</MenuItem>
                  <MenuItem value="litro">Litro</MenuItem>
                  <MenuItem value="docena">Docena</MenuItem>
                  <MenuItem value="par">Par</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveProducto} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Ajuste de Stock */}
      <Dialog open={dialogStockOpen} onClose={() => setDialogStockOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajuste de Stock - {productoEdit?.nombre}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary">
                Stock actual: {productoEdit?.stock_actual || 0} unidades
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Tipo de Operacion</InputLabel>
                <Select
                  value={stockData.tipo_movimiento}
                  onChange={(e) => setStockData({ ...stockData, tipo_movimiento: parseInt(e.target.value) })}
                  label="Tipo de Operacion"
                >
                  <MenuItem value={3}>Agregar Stock (Entrada)</MenuItem>
                  <MenuItem value={4}>Quitar Stock (Salida)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad"
                value={stockData.cantidad}
                onChange={(e) => setStockData({ ...stockData, cantidad: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1 }}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Motivo"
                value={stockData.motivo}
                onChange={(e) => setStockData({ ...stockData, motivo: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogStockOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleAjustarStock}>
            Aplicar Cambio
          </Button>
        </DialogActions>
      </Dialog>

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

export default Productos;
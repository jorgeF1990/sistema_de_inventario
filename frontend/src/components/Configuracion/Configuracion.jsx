import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  LinearProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import {
  Save,
  PersonAdd,
  Edit,
  Delete,
  Security,
  Storage,
  Notifications,
  Palette,
  Business,
  People,
  LocalShipping,
} from '@mui/icons-material';
import { ConfiguracionAPI } from '../../api/configuracion';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ padding: '24px 0' }}>
      {value === index && children}
    </div>
  );
}

function Configuracion() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [config, setConfig] = useState({
    empresa: 'Sistema de Control de Stock',
    direccion: '',
    telefono: '',
    email: '',
    website: '',
    ruc: '',
    iva: 21,
    stock_minimo_default: 5,
    alertas_stock: true,
    notificaciones_email: false,
    moneda: 'ARS',
  });

  const [clientes, setClientes] = useState([]);
  const [dialogClienteOpen, setDialogClienteOpen] = useState(false);
  const [clienteEdit, setClienteEdit] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
    tipo: 'CONSUMIDOR FINAL',
  });

  const [proveedores, setProveedores] = useState([]);
  const [dialogProveedorOpen, setDialogProveedorOpen] = useState(false);
  const [proveedorEdit, setProveedorEdit] = useState(null);
  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
    contacto_nombre: '',
    contacto_telefono: '',
  });

  const [usuarios, setUsuarios] = useState([]);
  const [dialogUsuarioOpen, setDialogUsuarioOpen] = useState(false);
  const [usuarioEdit, setUsuarioEdit] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre_usuario: '',
    nombre_completo: '',
    email: '',
    contrasena: '',
    id_rol: 2,
    activo: true,
  });

  const cargarConfiguracion = async () => {
    try {
      const response = await ConfiguracionAPI.getConfiguracion();
      if (response.data) {
        setConfig({
          empresa: response.data.empresa || 'Sistema de Control de Stock',
          direccion: response.data.direccion || '',
          telefono: response.data.telefono || '',
          email: response.data.email || '',
          website: response.data.website || '',
          ruc: response.data.ruc || '',
          iva: response.data.iva || 21,
          stock_minimo_default: response.data.stock_minimo_default || 5,
          alertas_stock: response.data.alertas_stock !== undefined ? response.data.alertas_stock : true,
          notificaciones_email: response.data.notificaciones_email || false,
          moneda: response.data.moneda || 'ARS',
        });
      }
    } catch (error) {
      console.error('Error cargando configuracion:', error);
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await ConfiguracionAPI.getClientes();
      setClientes(response.data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const cargarProveedores = async () => {
    try {
      const response = await ConfiguracionAPI.getProveedores();
      setProveedores(response.data || []);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const response = await ConfiguracionAPI.getUsuarios();
      setUsuarios(response.data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
    cargarClientes();
    cargarProveedores();
    cargarUsuarios();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleConfigChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setConfig({ ...config, [field]: value });
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await ConfiguracionAPI.guardarConfiguracion( config);
      setSuccessMessage('Configuracion guardada correctamente');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Error al guardar la configuracion');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClienteDialog = (cliente = null) => {
    if (cliente) {
      setClienteEdit(cliente);
      setNuevoCliente({
        nombre: cliente.nombre || '',
        ruc: cliente.ruc || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        direccion: cliente.direccion || '',
        tipo: cliente.tipo || 'CONSUMIDOR FINAL',
      });
    } else {
      setClienteEdit(null);
      setNuevoCliente({
        nombre: '',
        ruc: '',
        telefono: '',
        email: '',
        direccion: '',
        tipo: 'CONSUMIDOR FINAL',
      });
    }
    setDialogClienteOpen(true);
  };

  const handleSaveCliente = async () => {
    if (!nuevoCliente.nombre) {
      setError('El nombre del cliente es requerido');
      return;
    }

    try {
      if (clienteEdit) {
        await ConfiguracionAPI.actualizarCliente(clienteEdit.id_cliente, nuevoCliente);
        setSuccessMessage('Cliente actualizado correctamente');
      } else {
        await ConfiguracionAPI.crearCliente( nuevoCliente);
        setSuccessMessage('Cliente creado correctamente');
      }
      setDialogClienteOpen(false);
      cargarClientes();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Error al guardar el cliente');
    }
  };

  const handleDeleteCliente = async (id) => {
    if (window.confirm('¿Esta seguro de eliminar este cliente?')) {
      try {
        await ConfiguracionAPI.eliminarCliente(id);
        cargarClientes();
        setSuccessMessage('Cliente eliminado correctamente');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        setError('Error al eliminar el cliente');
      }
    }
  };

  const handleOpenProveedorDialog = (proveedor = null) => {
    if (proveedor) {
      setProveedorEdit(proveedor);
      setNuevoProveedor({
        nombre: proveedor.nombre || '',
        ruc: proveedor.ruc || '',
        telefono: proveedor.telefono || '',
        email: proveedor.email || '',
        direccion: proveedor.direccion || '',
        contacto_nombre: proveedor.contacto_nombre || '',
        contacto_telefono: proveedor.contacto_telefono || '',
      });
    } else {
      setProveedorEdit(null);
      setNuevoProveedor({
        nombre: '',
        ruc: '',
        telefono: '',
        email: '',
        direccion: '',
        contacto_nombre: '',
        contacto_telefono: '',
      });
    }
    setDialogProveedorOpen(true);
  };

  const handleSaveProveedor = async () => {
    if (!nuevoProveedor.nombre) {
      setError('El nombre del proveedor es requerido');
      return;
    }

    try {
      if (proveedorEdit) {
        await ConfiguracionAPI.actualizarProveedor(proveedorEdit.id_proveedor, nuevoProveedor);
        setSuccessMessage('Proveedor actualizado correctamente');
      } else {
        await ConfiguracionAPI.crearProveedor( nuevoProveedor);
        setSuccessMessage('Proveedor creado correctamente');
      }
      setDialogProveedorOpen(false);
      cargarProveedores();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Error al guardar el proveedor');
    }
  };

  const handleDeleteProveedor = async (id) => {
    if (window.confirm('¿Esta seguro de eliminar este proveedor?')) {
      try {
        await ConfiguracionAPI.eliminarProveedor(id);
        cargarProveedores();
        setSuccessMessage('Proveedor eliminado correctamente');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        setError('Error al eliminar el proveedor');
      }
    }
  };

  // ============================================
  // USUARIOS - CORREGIDO
  // ============================================

  const handleOpenUsuarioDialog = (usuario = null) => {
    if (usuario) {
      setUsuarioEdit(usuario);
      setNuevoUsuario({
        nombre_usuario: usuario.nombre_usuario || '',
        nombre_completo: usuario.nombre_completo || '',
        email: usuario.email || '',
        contrasena: '',
        id_rol: usuario.id_rol || 2,
        activo: usuario.activo !== undefined ? usuario.activo : true,
      });
    } else {
      setUsuarioEdit(null);
      setNuevoUsuario({
        nombre_usuario: '',
        nombre_completo: '',
        email: '',
        contrasena: '',
        id_rol: 2,
        activo: true,
      });
    }
    setDialogUsuarioOpen(true);
  };

  const handleSaveUsuario = async () => {
    if (!nuevoUsuario.nombre_usuario || !nuevoUsuario.nombre_completo) {
      setError('Nombre de usuario y nombre completo son requeridos');
      return;
    }

    try {
      const usuarioData = {
        nombre_completo: nuevoUsuario.nombre_completo,
        email: nuevoUsuario.email,
        id_rol: nuevoUsuario.id_rol,
        activo: nuevoUsuario.activo,
      };

      if (usuarioEdit) {
        await ConfiguracionAPI.actualizarUsuario(usuarioEdit.id_usuario, usuarioData);
        setSuccessMessage('Usuario actualizado correctamente');
      } else {
        await ConfiguracionAPI.crearUsuario({
          ...nuevoUsuario,
          contrasena: nuevoUsuario.contrasena || 'admin123',
        });
        setSuccessMessage('Usuario creado correctamente');
      }
      setDialogUsuarioOpen(false);
      cargarUsuarios();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Error al guardar el usuario');
    }
  };

  const handleDeleteUsuario = async (id) => {
    if (window.confirm('¿Esta seguro de eliminar este usuario?')) {
      try {
        await ConfiguracionAPI.eliminarUsuario(id);
        cargarUsuarios();
        setSuccessMessage('Usuario eliminado correctamente');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        setError('Error al eliminar el usuario');
      }
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" mb={3}>
        Configuracion
      </Typography>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
        >
          <Tab icon={<Business />} label="Empresa" />
          <Tab icon={<People />} label="Clientes" />
          <Tab icon={<LocalShipping />} label="Proveedores" />
          <Tab icon={<Security />} label="Usuarios" />
          <Tab icon={<Notifications />} label="Notificaciones" />
        </Tabs>

        <Box sx={{ px: 3, pb: 3 }}>
          {/* Panel Empresa */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom fontWeight="600">
                  Datos de la Empresa
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre de la Empresa"
                  value={config.empresa}
                  onChange={handleConfigChange('empresa')}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="RUC / CUIT"
                  value={config.ruc}
                  onChange={handleConfigChange('ruc')}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefono"
                  value={config.telefono}
                  onChange={handleConfigChange('telefono')}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={config.email}
                  onChange={handleConfigChange('email')}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sitio Web"
                  value={config.website}
                  onChange={handleConfigChange('website')}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Moneda"
                  value={config.moneda}
                  onChange={handleConfigChange('moneda')}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Direccion"
                  multiline
                  rows={2}
                  value={config.direccion}
                  onChange={handleConfigChange('direccion')}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mt: 2 }}>
                  Configuracion de Stock
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="IVA (%)"
                  value={config.iva}
                  onChange={handleConfigChange('iva')}
                  inputProps={{ min: 0, max: 100 }}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Stock Minimo por Defecto"
                  value={config.stock_minimo_default}
                  onChange={handleConfigChange('stock_minimo_default')}
                  inputProps={{ min: 0 }}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveConfig}
                  disabled={loading}
                  size="large"
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Guardando...' : 'Guardar Configuracion'}
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Panel Clientes */}
          <TabPanel value={tabValue} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
              <Typography variant="h6" fontWeight="600">Lista de Clientes</Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => handleOpenClienteDialog()}
                size={isMobile ? "small" : "medium"}
              >
                Nuevo Cliente
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size={isMobile ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
                    {!isTablet && <TableCell sx={{ fontWeight: 600 }}>RUC</TableCell>}
                    {!isTablet && <TableCell sx={{ fontWeight: 600 }}>Telefono</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Tipo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id_cliente} hover>
                      <TableCell>{cliente.nombre}</TableCell>
                      {!isTablet && <TableCell>{cliente.ruc || '-'}</TableCell>}
                      {!isTablet && <TableCell>{cliente.telefono || '-'}</TableCell>}
                      <TableCell align="center">
                        <Chip
                          label={cliente.tipo || 'CONSUMIDOR FINAL'}
                          size="small"
                          color={cliente.tipo === 'CONSUMIDOR FINAL' ? 'default' : 'primary'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleOpenClienteDialog(cliente)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteCliente(cliente.id_cliente)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No hay clientes registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Panel Proveedores */}
          <TabPanel value={tabValue} index={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
              <Typography variant="h6" fontWeight="600">Lista de Proveedores</Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => handleOpenProveedorDialog()}
                size={isMobile ? "small" : "medium"}
              >
                Nuevo Proveedor
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size={isMobile ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
                    {!isTablet && <TableCell sx={{ fontWeight: 600 }}>RUC</TableCell>}
                    {!isTablet && <TableCell sx={{ fontWeight: 600 }}>Telefono</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Contacto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proveedores.map((proveedor) => (
                    <TableRow key={proveedor.id_proveedor} hover>
                      <TableCell>{proveedor.nombre}</TableCell>
                      {!isTablet && <TableCell>{proveedor.ruc || '-'}</TableCell>}
                      {!isTablet && <TableCell>{proveedor.telefono || '-'}</TableCell>}
                      <TableCell align="center">
                        {proveedor.contacto_nombre || '-'}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleOpenProveedorDialog(proveedor)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteProveedor(proveedor.id_proveedor)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {proveedores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No hay proveedores registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Panel Usuarios - CORREGIDO */}
          <TabPanel value={tabValue} index={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
              <Typography variant="h6" fontWeight="600">Usuarios del Sistema</Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => handleOpenUsuarioDialog()}
                size={isMobile ? "small" : "medium"}
              >
                Nuevo Usuario
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size={isMobile ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Usuario</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nombre Completo</TableCell>
                    {!isTablet && <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Rol</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Estado</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id_usuario} hover>
                      <TableCell>{usuario.nombre_usuario}</TableCell>
                      <TableCell>{usuario.nombre_completo}</TableCell>
                      {!isTablet && <TableCell>{usuario.email || '-'}</TableCell>}
                      <TableCell align="center">
                        <Chip
                          label={usuario.id_rol === 1 ? 'Administrador' : usuario.id_rol === 2 ? 'Vendedor' : 'Encargado Compras'}
                          color={usuario.id_rol === 1 ? 'primary' : usuario.id_rol === 2 ? 'default' : 'info'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={usuario.activo ? 'Activo' : 'Inactivo'}
                          color={usuario.activo ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleOpenUsuarioDialog(usuario)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteUsuario(usuario.id_usuario)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {usuarios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No hay usuarios registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Panel Notificaciones */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Preferencias de Notificaciones
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.alertas_stock}
                    onChange={handleConfigChange('alertas_stock')}
                  />
                }
                label="Alertas de stock bajo"
              />
            </Card>

            <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.notificaciones_email}
                    onChange={handleConfigChange('notificaciones_email')}
                  />
                }
                label="Notificaciones por email"
              />
            </Card>

            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveConfig}
              size="large"
            >
              Guardar Preferencias
            </Button>
          </TabPanel>
        </Box>
      </Paper>

      {/* Dialog Cliente */}
      <Dialog open={dialogClienteOpen} onClose={() => setDialogClienteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{clienteEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre" value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="RUC" value={nuevoCliente.ruc} onChange={(e) => setNuevoCliente({ ...nuevoCliente, ruc: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Telefono" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email" type="email" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Direccion" value={nuevoCliente.direccion} onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select value={nuevoCliente.tipo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo: e.target.value })} label="Tipo">
                  <MenuItem value="CONSUMIDOR FINAL">Consumidor Final</MenuItem>
                  <MenuItem value="EMPRESA">Empresa</MenuItem>
                  <MenuItem value="MAYORISTA">Mayorista</MenuItem>
                  <MenuItem value="MINORISTA">Minorista</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogClienteOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCliente}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Proveedor */}
      <Dialog open={dialogProveedorOpen} onClose={() => setDialogProveedorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{proveedorEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre" value={nuevoProveedor.nombre} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="RUC" value={nuevoProveedor.ruc} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, ruc: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Telefono" value={nuevoProveedor.telefono} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, telefono: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email" type="email" value={nuevoProveedor.email} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, email: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Direccion" value={nuevoProveedor.direccion} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, direccion: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Persona de Contacto" value={nuevoProveedor.contacto_nombre} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, contacto_nombre: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Telefono de Contacto" value={nuevoProveedor.contacto_telefono} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, contacto_telefono: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogProveedorOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveProveedor}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Usuario - CORREGIDO con Rol y Estado */}
      <Dialog open={dialogUsuarioOpen} onClose={() => setDialogUsuarioOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{usuarioEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de Usuario"
                value={nuevoUsuario.nombre_usuario}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre_usuario: e.target.value })}
                required
                disabled={!!usuarioEdit}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre Completo"
                value={nuevoUsuario.nombre_completo}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre_completo: e.target.value })}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={nuevoUsuario.email}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            {!usuarioEdit && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contrasena"
                  type="password"
                  value={nuevoUsuario.contrasena}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })}
                  helperText="Contrasena por defecto: admin123"
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Rol</InputLabel>
                <Select
                  value={nuevoUsuario.id_rol}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, id_rol: parseInt(e.target.value) })}
                  label="Rol"
                >
                  <MenuItem value={1}>Administrador</MenuItem>
                  <MenuItem value={2}>Vendedor</MenuItem>
                  <MenuItem value={3}>Encargado de Compras</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={nuevoUsuario.activo ? 1 : 0}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, activo: e.target.value === 1 })}
                  label="Estado"
                >
                  <MenuItem value={1}>Activo</MenuItem>
                  <MenuItem value={0}>Inactivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogUsuarioOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveUsuario}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setSuccess(false)}>{successMessage}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={3000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}

export default Configuracion;
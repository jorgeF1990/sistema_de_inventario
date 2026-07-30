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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';
import { Add, Edit, Delete, PersonAdd } from '@mui/icons-material';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const Usuarios = () => {
  const { empresa } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    nombre_usuario: '',
    contrasena: '',
    nombre_completo: '',
    email: '',
    id_rol: 2,
  });

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/auth/empresa/usuarios');
      setUsuarios(response.data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleOpenDialog = (usuario = null) => {
    if (usuario) {
      setEditingUsuario(usuario);
      setFormData({
        nombre_usuario: usuario.nombre_usuario,
        contrasena: '',
        nombre_completo: usuario.nombre_completo,
        email: usuario.email || '',
        id_rol: usuario.id_rol || 2,
      });
    } else {
      setEditingUsuario(null);
      setFormData({
        nombre_usuario: '',
        contrasena: '',
        nombre_completo: '',
        email: '',
        id_rol: 2,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUsuario(null);
    setFormData({
      nombre_usuario: '',
      contrasena: '',
      nombre_completo: '',
      email: '',
      id_rol: 2,
    });
  };

  const handleSaveUsuario = async () => {
    try {
      if (!formData.nombre_usuario || !formData.nombre_completo || !formData.contrasena) {
        setError('Nombre de usuario, nombre completo y contraseña son requeridos');
        return;
      }

      if (editingUsuario) {
        // Actualizar usuario
        await api.put(`/configuracion/usuarios/${editingUsuario.id_usuario}`, {
          nombre_completo: formData.nombre_completo,
          email: formData.email,
          id_rol: formData.id_rol,
        });
        setSuccessMessage('Usuario actualizado correctamente');
      } else {
        // Crear nuevo usuario
        await api.post('/auth/usuarios', formData);
        setSuccessMessage('Usuario creado correctamente');
      }

      setSuccess(true);
      handleCloseDialog();
      cargarUsuarios();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Error al guardar el usuario');
    }
  };

  const handleDeleteUsuario = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await api.delete(`/configuracion/usuarios/${id}`);
        setSuccessMessage('Usuario eliminado correctamente');
        setSuccess(true);
        cargarUsuarios();
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        setError('Error al eliminar el usuario');
      }
    }
  };

  const getRolLabel = (rol) => {
    switch (rol) {
      case 1: return 'Administrador';
      case 2: return 'Vendedor';
      case 3: return 'Encargado Compras';
      default: return 'Desconocido';
    }
  };

  const getRolColor = (rol) => {
    switch (rol) {
      case 1: return 'primary';
      case 2: return 'default';
      case 3: return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return <Typography>Cargando usuarios...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="600">
          Usuarios de {empresa?.nombre || 'la empresa'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Usuario
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Nombre Completo</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Rol</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id_usuario}>
                <TableCell>{usuario.nombre_usuario}</TableCell>
                <TableCell>{usuario.nombre_completo}</TableCell>
                <TableCell>{usuario.email || '-'}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={getRolLabel(usuario.id_rol)}
                    color={getRolColor(usuario.id_rol)}
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
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(usuario)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteUsuario(usuario.id_usuario)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay usuarios registrados en esta empresa
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Crear/Editar Usuario */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre de Usuario"
            margin="normal"
            value={formData.nombre_usuario}
            onChange={(e) => setFormData({ ...formData, nombre_usuario: e.target.value })}
            required
            disabled={!!editingUsuario}
          />
          {!editingUsuario && (
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              margin="normal"
              value={formData.contrasena}
              onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
              required
              helperText="Mínimo 6 caracteres"
            />
          )}
          <TextField
            fullWidth
            label="Nombre Completo"
            margin="normal"
            value={formData.nombre_completo}
            onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Rol</InputLabel>
            <Select
              value={formData.id_rol}
              onChange={(e) => setFormData({ ...formData, id_rol: parseInt(e.target.value) })}
              label="Rol"
            >
              <MenuItem value={1}>Administrador</MenuItem>
              <MenuItem value={2}>Vendedor</MenuItem>
              <MenuItem value={3}>Encargado de Compras</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveUsuario}>
            {editingUsuario ? 'Actualizar' : 'Crear'}
          </Button>
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
};

export default Usuarios;
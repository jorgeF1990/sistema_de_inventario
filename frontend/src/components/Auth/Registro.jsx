import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert,
  Grid, CircularProgress, useMediaQuery, useTheme, Link, InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Business, Person } from '@mui/icons-material';

// Validaciones memoizadas para evitar recrear funciones
const validateUsername = (username) => {
  const regexAlfanumerico = /^[a-zA-Z0-9]+$/;
  if (!regexAlfanumerico.test(username)) {
    return 'El nombre de usuario solo puede contener letras y números, sin espacios.';
  }
  if (username.length < 3) {
    return 'El nombre de usuario debe contener al menos 3 caracteres.';
  }
  return null;
};

const validatePassword = (password) => {
  if (password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return null;
};

const Registro = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { registro } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Datos del Usuario
  const [usuarioData, setUsuarioData] = useState({
    nombre_usuario: '',
    contrasena: '',
    confirmarContrasena: '',
    nombre_completo: '',
    email: '',
  });

  // Datos de la Empresa
  const [empresaData, setEmpresaData] = useState({
    nombre: '',
    ruc: '',
    telefono: '',
    email: '',
    direccion: '',
    moneda: 'ARS',
    iva: 21.0,
    stock_minimo_default: 5,
  });

  // Validaciones en tiempo real con useCallback
  const usernameError = useMemo(() => validateUsername(usuarioData.nombre_usuario), [usuarioData.nombre_usuario]);
  const passwordError = useMemo(() => validatePassword(usuarioData.contrasena), [usuarioData.contrasena]);
  const confirmPasswordError = useMemo(() => {
    if (usuarioData.contrasena && usuarioData.confirmarContrasena && 
        usuarioData.contrasena !== usuarioData.confirmarContrasena) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  }, [usuarioData.contrasena, usuarioData.confirmarContrasena]);

  const handleUsuarioChange = useCallback((field) => (e) => {
    const value = e.target.value;
    setUsuarioData(prev => ({ ...prev, [field]: value }));
    // Limpiar error al escribir
    if (error) setError('');
  }, [error]);

  const handleEmpresaChange = useCallback((field) => (e) => {
    const value = field === 'iva' || field === 'stock_minimo_default' 
      ? parseFloat(e.target.value) || 0 
      : e.target.value;
    setEmpresaData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  }, [error]);

  const validarPasoUsuario = useCallback(() => {
    setError('');
    
    const usernameErr = validateUsername(usuarioData.nombre_usuario);
    if (usernameErr) {
      setError(usernameErr);
      return false;
    }

    const passErr = validatePassword(usuarioData.contrasena);
    if (passErr) {
      setError(passErr);
      return false;
    }

    if (usuarioData.contrasena !== usuarioData.confirmarContrasena) {
      setError('Las contraseñas ingresadas no coinciden.');
      return false;
    }

    if (!usuarioData.nombre_completo || !usuarioData.email) {
      setError('Todos los campos de usuario son requeridos.');
      return false;
    }

    return true;
  }, [usuarioData]);

  const handleNextStep = useCallback(() => {
    if (validarPasoUsuario()) {
      setStep(2);
    }
  }, [validarPasoUsuario]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!empresaData.nombre) {
      setError('El nombre de la empresa es requerido.');
      return;
    }

    setLoading(true);

    const payload = {
      nombre_usuario: usuarioData.nombre_usuario.toLowerCase().trim(),
      contrasena: usuarioData.contrasena,
      nombre_completo: usuarioData.nombre_completo.trim(),
      email: usuarioData.email.trim(),
      empresa: {
        nombre: empresaData.nombre.trim(),
        ruc: empresaData.ruc.trim(),
        telefono: empresaData.telefono.trim(),
        email: empresaData.email.trim() || usuarioData.email.trim(),
        direccion: empresaData.direccion.trim(),
        moneda: empresaData.moneda.trim(),
        iva: empresaData.iva,
        stock_minimo_default: empresaData.stock_minimo_default,
      }
    };

    const response = await registro(payload);

    if (response.success) {
      setSuccess(true);
      // Usar setTimeout con cleanup
      const timeoutId = setTimeout(() => {
        navigate('/login');
      }, 3000);
      return () => clearTimeout(timeoutId);
    } else {
      setError(response.error);
      setLoading(false);
    }
  }, [usuarioData, empresaData, registro, navigate]);

  // Memoizar el contenido del paso 1
  const paso1Content = useMemo(() => (
    <Box component="form" noValidate>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nombre de Usuario"
            value={usuarioData.nombre_usuario}
            onChange={handleUsuarioChange('nombre_usuario')}
            required
            error={!!usernameError && usuarioData.nombre_usuario.length > 0}
            helperText={usernameError && usuarioData.nombre_usuario.length > 0 ? usernameError : 'Solo se permiten letras y números'}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nombre Completo"
            value={usuarioData.nombre_completo}
            onChange={handleUsuarioChange('nombre_completo')}
            required
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email de Contacto"
            type="email"
            value={usuarioData.email}
            onChange={handleUsuarioChange('email')}
            required
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={usuarioData.contrasena}
            onChange={handleUsuarioChange('contrasena')}
            required
            error={!!passwordError && usuarioData.contrasena.length > 0}
            helperText={passwordError && usuarioData.contrasena.length > 0 ? passwordError : 'Mínimo 6 caracteres'}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(prev => !prev)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Confirmar Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={usuarioData.confirmarContrasena}
            onChange={handleUsuarioChange('confirmarContrasena')}
            required
            error={!!confirmPasswordError && usuarioData.confirmarContrasena.length > 0}
            helperText={confirmPasswordError && usuarioData.confirmarContrasena.length > 0 ? confirmPasswordError : ''}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
      </Grid>
      <Button
        fullWidth
        variant="contained"
        size="large"
        sx={{ mt: 3, py: 1.5 }}
        onClick={handleNextStep}
        disabled={loading || !!usernameError || !!passwordError || !!confirmPasswordError}
      >
        Siguiente Paso
      </Button>
    </Box>
  ), [usuarioData, handleUsuarioChange, handleNextStep, loading, isMobile, showPassword, usernameError, passwordError, confirmPasswordError]);

  // Memoizar el contenido del paso 2
  const paso2Content = useMemo(() => (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Nombre de la Empresa"
            value={empresaData.nombre}
            onChange={handleEmpresaChange('nombre')}
            required
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="RUC / CUIT"
            value={empresaData.ruc}
            onChange={handleEmpresaChange('ruc')}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Teléfono Corporativo"
            value={empresaData.telefono}
            onChange={handleEmpresaChange('telefono')}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email de la Empresa"
            type="email"
            value={empresaData.email}
            onChange={handleEmpresaChange('email')}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
            placeholder={usuarioData.email}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dirección"
            value={empresaData.direccion}
            onChange={handleEmpresaChange('direccion')}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Moneda"
            value={empresaData.moneda}
            onChange={handleEmpresaChange('moneda')}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="IVA (%)"
            type="number"
            value={empresaData.iva}
            onChange={handleEmpresaChange('iva')}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Stock Mínimo"
            type="number"
            value={empresaData.stock_minimo_default}
            onChange={handleEmpresaChange('stock_minimo_default')}
            size={isMobile ? "small" : "medium"}
            disabled={loading}
            inputProps={{ min: 0 }}
          />
        </Grid>
      </Grid>
      
      <Box display="flex" gap={2} mt={3}>
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={() => setStep(1)}
          disabled={loading}
        >
          Atrás
        </Button>
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || !empresaData.nombre}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Finalizar Registro'}
        </Button>
      </Box>
    </Box>
  ), [empresaData, handleEmpresaChange, handleSubmit, loading, isMobile, usuarioData.email]);

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', borderRadius: 2 }}>
        <Box textAlign="center" mb={3}>
          <Business sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h5" component="h1" fontWeight="bold" mt={1}>
            Registro del Sistema
          </Typography>
          <Typography variant="body2" color="textSecondary" mt={0.5}>
            Paso {step} de 2: {step === 1 ? 'Datos del Administrador' : 'Datos Corporativos'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Registro completado correctamente. Redirigiendo al inicio de sesión...
          </Alert>
        )}

        {step === 1 ? paso1Content : paso2Content}

        <Box mt={3} textAlign="center">
          <Typography variant="body2" color="textSecondary">
            ¿Su empresa ya está registrada?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/login')}
              fontWeight="bold"
              style={{ textDecoration: 'none' }}
              disabled={loading}
            >
              Iniciar sesión aquí
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default React.memo(Registro);
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, Business, Person, Lock } from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const { login, usuario, loading } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Si ya está logueado, redirigir inmediatamente
  useEffect(() => {
    if (!loading && usuario) {
      navigate('/dashboard', { replace: true });
    }
  }, [usuario, loading, navigate]);

  // Si está cargando, mostrar loading
  if (loading) {
    return (
      <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Si ya está logueado, no renderizar el formulario
  if (usuario) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        // El useEffect se encargará de la redirección
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Credenciales incorrectas');
        setIsLoggingIn(false);
      }
    } catch (err) {
      setError('Error al iniciar sesion');
      setIsLoggingIn(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', borderRadius: 2 }}>
        <Box textAlign="center" mb={3}>
          <Business sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h5" component="h1" fontWeight="bold" mt={1}>
            Control de Stock
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Sistema de Gestion de Inventario
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Usuario"
            margin="normal"
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoggingIn}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="Contraseña"
            margin="normal"
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoggingIn}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" disabled={isLoggingIn}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3, py: 1.5 }}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? <CircularProgress size={24} color="inherit" /> : 'INGRESAR'}
          </Button>
        </form>

        <Divider sx={{ my: 3 }} />

        <Box textAlign="center">
          <Typography variant="body2" color="textSecondary">
            ¿Olvidaste tu contraseña?{' '}
            <Link
              to="/forgot-password"
              style={{
                color: '#3498DB',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Recuperar contraseña
            </Link>
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            ¿No tienes cuenta?{' '}
            <Link
              to="/registro"
              style={{
                color: '#3498DB',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Registrarse
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
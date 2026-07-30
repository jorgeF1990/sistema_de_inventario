import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import api from '../../api/axios';

// Componente de éxito memoizado
const SuccessScreen = React.memo(({ navigate }) => (
  <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
    <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2, textAlign: 'center' }}>
      <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Contraseña Actualizada
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Tu contraseña ha sido restablecida correctamente.
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Serás redirigido al inicio de sesión en unos segundos...
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{ mt: 3 }}
      >
        Ir al Login
      </Button>
    </Paper>
  </Container>
));

// Componente de error memoizado
const ErrorScreen = React.memo(({ error, navigate }) => (
  <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
    <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom color="error">
        Token Inválido
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        {error || 'El enlace de recuperación no es válido o ha expirado.'}
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{ mt: 2 }}
      >
        Volver al Login
      </Button>
    </Paper>
  </Container>
));

const ResetPassword = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validaciones memoizadas
  const passwordError = useMemo(() => {
    if (password && password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    return null;
  }, [password]);

  const confirmError = useMemo(() => {
    if (confirmPassword && password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  }, [password, confirmPassword]);

  // Verificar token al cargar
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No se proporcionó un token de recuperación.');
        setVerifying(false);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/auth/verify-reset-token?token=${token}`);
        if (response.data.valid) {
          setTokenValid(true);
        } else {
          setError(response.data.message || 'Token inválido o expirado.');
        }
      } catch (err) {
        setError('Error al verificar el token. Solicita un nuevo enlace.');
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/reset-password', {
        token,
        new_password: password,
      });

      if (response.data.success) {
        setSuccess(true);
        const timeoutId = setTimeout(() => {
          navigate('/');
        }, 3000);
        return () => clearTimeout(timeoutId);
      } else {
        setError(response.data.message || 'Error al restablecer la contraseña.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al restablecer la contraseña.');
      setLoading(false);
    }
  }, [password, confirmPassword, token, navigate]);

  // Estados de carga y error
  if (verifying) {
    return (
      <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!tokenValid && !success) {
    return <ErrorScreen error={error} navigate={navigate} />;
  }

  if (success) {
    return <SuccessScreen navigate={navigate} />;
    
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', borderRadius: 2 }}>
        <Box mb={3}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Nueva Contraseña
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Ingresa tu nueva contraseña para la cuenta.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Nueva Contraseña"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            size={isMobile ? "small" : "medium"}
            error={!!passwordError && password.length > 0}
            helperText={passwordError && password.length > 0 ? passwordError : 'Mínimo 6 caracteres'}
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

          <TextField
            fullWidth
            label="Confirmar Contraseña"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
            size={isMobile ? "small" : "medium"}
            error={!!confirmError && confirmPassword.length > 0}
            helperText={confirmError && confirmPassword.length > 0 ? confirmError : ''}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3, py: 1.5 }}
            disabled={loading || !!passwordError || !!confirmError || !password || !confirmPassword}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Restablecer Contraseña'}
          </Button>
        </form>

        <Box textAlign="center" mt={3}>
          <Typography variant="caption" color="textSecondary">
            <Link component="button" onClick={() => navigate('/')} underline="hover">
              Volver al inicio de sesión
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default React.memo(ResetPassword);
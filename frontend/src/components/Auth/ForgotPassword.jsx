import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Email, ArrowBack, CheckCircle } from '@mui/icons-material';
import api from '../../api/axios';

// Componente de éxito memoizado
const SuccessMessage = React.memo(({ message, navigate }) => (
  <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
    <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2, textAlign: 'center' }}>
      <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Revisa tu Email
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        {message}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        Si no recibes el email en unos minutos, verifica tu carpeta de spam.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{ mt: 3 }}
      >
        Volver al Login
      </Button>
    </Paper>
  </Container>
));

const ForgotPassword = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validación básica de email
    if (!email || !email.includes('@')) {
      setError('Ingresa un email válido.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/auth/forgot-password', { email });

      if (response.data.success) {
        setSuccess(true);
        setMessage(response.data.message || 'Revisa tu email para continuar con la recuperación.');
      } else {
        setError(response.data.message || 'Error al procesar la solicitud');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar la solicitud. Intenta nuevamente.');
      setLoading(false);
    }
  }, [email]);

  if (success) {
    return <SuccessMessage message={message} navigate={navigate} />;
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', borderRadius: 2 }}>
        <Box mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            sx={{ mb: 2, textTransform: 'none' }}
          >
            Volver
          </Button>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Recuperar Contraseña
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
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
            label="Email"
            type="email"
            variant="outlined"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            autoFocus
            size={isMobile ? "small" : "medium"}
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3, py: 1.5 }}
            disabled={loading || !email}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar Enlace'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default React.memo(ForgotPassword);
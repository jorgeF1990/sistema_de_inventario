import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1A2332',
      light: '#2C3E50',
      dark: '#0D1520',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#3498DB',
      light: '#5DADE2',
      dark: '#2E86C1',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#27AE60',
      light: '#2ECC71',
      dark: '#1E8449',
    },
    error: {
      main: '#E74C3C',
      light: '#EC7063',
      dark: '#B03A2E',
    },
    warning: {
      main: '#F39C12',
      light: '#F7DC6F',
      dark: '#D68910',
    },
    info: {
      main: '#3498DB',
      light: '#85C1E9',
      dark: '#2471A3',
    },
    background: {
      default: '#F0F4F8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A2332',
      secondary: '#6B7A8A',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 600, fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.75rem' },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    subtitle1: { fontSize: '1rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        },
        contained: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        },
        elevation1: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 16px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#6B7A8A',
          backgroundColor: '#F8FAFC',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
        },
      },
    },
  },
});

export default theme;
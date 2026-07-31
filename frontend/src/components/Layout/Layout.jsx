import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  CssBaseline,
  useMediaQuery,
  useTheme,
  Divider,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  ShoppingCart,
  Receipt,
  BarChart,
  Settings,
  AccountCircle,
  Business,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Productos', icon: <Inventory />, path: '/productos' },
  { text: 'Ventas', icon: <ShoppingCart />, path: '/ventas' },
  { text: 'Pedidos', icon: <Receipt />, path: '/pedidos' },
  { text: 'Reportes', icon: <BarChart />, path: '/reportes' },
  { text: 'Configuración', icon: <Settings />, path: '/configuracion' },
];

function Layout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, empresa, logout } = useAuth();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  // Cerrar drawer al navegar en móvil
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'primary.main',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Control de Stock
          </Typography>
          
          {empresa && !isMobile && (
            <Chip
              icon={<Business />}
              label={empresa.nombre}
              color="secondary"
              size="small"
              sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
            />
          )}

          <IconButton
            size="large"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {usuario?.nombre_completo?.charAt(0) || usuario?.nombre?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <AccountCircle sx={{ mr: 1 }} />
              {usuario?.nombre_completo || usuario?.nombre || 'Usuario'}
            </MenuItem>
            <MenuItem disabled sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              Empresa: {empresa?.nombre || 'Sin empresa'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? open : true}
        onClose={handleDrawerToggle}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            mt: { xs: '56px', sm: '64px' },
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ overflow: 'auto', py: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setOpen(false);
                }}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          mt: { xs: '56px', sm: '64px' },
          backgroundColor: '#f5f7fa',
          minHeight: '100vh',
          width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
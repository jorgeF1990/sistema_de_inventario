import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import { AccountCircle, Business } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ open, setOpen }) => {
  const { usuario, empresa, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout(); // Esto limpia el estado y el localStorage
    navigate('/login'); // Esto redirige suavemente al login
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Control de Stock
        </Typography>

        {empresa && (
          <Chip
            icon={<Business />}
            label={empresa.nombre}
            color="secondary"
            size="small"
            sx={{ mr: 2 }}
          />
        )}

        <Box>
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {usuario?.nombre?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <AccountCircle sx={{ mr: 1 }} />
              {usuario?.nombre || 'Usuario'}
            </MenuItem>
            <MenuItem disabled sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              Empresa: {empresa?.nombre || 'Sin empresa'}
            </MenuItem>
            <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
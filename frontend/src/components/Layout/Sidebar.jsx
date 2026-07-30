import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
} from '@mui/material';
import {
  Dashboard,
  Inventory,
  ShoppingCart,
  Receipt,
  BarChart,
  Settings,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Productos', icon: <Inventory />, path: '/productos' },
  { text: 'Ventas', icon: <ShoppingCart />, path: '/ventas' },
  { text: 'Pedidos', icon: <Receipt />, path: '/pedidos' },
  { text: 'Reportes', icon: <BarChart />, path: '/reportes' },
  { text: 'Configuración', icon: <Settings />, path: '/configuracion' },
];

function Sidebar({ open }) {
  const navigate = useNavigate();
  const location = useLocation();

  const drawerWidth = 240;
  const collapsedWidth = 60;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          boxSizing: 'border-box',
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          overflowX: 'hidden',
          mt: '64px',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{ opacity: open ? 1 : 0 }}
              />
            </ListItem>
          ))}
        </List>
        <Divider />
      </Box>
    </Drawer>
  );
}

export default Sidebar;

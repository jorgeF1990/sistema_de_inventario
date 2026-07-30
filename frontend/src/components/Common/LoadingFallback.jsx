import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

const LoadingFallback = () => {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
      <LinearProgress sx={{ width: '100%', maxWidth: 400, height: 4, borderRadius: 2 }} />
      <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
        Cargando...
      </Typography>
    </Box>
  );
};

export default LoadingFallback;
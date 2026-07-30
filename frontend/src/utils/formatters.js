export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$ 0,00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
};

export const formatDate = (isoString) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-AR').format(date);
};
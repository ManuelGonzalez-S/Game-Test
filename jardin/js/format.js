// format.js — formateo de números grandes para el idle.
// 1234 -> "1.23K", 1e6 -> "1.00M", etc. Notación científica a partir de cierto punto.

const NUM_SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'
];

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) {
    // Enteros pequeños sin decimales; fracciones con 1 decimal.
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < NUM_SUFFIXES.length) {
    const scaled = n / Math.pow(1000, tier);
    return scaled.toFixed(2) + NUM_SUFFIXES[tier];
  }

  // Muy grande -> notación científica (p.ej. 1.23e75)
  return n.toExponential(2).replace('e+', 'e');
}

// Producción por segundo, formato compacto.
function formatRate(n) {
  return formatNumber(n) + ' /seg';
}

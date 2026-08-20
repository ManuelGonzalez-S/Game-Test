// format.js — formateo de números grandes.
const NUM_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return Number.isInteger(n) ? String(n) : n.toFixed(1);
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < NUM_SUFFIXES.length) {
    return (n / Math.pow(1000, tier)).toFixed(2) + NUM_SUFFIXES[tier];
  }
  return n.toExponential(2).replace('e+', 'e');
}

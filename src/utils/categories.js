export const CATEGORIES = {
  affitto:      { color: '#0D47A1', label: 'Affitto' },
  bollette:     { color: '#F57F17', label: 'Bollette' },
  trasporti:    { color: '#E65100', label: 'Trasporti' },
  ristorante:   { color: '#880E4F', label: 'Ristorante' },
  tempo_libero: { color: '#6A1B9A', label: 'Tempo libero' },
  alimentari:   { color: '#2E7D32', label: 'Alimentari' },
  shopping:     { color: '#00838F', label: 'Shopping' },
  salute:       { color: '#C62828', label: 'Salute' },
  altro:        { color: '#5F5E5A', label: 'Altro' },
};

export const SESSION_ICONS = [
  'appartamento', 'mappamondo', 'cuore', 'ristorante_s', 'aereo'
];

export const SESSION_ICON_COLORS = {
  appartamento: '#3C3489',
  mappamondo:   '#0D47A1',
  cuore:        '#C62828',
  ristorante_s: '#E65100',
  aereo:        '#00838F',
};

export function formatEur(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShortDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function toDate(timestamp) {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
}

import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  SESSION_ICONS,
  SESSION_ICON_COLORS,
  generateJoinCode,
  formatEur,
  formatDate,
  formatShortDate,
  toDate,
} from './categories';

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

describe('CATEGORIES', () => {
  const EXPECTED = [
    'affitto', 'bollette', 'trasporti', 'ristorante',
    'tempo_libero', 'alimentari', 'shopping', 'salute', 'altro'
  ];

  it('contiene esattamente le 9 categorie attese', () => {
    expect(Object.keys(CATEGORIES)).toEqual(EXPECTED);
  });

  it('ogni categoria ha label non vuota e color hex valido', () => {
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      expect(typeof cat.label).toBe('string');
      expect(cat.label.length).toBeGreaterThan(0);
      expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('"altro" è sempre presente come fallback', () => {
    expect(CATEGORIES).toHaveProperty('altro');
  });
});

// ─── SESSION_ICONS ────────────────────────────────────────────────────────────

describe('SESSION_ICONS', () => {
  it('contiene esattamente 5 icone sessione', () => {
    expect(SESSION_ICONS).toHaveLength(5);
  });

  it('contiene tutti i nomi attesi', () => {
    ['appartamento', 'mappamondo', 'cuore', 'ristorante_s', 'aereo'].forEach(name => {
      expect(SESSION_ICONS).toContain(name);
    });
  });

  it('ogni icona sessione ha un colore valido in SESSION_ICON_COLORS', () => {
    SESSION_ICONS.forEach(icon => {
      expect(SESSION_ICON_COLORS).toHaveProperty(icon);
      expect(SESSION_ICON_COLORS[icon]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('SESSION_ICONS non si sovrappone a CATEGORIES', () => {
    SESSION_ICONS.forEach(icon => {
      expect(CATEGORIES).not.toHaveProperty(icon);
    });
  });
});

// ─── generateJoinCode ────────────────────────────────────────────────────────

describe('generateJoinCode', () => {
  it('genera codice di 6 caratteri', () => {
    for (let i = 0; i < 20; i++) expect(generateJoinCode()).toHaveLength(6);
  });

  it('usa solo caratteri maiuscoli e cifre (no 0, 1, O, I)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateJoinCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('genera codici non deterministici', () => {
    const codes = new Set(Array.from({ length: 50 }, generateJoinCode));
    expect(codes.size).toBeGreaterThan(40);
  });
});

// ─── formatEur ───────────────────────────────────────────────────────────────

describe('formatEur', () => {
  it('formatta 0', () => { expect(formatEur(0)).toContain('€'); });
  it('formatta 100', () => { const r = formatEur(100); expect(r).toContain('100'); expect(r).toContain('€'); });
  it('formatta decimali', () => { expect(formatEur(12.5)).toMatch(/12[,.]5/); });
  it('formatta negativo', () => { const r = formatEur(-50); expect(r).toContain('50'); expect(r).toContain('-'); });
});

// ─── formatDate / formatShortDate ─────────────────────────────────────────────

describe('formatDate', () => {
  it('stringa vuota su null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('accetta timestamp Firestore-like con .toDate()', () => {
    const ts = { toDate: () => new Date(2026, 0, 15) };
    const result = formatDate(ts);
    expect(result).toContain('15');
    expect(result.length).toBeGreaterThan(5);
  });
});

describe('formatShortDate', () => {
  it('stringa vuota su null', () => { expect(formatShortDate(null)).toBe(''); });
  it('formato gg/mm/aaaa', () => {
    const ts = { toDate: () => new Date(2026, 5, 9) };
    expect(formatShortDate(ts)).toMatch(/\d{2}\/\d{2}\/2026/);
  });
});

// ─── toDate ───────────────────────────────────────────────────────────────────

describe('toDate', () => {
  it('ritorna Date da Firestore timestamp (.toDate)', () => {
    const d = new Date(2026, 8, 9);
    const ts = { toDate: () => d };
    expect(toDate(ts)).toBe(d);
  });

  it('ritorna Date da oggetto con .seconds', () => {
    const seconds = Math.floor(new Date(2026, 0, 1).getTime() / 1000);
    const result = toDate({ seconds });
    expect(result.getFullYear()).toBe(2026);
  });

  it('ritorna new Date() su null', () => {
    const result = toDate(null);
    expect(result).toBeInstanceOf(Date);
  });
});

import { describe, it, expect } from 'vitest';
import { calculateDebts, getUserBalance, getCategoryBreakdown } from './debtCalculator';

// ─── helpers ────────────────────────────────────────────────────────────────

function expense(paidBy, amount, splitAmong, category = 'food') {
  return { paidBy, amount, splitAmong, category };
}

const ALICE = 'uid-alice';
const BOB   = 'uid-bob';
const CARLO = 'uid-carlo';

const members3 = {
  [ALICE]: { name: 'Alice' },
  [BOB]:   { name: 'Bob' },
  [CARLO]: { name: 'Carlo' },
};
const members2 = {
  [ALICE]: { name: 'Alice' },
  [BOB]:   { name: 'Bob' },
};

// ─── calculateDebts ──────────────────────────────────────────────────────────

describe('calculateDebts', () => {
  it('nessuna spesa → saldi tutti zero, nessun debito', () => {
    const { balances, debts } = calculateDebts([], members2);
    expect(balances[ALICE]).toBe(0);
    expect(balances[BOB]).toBe(0);
    expect(debts).toHaveLength(0);
  });

  it('A paga 100 per A e B → B deve 50 ad A', () => {
    const expenses = [expense(ALICE, 100, [ALICE, BOB])];
    const { balances, debts } = calculateDebts(expenses, members2);

    // Alice: +100 pagato -50 quota = +50
    expect(balances[ALICE]).toBeCloseTo(50);
    // Bob: -50 quota = -50
    expect(balances[BOB]).toBeCloseTo(-50);

    expect(debts).toHaveLength(1);
    expect(debts[0].from).toBe(BOB);
    expect(debts[0].to).toBe(ALICE);
    expect(debts[0].amount).toBeCloseTo(50);
  });

  it('A paga 90, B paga 60, divisi in 3 → C deve ad A e B', () => {
    //   Quota per persona: (90+60)/3 = 50
    //   Alice: +90 - 50 = +40
    //   Bob:   +60 - 50 = +10
    //   Carlo: 0 - 50   = -50
    const expenses = [
      expense(ALICE, 90, [ALICE, BOB, CARLO]),
      expense(BOB,   60, [ALICE, BOB, CARLO]),
    ];
    const { balances, debts } = calculateDebts(expenses, members3);

    expect(balances[ALICE]).toBeCloseTo(40);
    expect(balances[BOB]).toBeCloseTo(10);
    expect(balances[CARLO]).toBeCloseTo(-50);

    // Carlo → Alice 40, Carlo → Bob 10
    expect(debts).toHaveLength(2);
    const toAlice = debts.find(d => d.to === ALICE);
    const toBob   = debts.find(d => d.to === BOB);
    expect(toAlice).toBeDefined();
    expect(toBob).toBeDefined();
    expect(toAlice.from).toBe(CARLO);
    expect(toAlice.amount).toBeCloseTo(40);
    expect(toBob.from).toBe(CARLO);
    expect(toBob.amount).toBeCloseTo(10);
  });

  it('tutti pari → saldi zero, nessun debito', () => {
    // Alice paga 60 per tutti e 3, Bob paga 60, Carlo paga 60 → tutti 0
    const expenses = [
      expense(ALICE, 60, [ALICE, BOB, CARLO]),
      expense(BOB,   60, [ALICE, BOB, CARLO]),
      expense(CARLO, 60, [ALICE, BOB, CARLO]),
    ];
    const { balances, debts } = calculateDebts(expenses, members3);

    expect(balances[ALICE]).toBeCloseTo(0);
    expect(balances[BOB]).toBeCloseTo(0);
    expect(balances[CARLO]).toBeCloseTo(0);
    expect(debts).toHaveLength(0);
  });

  it('spesa divisa solo tra alcuni (split parziale)', () => {
    // A paga 90 ma si divide solo tra A e C (Bob escluso)
    // Alice: +90 - 45 = +45
    // Carlo: -45
    // Bob:   0
    const expenses = [expense(ALICE, 90, [ALICE, CARLO])];
    const { balances, debts } = calculateDebts(expenses, members3);

    expect(balances[ALICE]).toBeCloseTo(45);
    expect(balances[BOB]).toBeCloseTo(0);
    expect(balances[CARLO]).toBeCloseTo(-45);

    expect(debts).toHaveLength(1);
    expect(debts[0].from).toBe(CARLO);
    expect(debts[0].to).toBe(ALICE);
    expect(debts[0].amount).toBeCloseTo(45);
  });

  it('spesa senza splitAmong → ignorata', () => {
    const expenses = [{ paidBy: ALICE, amount: 100, splitAmong: [] }];
    const { balances, debts } = calculateDebts(expenses, members2);
    expect(balances[ALICE]).toBe(0);
    expect(debts).toHaveLength(0);
  });

  it('importi con decimali → arrotondamento corretto al centesimo', () => {
    // 10 / 3 = 3.333... per persona
    const expenses = [expense(ALICE, 10, [ALICE, BOB, CARLO])];
    const { debts } = calculateDebts(expenses, members3);
    debts.forEach(d => {
      expect(d.amount).toBe(Math.round(d.amount * 100) / 100);
    });
  });

  it('debiti semplificati: A→B e C→B collassati in 2 transazioni', () => {
    // A paga 60 per A e B, C paga 0 → A +30, B -30, C 0
    // poi B paga 60 per B e C     → B: -30+60-30=0, C: -30
    // A: +30, B: 0, C: -30 → solo C→A
    const expenses = [
      expense(ALICE, 60, [ALICE, BOB]),
      expense(BOB,   60, [BOB, CARLO]),
    ];
    const { debts } = calculateDebts(expenses, members3);
    expect(debts).toHaveLength(1);
    expect(debts[0].from).toBe(CARLO);
    expect(debts[0].to).toBe(ALICE);
    expect(debts[0].amount).toBeCloseTo(30);
  });
});

// ─── getUserBalance ───────────────────────────────────────────────────────────

describe('getUserBalance', () => {
  it('utente non coinvolto → saldo 0', () => {
    const expenses = [expense(ALICE, 100, [ALICE, BOB])];
    expect(getUserBalance(expenses, CARLO)).toBe(0);
  });

  it('utente ha pagato e si divide → saldo positivo', () => {
    // A paga 100 diviso tra A e B → A: +100 -50 = +50
    const expenses = [expense(ALICE, 100, [ALICE, BOB])];
    expect(getUserBalance(expenses, ALICE)).toBeCloseTo(50);
  });

  it('utente non ha pagato ma si divide → saldo negativo', () => {
    const expenses = [expense(ALICE, 100, [ALICE, BOB])];
    expect(getUserBalance(expenses, BOB)).toBeCloseTo(-50);
  });

  it('più spese → saldi cumulativi corretti', () => {
    // A paga 90 per A,B,C → A: +60, B: -30, C: -30
    // B paga 30 per A,B   → A: +60-15=+45, B: -30+30-15=−15, C: -30
    const expenses = [
      expense(ALICE, 90, [ALICE, BOB, CARLO]),
      expense(BOB,   30, [ALICE, BOB]),
    ];
    expect(getUserBalance(expenses, ALICE)).toBeCloseTo(45);
    expect(getUserBalance(expenses, BOB)).toBeCloseTo(-15);
    expect(getUserBalance(expenses, CARLO)).toBeCloseTo(-30);
  });

  it('lista vuota → 0', () => {
    expect(getUserBalance([], ALICE)).toBe(0);
  });
});

// ─── getCategoryBreakdown ─────────────────────────────────────────────────────

describe('getCategoryBreakdown', () => {
  it('nessuna spesa → totale 0, breakdown vuoto', () => {
    const { breakdown, total } = getCategoryBreakdown([]);
    expect(total).toBe(0);
    expect(Object.keys(breakdown)).toHaveLength(0);
  });

  it('una categoria sola → totale corretto', () => {
    const expenses = [
      expense(ALICE, 30, [ALICE, BOB], 'food'),
      expense(ALICE, 20, [ALICE, BOB], 'food'),
    ];
    const { breakdown, total } = getCategoryBreakdown(expenses);
    expect(total).toBe(50);
    expect(breakdown['food']).toBe(50);
    expect(Object.keys(breakdown)).toHaveLength(1);
  });

  it('più categorie → suddivisione corretta', () => {
    const expenses = [
      expense(ALICE, 40, [ALICE, BOB], 'food'),
      expense(ALICE, 60, [ALICE, BOB], 'hotel'),
      expense(BOB,   25, [ALICE, BOB], 'car'),
    ];
    const { breakdown, total } = getCategoryBreakdown(expenses);
    expect(total).toBe(125);
    expect(breakdown['food']).toBe(40);
    expect(breakdown['hotel']).toBe(60);
    expect(breakdown['car']).toBe(25);
  });

  it('categoria mancante → default "other"', () => {
    const expenses = [{ paidBy: ALICE, amount: 10, splitAmong: [ALICE] }];
    const { breakdown } = getCategoryBreakdown(expenses);
    expect(breakdown['other']).toBe(10);
  });

  it('la somma dei breakdown = totale', () => {
    const expenses = [
      expense(ALICE, 33.33, [ALICE], 'food'),
      expense(BOB,   66.67, [BOB],   'hotel'),
    ];
    const { breakdown, total } = getCategoryBreakdown(expenses);
    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(total);
  });
});

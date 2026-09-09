/**
 * Calculates net balances and simplified debts for a session.
 *
 * @param {Array} expenses - Array of expense objects from Firestore
 * @param {Object} members - Map of uid -> { name }
 * @returns {{ balances: Object, debts: Array }}
 */
export function calculateDebts(expenses, members) {
  // Net balance per uid: positive = owed money, negative = owes money
  const balances = {};

  Object.keys(members).forEach((uid) => {
    balances[uid] = 0;
  });

  expenses.forEach((expense) => {
    const { paidBy, amount, splitAmong } = expense;
    if (!splitAmong || splitAmong.length === 0) return;

    const share = amount / splitAmong.length;

    // Person who paid gets credit
    if (balances[paidBy] !== undefined) {
      balances[paidBy] += amount;
    }

    // Each person in splitAmong owes their share
    splitAmong.forEach((uid) => {
      if (balances[uid] !== undefined) {
        balances[uid] -= share;
      }
    });
  });

  // Simplify debts using greedy algorithm
  const debts = simplifyDebts(balances, members);

  return { balances, debts };
}

/**
 * Greedy debt simplification — minimizes number of transactions.
 */
function simplifyDebts(balances, members) {
  const creditors = []; // owed money (positive balance)
  const debtors = [];   // owe money (negative balance)

  Object.entries(balances).forEach(([uid, balance]) => {
    if (balance > 0.01) {
      creditors.push({ uid, name: members[uid]?.name || uid, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ uid, name: members[uid]?.name || uid, amount: -balance });
    }
  });

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.01) {
      transactions.push({
        from: debtor.uid,
        fromName: debtor.name,
        to: creditor.uid,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return transactions;
}

/**
 * Returns the net balance for a specific user within a session.
 */
export function getUserBalance(expenses, uid) {
  let balance = 0;

  expenses.forEach((expense) => {
    const { paidBy, amount, splitAmong } = expense;
    if (!splitAmong || splitAmong.length === 0) return;

    const share = amount / splitAmong.length;

    if (paidBy === uid) {
      balance += amount;
    }
    if (splitAmong.includes(uid)) {
      balance -= share;
    }
  });

  return Math.round(balance * 100) / 100;
}

/**
 * Calculates category breakdown for a session.
 */
export function getCategoryBreakdown(expenses) {
  const breakdown = {};
  let total = 0;

  expenses.forEach((expense) => {
    const cat = expense.category || 'other';
    if (!breakdown[cat]) breakdown[cat] = 0;
    breakdown[cat] += expense.amount;
    total += expense.amount;
  });

  return { breakdown, total };
}

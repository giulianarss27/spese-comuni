import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import { formatEur, toDate } from '../utils/categories';
import { calculateDebts } from '../utils/debtCalculator';

export default function DebtsScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [allDebts, setAllDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'sessions'),
      where(`members.${user.uid}.joinedAt`, '!=', null)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (sessions.length === 0) return;
    const expBySession = {};
    const unsubs = sessions.map(session => {
      const q = query(collection(db, 'expenses'), where('sessionId', '==', session.id));
      return onSnapshot(q, (snap) => {
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        expBySession[session.id] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const combined = [];
        sessions.forEach(s => {
          const allExps = expBySession[s.id] || [];
          const exps = allExps.filter(e => toDate(e.date) <= todayEnd);
          const { debts } = calculateDebts(exps, s.members || {});
          debts.forEach(d => combined.push({ ...d, sessionId: s.id, sessionName: s.name }));
        });
        setAllDebts(combined);
      });
    });
    return () => unsubs.forEach(u => u());
  }, [sessions]);

  if (loading) return <Spinner fullPage />;

  const iReceive = allDebts.filter(d => d.to === user.uid);
  const iPay = allDebts.filter(d => d.from === user.uid);
  const totalReceive = iReceive.reduce((s, d) => s + d.amount, 0);
  const totalPay = iPay.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="screen">
      <header className="header">
        <div className="header-row">
          <div className="header-title">I miei debiti</div>
          <div />
        </div>
      </header>

      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">Da ricevere</div>
          <div className="metric-value green">{formatEur(totalReceive)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Da pagare</div>
          <div className="metric-value red">{formatEur(totalPay)}</div>
        </div>
      </div>

      {iReceive.length === 0 && iPay.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <div className="empty-state-text">Nessun debito attivo!<br />Sei in pari con tutti.</div>
        </div>
      )}

      {iReceive.length > 0 && (
        <>
          <div className="debt-section-title green">Ti devono ({iReceive.length})</div>
          <div className="card" style={{ margin: '0 1rem 1rem' }}>
            {iReceive.map((debt, i) => (
              <GlobalDebtRow key={i} debt={debt} isReceiving={true} />
            ))}
          </div>
        </>
      )}

      {iPay.length > 0 && (
        <>
          <div className="debt-section-title red">Devi pagare ({iPay.length})</div>
          <div className="card" style={{ margin: '0 1rem 1rem' }}>
            {iPay.map((debt, i) => (
              <GlobalDebtRow key={i} debt={debt} isReceiving={false} />
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}

function GlobalDebtRow({ debt, isReceiving }) {
  const [showModal, setShowModal] = useState(false);
  const [settling, setSettling] = useState(false);

  async function handleSettle() {
    setSettling(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        sessionId: debt.sessionId,
        description: `Rimborso: ${debt.fromName} → ${debt.toName}`,
        amount: debt.amount,
        category: 'altro',
        paidBy: debt.from,
        paidByName: debt.fromName,
        splitAmong: [debt.to],
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
      setShowModal(false);
    } catch (e) {
      console.error('Errore saldo debito:', e);
    } finally {
      setSettling(false);
    }
  }

  return (
    <>
      <div className="debt-row">
        <div className="debt-names">
          <div className="debt-from-to">
            <strong>{debt.fromName}</strong> → <strong>{debt.toName}</strong>
          </div>
          <div className="debt-session">{debt.sessionName}</div>
        </div>
        <div className={`debt-amount ${isReceiving ? 'green' : 'red'}`}>
          {formatEur(debt.amount)}
        </div>
        <div className="debt-actions">
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1.5px solid var(--primary)',
              background: 'transparent',
              color: 'var(--primary)',
              transition: 'opacity 0.15s',
            }}
          >
            Salda
          </button>
        </div>
      </div>

      {showModal && (
        <ConfirmModal
          title="Conferma pagamento"
          message={`${debt.fromName} ha pagato ${formatEur(debt.amount)} a ${debt.toName} (${debt.sessionName})?`}
          confirmLabel="Sì, saldato"
          onConfirm={handleSettle}
          onCancel={() => setShowModal(false)}
          loading={settling}
        />
      )}
    </>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import CategoryIcon from '../components/CategoryIcon';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import { CATEGORIES, toDate } from '../utils/categories';

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function toISO(firestoreDate) {
  if (!firestoreDate) return new Date().toISOString().split('T')[0];
  const d = toDate(firestoreDate);
  return d.toISOString().split('T')[0];
}


export default function EditExpenseScreen() {
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [loadingExpense, setLoadingExpense] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('alimentari');
  const [dateISO, setDateISO] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitAmong, setSplitAmong] = useState([]);
  const [members, setMembers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'expenses', expenseId)).then(snap => {
      if (!snap.exists()) { navigate('/'); return; }
      const d = snap.data();
      setSessionId(d.sessionId);
      setAmount(String(d.amount).replace('.', ','));
      setDescription(d.description || '');
      setCategory(d.category || 'alimentari');
      setDateISO(toISO(d.date));
      setPaidBy(d.paidBy || user.uid);
      setSplitAmong(d.splitAmong || []);
      setLoadingExpense(false);
    }).catch(() => navigate('/'));
  }, [expenseId]);

  useEffect(() => {
    if (!sessionId) return;
    getDoc(doc(db, 'sessions', sessionId)).then(snap => {
      if (snap.exists()) setMembers(snap.data().members || {});
    });
  }, [sessionId]);

  function toggleSplit(uid) {
    setSplitAmong(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]
    );
  }

  function handleAmountChange(e) {
    setAmount(e.target.value.replace(/[^0-9.,]/g, ''));
  }

  async function handleSave() {
    setError('');
    const amtNum = parseFloat(amount.replace(',', '.'));
    if (!amtNum || amtNum <= 0) { setError('Inserisci un importo valido.'); return; }
    if (splitAmong.length === 0) { setError('Seleziona almeno una persona.'); return; }

    const [year, month, day] = dateISO.split('-').map(Number);
    const expenseDate = Timestamp.fromDate(new Date(year, month - 1, day, 12, 0, 0));

    setSaving(true);
    try {
      const paidByName = members[paidBy]?.name || userProfile?.name || 'Sconosciuto';
      await updateDoc(doc(db, 'expenses', expenseId), {
        description: description.trim() || CATEGORIES[category]?.label || 'Spesa',
        amount: amtNum,
        category,
        paidBy,
        paidByName,
        splitAmong,
        date: expenseDate,
      });
      navigate(`/group/${sessionId}`);
    } catch (e) {
      setError('Errore: ' + (e?.message || 'Riprova.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
      navigate(`/group/${sessionId}`);
    } catch (e) {
      setError('Errore eliminazione: ' + (e?.message || 'Riprova.'));
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loadingExpense) return <Spinner fullPage />;

  const amtNum = parseFloat(amount.replace(',', '.'));
  const perPerson = amtNum > 0 && splitAmong.length > 1
    ? (amtNum / splitAmong.length).toFixed(2)
    : null;

  return (
    <div className="screen-no-nav" style={{ paddingBottom: '2rem' }}>
      <div className="amount-hero">
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '0.75rem',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}>
          <button className="header-back" onClick={() => navigate(`/group/${sessionId}`)}>
            <BackIcon />
          </button>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Modifica spesa</span>
        </div>

        <div className="amount-display">
          <span className="amount-prefix">€</span>
          <input
            className="amount-input"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={handleAmountChange}
            autoFocus
          />
        </div>

        {perPerson && (
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            €{perPerson} a persona · {splitAmong.length} persone
          </div>
        )}
      </div>

      <div className="add-form">
        {error && <div className="error-msg">{error}</div>}

        <div className="form-card">
          <div className="form-row" style={{ borderTop: 'none' }}>
            <span className="form-row-label">Descrizione</span>
            <input
              type="text"
              placeholder="es. Cena al ristorante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <span className="form-row-label">Data</span>
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              style={{ textAlign: 'right', colorScheme: 'light' }}
            />
          </div>

          <div className="form-row">
            <span className="form-row-label">Ha pagato</span>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {Object.entries(members).map(([uid, m]) => (
                <option key={uid} value={uid}>{m.name}{uid === user.uid ? ' (tu)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-card">
          <div style={{ padding: '0.75rem 1rem 0', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Categoria
          </div>
          <div className="cat-grid cat-grid-3">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div
                key={key}
                className={`cat-grid-item ${category === key ? 'selected' : ''}`}
                onClick={() => setCategory(key)}
              >
                <CategoryIcon category={key} size={44} />
                <div className="cat-grid-item-label">{cat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {Object.keys(members).length > 0 && (
          <div className="form-card">
            <div style={{ padding: '0.75rem 1rem 0', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Dividi tra
            </div>
            <div className="split-list">
              {Object.entries(members).map(([uid, member]) => {
                const checked = splitAmong.includes(uid);
                return (
                  <div key={uid} className="split-row" onClick={() => toggleSplit(uid)}>
                    <span style={{ fontWeight: 500 }}>
                      {member.name}{uid === user.uid ? ' (tu)' : ''}
                    </span>
                    <div className={`checkbox ${checked ? 'checked' : ''}`}>
                      {checked && <CheckIcon />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: '0.25rem' }}
        >
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>

        <button
          className="btn-secondary"
          onClick={() => setShowDeleteModal(true)}
          style={{ marginTop: '0.5rem', color: 'var(--red)', borderColor: 'var(--red)' }}
        >
          Elimina spesa
        </button>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Elimina spesa"
          message={`Vuoi eliminare "${description || 'questa spesa'}"? L'azione è irreversibile.`}
          confirmLabel="Elimina"
          confirmColor="var(--red)"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}

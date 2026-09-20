import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot, doc, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import CategoryIcon from '../components/CategoryIcon';
import Spinner from '../components/Spinner';
import { formatEur, toDate } from '../utils/categories';
import { getUserBalance } from '../utils/debtCalculator';

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function HomeScreen() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [expensesBySession, setExpensesBySession] = useState({});
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const profileMenuRef = useRef(null);

  const displayName = userProfile?.name || user?.displayName || 'Utente';

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
        setEditingName(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSaveName() {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === displayName) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: trimmed });
      setEditingName(false);
      setShowProfileMenu(false);
    } catch (e) {
      console.error('Errore salvataggio nome:', e);
    } finally {
      setSavingName(false);
    }
  }

  // Listen to sessions where user is a member
  useEffect(() => {
    const q = query(
      collection(db, 'sessions'),
      where(`members.${user.uid}.joinedAt`, '!=', null)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(list);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user.uid]);

  // Load expenses for each session to compute balance
  useEffect(() => {
    if (sessions.length === 0) return;
    const unsubs = sessions.map(session => {
      const q = query(
        collection(db, 'expenses'),
        where('sessionId', '==', session.id)
      );
      return onSnapshot(q, (snap) => {
        const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setExpensesBySession(prev => ({ ...prev, [session.id]: expenses }));
      });
    });
    return () => unsubs.forEach(u => u());
  }, [sessions]);

  // Calculate global receive/pay totals (exclude future expenses)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const { toReceive, toPay } = Object.entries(expensesBySession).reduce(
    (acc, [sessionId, expenses]) => {
      const active = expenses.filter(e => toDate(e.date) <= todayEnd);
      const balance = getUserBalance(active, user.uid);
      if (balance > 0) acc.toReceive += balance;
      else acc.toPay += Math.abs(balance);
      return acc;
    },
    { toReceive: 0, toPay: 0 }
  );

  if (loading) return <Spinner fullPage />;

  return (
    <div className="screen">
      {/* Header */}
      <header className="header">
        <div className="header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg viewBox="0 0 44 44" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
              {/* Rete di condivisione: 3 nodi collegati */}
              <line x1="22" y1="7" x2="6"  y2="37" stroke="white" strokeWidth="2"   strokeLinecap="round" strokeOpacity="0.55"/>
              <line x1="22" y1="7" x2="38" y2="37" stroke="white" strokeWidth="2"   strokeLinecap="round" strokeOpacity="0.55"/>
              <line x1="6"  y1="37" x2="38" y2="37" stroke="white" strokeWidth="2"  strokeLinecap="round" strokeOpacity="0.55"/>
              <circle cx="22" cy="7"  r="5" fill="white"/>
              <circle cx="6"  cy="37" r="5" fill="white"/>
              <circle cx="38" cy="37" r="5" fill="white"/>
              {/* € al centro del triangolo */}
              <text x="22" y="31" textAnchor="middle" fontSize="14" fontWeight="900" fill="white" fontFamily="system-ui,sans-serif">€</text>
            </svg>
          </div>
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button
              onClick={() => { setShowProfileMenu(v => !v); setEditingName(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="avatar">{initials(displayName)}</div>
            </button>

            {showProfileMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'var(--bg)', borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                minWidth: '200px', zIndex: 100, overflow: 'hidden',
                border: '1px solid var(--border)',
              }}>
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{displayName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{user.email}</div>
                </div>

                {!editingName ? (
                  <button
                    onClick={() => { setEditingName(true); setNewName(displayName); }}
                    style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Modifica nome
                  </button>
                ) : (
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1.5px solid var(--primary)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        style={{ flex: 1, padding: '0.4rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        {savingName ? '...' : 'Salva'}
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        style={{ flex: 1, padding: '0.4rem', background: 'var(--bg-secondary)', color: 'var(--text)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={logout}
                  style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Esci
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Metric cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">Da ricevere</div>
          <div className="metric-value green">{formatEur(toReceive)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Da pagare</div>
          <div className="metric-value red">{formatEur(toPay)}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.75rem 1rem 0.5rem' }}>
        <button
          className="new-session-btn"
          style={{ margin: 0, flex: 1 }}
          onClick={() => navigate('/nuova-sessione')}
        >
          + Nuova sessione
        </button>
        <button
          className="new-session-btn"
          style={{ margin: 0, flex: 1 }}
          onClick={() => navigate('/unisciti')}
        >
          🔑 Unisciti
        </button>
      </div>

      {/* Session list */}
      <div className="section-title">Le tue sessioni</div>

      <div className="session-list" style={{ paddingBottom: '5rem' }}>
        {sessions.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-text">
              Non sei in nessuna sessione.<br />Creane una o unisciti con un codice!
            </div>
          </div>
        )}

        {sessions.map(session => {
          const expenses = expensesBySession[session.id] || [];
          const balance = getUserBalance(expenses, user.uid);
          const memberCount = Object.keys(session.members || {}).length;

          return (
            <div
              key={session.id}
              className="session-item"
              onClick={() => navigate(`/group/${session.id}`)}
            >
              <CategoryIcon category={session.icon || 'other'} size={44} />
              <div className="session-info">
                <div className="session-name">{session.name}</div>
                <div className="session-meta">
                  {memberCount} {memberCount === 1 ? 'membro' : 'membri'} · {expenses.length} {expenses.length === 1 ? 'spesa' : 'spese'}
                </div>
              </div>
              <div
                className="session-balance"
                style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}
              >
                {balance >= 0 ? '+' : ''}{formatEur(balance)}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}

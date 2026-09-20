import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, addDoc, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import CategoryIcon from '../components/CategoryIcon';
import Spinner from '../components/Spinner';
import { CATEGORIES, formatEur, formatShortDate, toDate } from '../utils/categories';
import ConfirmModal from '../components/ConfirmModal';
import { calculateDebts, getUserBalance, getCategoryBreakdown } from '../utils/debtCalculator';

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

const ChevronDown = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function groupByDate(expenses) {
  const groups = {};
  expenses.forEach(e => {
    const d = toDate(e.date);
    const key = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[key]) groups[key] = { date: d, items: [] };
    groups[key].items.push(e);
  });
  return Object.entries(groups).sort((a, b) => b[1].date - a[1].date);
}

export default function GroupDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [tab, setTab] = useState('riepilogo');
  const [loading, setLoading] = useState(true);

  // Storico state
  const [storicoView, setStoricoView] = useState('categoria');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [expandedCats, setExpandedCats] = useState({});
  const [showMemberBreakdown, setShowMemberBreakdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sessions', id), (snap) => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [id]);

  useEffect(() => {
    // No orderBy to avoid requiring composite index — sort client-side
    const q = query(collection(db, 'expenses'), where('sessionId', '==', id));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort descending by date client-side
      list.sort((a, b) => toDate(b.date) - toDate(a.date));
      setExpenses(list);
    }, (err) => console.error('Expenses query error:', err));
    return unsub;
  }, [id]);

  if (loading || !session) return <Spinner fullPage />;

  const members = session.members || {};
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const activeExpenses = expenses.filter(e => toDate(e.date) <= todayEnd);
  const { balances, debts } = calculateDebts(activeExpenses, members);
  const myBalance = getUserBalance(activeExpenses, user.uid);
  const { breakdown, total } = getCategoryBreakdown(activeExpenses);

  const myQuota = activeExpenses.reduce((acc, e) => {
    if ((e.splitAmong || []).includes(user.uid))
      acc += e.amount / (e.splitAmong?.length || 1);
    return acc;
  }, 0);

  // Anni disponibili per il filtro
  const availableYears = [...new Set(expenses.map(e => toDate(e.date).getFullYear()))].sort((a, b) => b - a);

  // Filtra spese per storico
  const filteredExpenses = expenses.filter(e => {
    const d = toDate(e.date);
    if (filterYear && d.getFullYear() !== Number(filterYear)) return false;
    if (filterMonth !== '' && d.getMonth() !== Number(filterMonth)) return false;
    if (filterPerson && e.paidBy !== filterPerson) return false;
    return true;
  });

  async function handleDeleteSession() {
    setDeleting(true);
    setDeleteError('');
    try {
      const expSnap = await getDocs(query(collection(db, 'expenses'), where('sessionId', '==', id)));
      await Promise.all(expSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'sessions', id));
      navigate('/');
    } catch (e) {
      console.error('Errore eliminazione sessione:', e);
      setDeleteError('Errore: ' + (e?.message || 'permesso negato. Aggiorna le regole Firestore.'));
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  function toggleCat(cat) {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <div className="screen">
      {/* Header */}
      <header style={{ background: 'var(--primary)', color: '#fff' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)'
        }}>
          <button className="header-back" onClick={() => navigate('/')}>
            <BackIcon />
          </button>
          <div style={{ flex: 1 }}>
            <div className="header-title">{session.name}</div>
          </div>
          {session.createdBy === user.uid && (
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '0.25rem', cursor: 'pointer' }}
              title="Elimina sessione"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>

        {showDeleteModal && (
          <ConfirmModal
            title="Elimina sessione"
            message={`Vuoi eliminare "${session.name}"? Verranno cancellate tutte le spese. Questa azione è irreversibile.`}
            confirmLabel="Elimina"
            confirmColor="var(--red)"
            onConfirm={handleDeleteSession}
            onCancel={() => setShowDeleteModal(false)}
            loading={deleting}
          />
        )}

        <div
          className="group-header-big"
          style={{ paddingTop: 0, cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setShowMemberBreakdown(v => !v)}
        >
          {!showMemberBreakdown ? (
            <>
              <div className="group-header-amount">{formatEur(total)}</div>
              <div className="group-header-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                Totale speso
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{ opacity: 0.7 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                Speso per membro
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{ opacity: 0.7 }}>
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </div>
              <div style={{ width: '100%', padding: '0 1rem', maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {Object.entries(members).map(([uid, member]) => {
                  const spent = activeExpenses.filter(e => e.paidBy === uid).reduce((s, e) => s + e.amount, 0);
                  return (
                    <div key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '0.15rem 0' }}>
                      <span style={{ opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{uid === user.uid ? 'Tu' : member.name}</span>
                      <span style={{ fontWeight: 700, flexShrink: 0 }}>{formatEur(spent)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="tabs">
          {['riepilogo', 'storico', 'debiti'].map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {deleteError && (
        <div className="error-msg" style={{ margin: '0.75rem 1rem 0' }}>{deleteError}</div>
      )}

      {/* ── Tab: Riepilogo ── */}
      {tab === 'riepilogo' && (
        <div style={{ paddingBottom: '6rem' }}>
          {/* FAB aggiungi spesa */}
          <button
            className="add-expense-fab"
            onClick={() => navigate('/add', { state: { sessionId: id } })}
            title="Aggiungi spesa"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="24" height="24">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {total > 0 && (
            <>
              <div style={{ padding: '1rem 1rem 0' }}>
                <div className="cat-bar">
                  {Object.entries(breakdown).map(([cat, amount]) => (
                    <div key={cat} className="cat-bar-segment"
                      style={{ width: `${(amount / total) * 100}%`, background: CATEGORIES[cat]?.color || '#888' }} />
                  ))}
                </div>
              </div>
              <div className="cat-scroll">
                {Object.entries(breakdown).map(([cat, amount]) => (
                  <div key={cat} className="cat-chip">
                    <CategoryIcon category={cat} size={40} />
                    <div className="cat-chip-label">{CATEGORIES[cat]?.label || cat}</div>
                    <div className="cat-chip-amount">{formatEur(amount)}</div>
                    <div className="cat-chip-label">{Math.round((amount / total) * 100)}%</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="metrics-row" style={{ justifyContent: 'center' }}>
            <div className="metric-card" style={{ flex: '0 0 auto', minWidth: '140px' }}>
              <div className="metric-label">Il tuo saldo</div>
              <div className={`metric-value ${myBalance >= 0 ? 'green' : 'red'}`}>
                {myBalance >= 0 ? '+' : ''}{formatEur(myBalance)}
              </div>
            </div>
          </div>

          <div className="section-title">Partecipanti</div>
          <div className="card" style={{ margin: '0 1rem' }}>
            {Object.entries(members).map(([uid, member]) => {
              const bal = balances[uid] ?? 0;
              return (
                <div key={uid} className="participant-row">
                  <div className="participant-name">
                    {member.name}{uid === user.uid ? ' (tu)' : ''}
                  </div>
                  <span className={`balance-pill ${bal > 0.01 ? 'green' : bal < -0.01 ? 'red' : 'neutral'}`}>
                    {bal >= 0 ? '+' : ''}{formatEur(bal)}
                  </span>
                </div>
              );
            })}
          </div>

          {session.joinCode && <JoinCodeRow code={session.joinCode} />}

        </div>
      )}

      {/* ── Tab: Storico ── */}
      {tab === 'storico' && (
        <div style={{ paddingBottom: '6rem' }}>
          {/* Toggle vista */}
          <div style={{ padding: '0.75rem 1rem 0' }}>
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid var(--primary)' }}>
              {[['categoria', 'Per categoria'], ['cronologico', 'Cronologico']].map(([v, label]) => (
                <button key={v} onClick={() => setStoricoView(v)} style={{
                  flex: 1, padding: '0.45rem 0', fontSize: '0.8rem', fontWeight: 600,
                  background: storicoView === v ? 'var(--primary)' : 'transparent',
                  color: storicoView === v ? '#fff' : 'var(--primary)',
                  border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Filtri */}
          <div style={{ padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Mese</div>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: '#fff', color: 'var(--text)' }}>
                <option value="">Tutti</option>
                {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Anno</div>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: '#fff', color: 'var(--text)' }}>
                <option value="">Tutti</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Pagato da</div>
              <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', background: '#fff', color: 'var(--text)' }}>
                <option value="">Tutti</option>
                {Object.entries(members).map(([uid, m]) => (
                  <option key={uid} value={uid}>{uid === user.uid ? 'Tu' : m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredExpenses.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">Nessuna spesa nel periodo selezionato.</div>
            </div>
          )}

          {/* Vista per categoria */}
          {storicoView === 'categoria' && filteredExpenses.length > 0 && (
            <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(CATEGORIES)
                .map(([catKey, catDef]) => {
                  const catExpenses = filteredExpenses.filter(e => (e.category || 'altro') === catKey);
                  if (catExpenses.length === 0) return null;
                  const catTotal = catExpenses.reduce((s, e) => s + e.amount, 0);
                  const isOpen = expandedCats[catKey];
                  return (
                    <div key={catKey} className="card">
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', cursor: 'pointer' }}
                        onClick={() => toggleCat(catKey)}
                      >
                        <CategoryIcon category={catKey} size={40} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{catDef.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {catExpenses.length} {catExpenses.length === 1 ? 'spesa' : 'spese'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginRight: '0.5rem' }}>
                          {formatEur(catTotal)}
                        </div>
                        <ChevronDown open={isOpen} />
                      </div>

                      {isOpen && catExpenses.map(expense => {
                        const iPaid = expense.paidBy === user.uid;
                        const iSplit = (expense.splitAmong || []).includes(user.uid);
                        const myShare = iSplit ? expense.amount / (expense.splitAmong?.length || 1) : 0;
                        const isFuture = toDate(expense.date) > todayEnd;
                        return (
                          <div
                            key={expense.id}
                            className="expense-row"
                            style={{ paddingLeft: '1.5rem', cursor: 'pointer', opacity: isFuture ? 0.5 : 1 }}
                            onClick={() => navigate(`/expense/${expense.id}/edit`)}
                          >
                            <div className="expense-info">
                              <div className="expense-desc" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {expense.description || '—'}
                                {isFuture && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                  </svg>
                                )}
                              </div>
                              <div className="expense-meta">
                                {expense.paidByName} · {formatShortDate(expense.date)}
                              </div>
                            </div>
                            <div className="expense-amounts">
                              <div className="expense-total">{formatEur(expense.amount)}</div>
                              {iSplit && (
                                <div className={`expense-share ${iPaid ? 'green' : 'red'}`}>
                                  {iPaid ? 'Hai pagato' : `−${formatEur(myShare)}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
                .filter(Boolean)
              }
            </div>
          )}

          {/* Vista cronologica */}
          {storicoView === 'cronologico' && filteredExpenses.length > 0 && (
            <div>
              {groupByDate(filteredExpenses).map(([dateStr, group]) => {
                const dayTotal = group.items.reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={dateStr}>
                    <div className="day-header">
                      <div className="day-header-date" style={{ textTransform: 'capitalize' }}>{dateStr}</div>
                      <div className="day-header-total">{formatEur(dayTotal)}</div>
                    </div>
                    <div className="card" style={{ margin: '0 1rem 0.75rem' }}>
                      {group.items.map(expense => {
                        const iPaid = expense.paidBy === user.uid;
                        const iSplit = (expense.splitAmong || []).includes(user.uid);
                        const myShare = iSplit ? expense.amount / (expense.splitAmong?.length || 1) : 0;
                        const splitCount = expense.splitAmong?.length || 1;
                        const isFuture = toDate(expense.date) > todayEnd;
                        return (
                          <div
                            key={expense.id}
                            className="expense-row"
                            style={{ cursor: 'pointer', opacity: isFuture ? 0.5 : 1 }}
                            onClick={() => navigate(`/expense/${expense.id}/edit`)}
                          >
                            <CategoryIcon category={expense.category || 'altro'} size={40} />
                            <div className="expense-info">
                              <div className="expense-desc" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {expense.description || '—'}
                                {isFuture && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                  </svg>
                                )}
                              </div>
                              <div className="expense-meta">
                                {expense.paidByName || 'Sconosciuto'} · ÷{splitCount}
                              </div>
                            </div>
                            <div className="expense-amounts">
                              <div className="expense-total">{formatEur(expense.amount)}</div>
                              {iSplit && (
                                <div className={`expense-share ${iPaid ? 'green' : 'red'}`}>
                                  {iPaid ? 'Hai pagato' : `−${formatEur(myShare)}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ── Tab: Debiti ── */}
      {tab === 'debiti' && (
        <div style={{ paddingBottom: '6rem' }}>
          {debts.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-text">Nessun debito! Tutti in pari.</div>
            </div>
          )}

          {debts.filter(d => d.to === user.uid).length > 0 && (
            <>
              <div className="debt-section-title green">Ti devono</div>
              <div className="card" style={{ margin: '0 1rem 0.75rem' }}>
                {debts.filter(d => d.to === user.uid).map((debt, i) => (
                  <DebtRow key={i} debt={debt} isReceiving={true} sessionId={id} />
                ))}
              </div>
            </>
          )}

          {debts.filter(d => d.from === user.uid).length > 0 && (
            <>
              <div className="debt-section-title red">Devi pagare</div>
              <div className="card" style={{ margin: '0 1rem 0.75rem' }}>
                {debts.filter(d => d.from === user.uid).map((debt, i) => (
                  <DebtRow key={i} debt={debt} isReceiving={false} sessionId={id} />
                ))}
              </div>
            </>
          )}

          {debts.filter(d => d.from !== user.uid && d.to !== user.uid).length > 0 && (
            <>
              <div className="section-title">Tra gli altri</div>
              <div className="card" style={{ margin: '0 1rem 0.75rem' }}>
                {debts.filter(d => d.from !== user.uid && d.to !== user.uid).map((debt, i) => (
                  <DebtRow key={i} debt={debt} isReceiving={null} sessionId={id} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function JoinCodeRow({ code }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ margin: '0.75rem 1rem 0' }}>
      <div className="card" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Codice invito</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '4px', color: 'var(--primary)' }}>{code}</div>
        </div>
        <button
          onClick={handleCopy}
          style={{ background: copied ? 'var(--green)' : 'var(--bg-secondary)', border: 'none', borderRadius: '8px', padding: '0.5rem 0.875rem', fontWeight: 600, fontSize: '0.8rem', color: copied ? '#fff' : 'var(--text)', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', flexShrink: 0 }}
        >
          {copied ? '✓ Copiato' : 'Copia'}
        </button>
      </div>
    </div>
  );
}

function DebtRow({ debt, isReceiving, sessionId }) {
  const [showModal, setShowModal] = useState(false);
  const [settling, setSettling] = useState(false);

  async function handleSettle() {
    setSettling(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        sessionId,
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
        </div>
        <div className={`debt-amount ${isReceiving === true ? 'green' : isReceiving === false ? 'red' : ''}`}>
          {formatEur(debt.amount)}
        </div>
        {isReceiving !== null && (
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
        )}
      </div>

      {showModal && (
        <ConfirmModal
          title="Conferma pagamento"
          message={`${debt.fromName} ha pagato ${formatEur(debt.amount)} a ${debt.toName}?`}
          confirmLabel="Sì, saldato"
          onConfirm={handleSettle}
          onCancel={() => setShowModal(false)}
          loading={settling}
        />
      )}
    </>
  );
}

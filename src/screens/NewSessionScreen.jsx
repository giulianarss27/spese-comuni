import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import CategoryIcon from '../components/CategoryIcon';
import { SESSION_ICONS, generateJoinCode } from '../utils/categories';

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export default function NewSessionScreen() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('appartamento');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState(null);
  const [createdId, setCreatedId] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setError('');
    if (!name.trim()) { setError('Inserisci un nome per la sessione.'); return; }
    setSaving(true);

    const joinCode = generateJoinCode();
    const memberName = userProfile?.name || user.displayName || user.email;

    try {
      const ref = await addDoc(collection(db, 'sessions'), {
        name: name.trim(),
        description: description.trim(),
        icon,
        createdBy: user.uid,
        joinCode,
        members: {
          [user.uid]: {
            name: memberName,
            joinedAt: Timestamp.now()
          }
        },
        createdAt: serverTimestamp()
      });
      setCreatedCode(joinCode);
      setCreatedId(ref.id);
    } catch (e) {
      console.error('Errore creazione sessione:', e);
      setError('Errore: ' + (e?.message || 'Riprova.'));
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Show success state with join code
  if (createdCode) {
    return (
      <div className="screen-no-nav">
        <header className="header">
          <div className="header-row">
            <button className="header-back" onClick={() => navigate('/')}>
              <BackIcon />
            </button>
            <div className="header-title">Sessione creata!</div>
            <div />
          </div>
        </header>

        <div style={{ padding: '1rem' }}>
          <div className="join-code-box">
            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Codice di accesso</div>
            <div className="join-code">{createdCode}</div>
            <div className="join-code-hint">
              Condividi questo codice con i tuoi amici<br />per invitarli nella sessione.
            </div>
          </div>

          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={handleCopy}
          >
            <CopyIcon />
            {copied ? 'Copiato!' : 'Copia codice'}
          </button>

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            onClick={() => navigate(`/group/${createdId}`)}
          >
            Vai alla sessione
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-no-nav" style={{ paddingBottom: '2rem' }}>
      <header className="header">
        <div className="header-row">
          <button className="header-back" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <div className="header-title">Nuova sessione</div>
          <div />
        </div>
      </header>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-card">
          <div className="form-row" style={{ borderTop: 'none' }}>
            <span className="form-row-label">Nome</span>
            <input
              type="text"
              placeholder="es. Vacanza Sicilia 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-row">
            <span className="form-row-label">Descrizione</span>
            <input
              type="text"
              placeholder="Opzionale"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="form-card">
          <div style={{ padding: '0.75rem 1rem 0', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Icona sessione
          </div>
          <div className="icon-picker">
            {SESSION_ICONS.map(key => (
              <div
                key={key}
                className={`icon-picker-item ${icon === key ? 'selected' : ''}`}
                onClick={() => setIcon(key)}
              >
                <CategoryIcon category={key} size={28} noBg />
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? 'Creazione…' : 'Crea sessione'}
        </button>
      </div>
    </div>
  );
}

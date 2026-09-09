import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, doc, updateDoc, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function JoinSessionScreen() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    setError('');
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Il codice deve essere di 6 caratteri.');
      return;
    }
    setLoading(true);

    try {
      const q = query(collection(db, 'sessions'), where('joinCode', '==', trimmed));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Codice non trovato. Controlla e riprova.');
        setLoading(false);
        return;
      }

      const sessionDoc = snap.docs[0];
      const memberName = userProfile?.name || user.displayName || user.email;

      await updateDoc(doc(db, 'sessions', sessionDoc.id), {
        [`members.${user.uid}`]: {
          name: memberName,
          joinedAt: Timestamp.now()
        }
      });

      navigate(`/group/${sessionDoc.id}`);
    } catch (e) {
      console.error('Join error:', e);
      setError('Errore durante l\'accesso: ' + (e?.message || 'Riprova.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen-no-nav">
      <header className="header">
        <div className="header-row">
          <button className="header-back" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <div className="header-title">Unisciti a una sessione</div>
          <div />
        </div>
      </header>

      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Inserisci il codice di 6 caratteri che ti ha condiviso un amico per unirti alla sua sessione di spese.
        </p>

        {error && <div className="error-msg">{error}</div>}

        <div className="input-group">
          <label className="input-label">Codice sessione</label>
          <input
            className="input-field"
            type="text"
            placeholder="es. AB3X7K"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{
              fontSize: '1.5rem',
              letterSpacing: '6px',
              textAlign: 'center',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}
            autoFocus
            autoCapitalize="characters"
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleJoin}
          disabled={loading || code.trim().length !== 6}
        >
          {loading ? 'Accesso in corso…' : 'Unisciti'}
        </button>

        <button className="btn-link" onClick={() => navigate('/')}>
          Annulla
        </button>
      </div>
    </div>
  );
}

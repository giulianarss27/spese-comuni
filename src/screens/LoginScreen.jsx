import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const LogoIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" width="40" height="40">
    <rect x="4" y="4" width="32" height="32" rx="8" fill="rgba(255,255,255,0.2)" />
    <path d="M12 28V16l8-4 8 4v12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="16" y="20" width="8" height="8" rx="1" stroke="#fff" strokeWidth="2" />
  </svg>
);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleResetPassword() {
    if (!email.trim()) { setError('Inserisci la tua email per recuperare la password.'); return; }
    setResetLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError('Errore: controlla che l\'email sia corretta.');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(mapError(err.code));
    } finally {
      setLoading(false);
    }
  }

  function mapError(code) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email o password non corretti.';
      case 'auth/too-many-requests':
        return 'Troppi tentativi. Riprova più tardi.';
      default:
        return 'Errore di accesso. Controlla i dati e riprova.';
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-logo">
        <LogoIcon />
      </div>
      <h1 className="auth-title">Spese Comuni</h1>
      <p className="auth-sub">Accedi al tuo account</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="input-group">
          <label className="input-label">Email</label>
          <input
            className="input-field"
            type="email"
            placeholder="nome@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Password</label>
          <input
            className="input-field"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Accesso in corso…' : 'Accedi'}
        </button>

        {resetSent ? (
          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--green)', marginTop: '0.25rem' }}>
            Email inviata! Controlla la casella di posta.
          </div>
        ) : (
          <button
            type="button"
            className="btn-link"
            style={{ fontSize: '0.8rem', opacity: 0.7 }}
            onClick={handleResetPassword}
            disabled={resetLoading}
          >
            {resetLoading ? 'Invio in corso…' : 'Password dimenticata?'}
          </button>
        )}

        <button
          type="button"
          className="btn-link"
          onClick={() => navigate('/register')}
        >
          Non hai un account? Registrati
        </button>
      </form>
    </div>
  );
}

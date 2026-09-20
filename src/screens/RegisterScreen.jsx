import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Le password non coincidono.');
      return;
    }
    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email, password);
      navigate('/');
    } catch (err) {
      setError(mapError(err.code));
    } finally {
      setLoading(false);
    }
  }

  function mapError(code) {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Email già registrata. Prova ad accedere.';
      case 'auth/weak-password':
        return 'Password troppo debole. Usa almeno 6 caratteri.';
      case 'auth/invalid-email':
        return 'Indirizzo email non valido.';
      default:
        return 'Errore durante la registrazione. Riprova.';
    }
  }

  return (
    <div className="auth-screen">
      <h1 className="auth-title">Crea account</h1>
      <p className="auth-sub">Registrati per iniziare</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="input-group">
          <label className="input-label">Nome</label>
          <input
            className="input-field"
            type="text"
            placeholder="Mario Rossi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

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
            placeholder="Minimo 6 caratteri"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Conferma password</label>
          <input
            className="input-field"
            type="password"
            placeholder="Ripeti la password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Registrazione…' : 'Crea account'}
        </button>

        <button
          type="button"
          className="btn-link"
          onClick={() => navigate('/login')}
        >
          Hai già un account? Accedi
        </button>
      </form>
    </div>
  );
}

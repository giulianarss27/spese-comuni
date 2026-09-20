import { useNavigate, useLocation } from 'react-router-dom';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const DebtIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Dentro una sessione il + centrale non serve (c'è il FAB nel riepilogo)
  const inSession = path.startsWith('/group/');

  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${path === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <HomeIcon />
        <span>Sessioni</span>
      </button>

      {!inSession && (
        <button className="bottom-nav-add" onClick={() => navigate('/add')}>
          <PlusIcon />
        </button>
      )}

      <button
        className={`bottom-nav-item ${path === '/debiti' ? 'active' : ''}`}
        onClick={() => navigate('/debiti')}
      >
        <DebtIcon />
        <span>Debiti</span>
      </button>
    </nav>
  );
}

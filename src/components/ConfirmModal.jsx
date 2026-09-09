export default function ConfirmModal({ title, message, confirmLabel = 'Conferma', confirmColor, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onCancel}>
      <div
        style={{
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: '1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          width: '100%', maxWidth: 480,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0', margin: '0 auto 1.25rem' }} />
        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem' }}>{title}</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>
            Annulla
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, background: confirmColor || 'var(--green)', opacity: loading ? 0.6 : 1 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

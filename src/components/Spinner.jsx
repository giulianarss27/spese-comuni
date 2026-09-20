export default function Spinner({ fullPage = false }) {
  if (fullPage) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F2F2F7'
      }}>
        <div className="spinner" />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div className="spinner" />
    </div>
  );
}

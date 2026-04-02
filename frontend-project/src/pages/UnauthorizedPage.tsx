export default function UnauthorizedPage() {
  return (
    <div style={{
      padding: 50,
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f7fa'
    }}>
      <div style={{
        background: '#fff',
        padding: 50,
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#ff4d4f', fontSize: 48, margin: '0 0 20px 0' }}>403</h1>
        <h2 style={{ color: '#333', margin: '0 0 10px 0' }}>Không có quyền truy cập</h2>
        <p style={{ color: '#666', margin: '0 0 30px 0' }}>
          Bạn không có quyền truy cập trang này.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#18b8f2',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: 'bold'
          }}
        >
          Về trang chủ
        </a>
      </div>
    </div>
  );
}

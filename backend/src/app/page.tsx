export default function HomePage() {
    return (
        <main style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                🚀 BreviAI API
            </h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '2rem' }}>
                AI-powered Android shortcut generation backend
            </p>

            <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px'
            }}>
                <h2 style={{ marginBottom: '1rem' }}>📡 API Endpoints</h2>
                <ul style={{ listStyle: 'none', textAlign: 'left' }}>
                    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <code>POST /api/generate</code> - Generate shortcut from prompt
                    </li>
                    <li style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <code>GET /api/templates</code> - List available templates
                    </li>
                    <li style={{ padding: '0.5rem 0' }}>
                        <code>POST /api/feedback</code> - Submit feedback
                    </li>
                </ul>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <a href="/admin" style={{
                    padding: '0.75rem 1.5rem',
                    background: '#4f46e5',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 600
                }}>
                    Go to Admin Panel
                </a>
            </div>

            <p style={{ marginTop: '2rem', opacity: 0.5, fontSize: '0.9rem' }}>
                © 2026 BreviAI - Akıllı Kestirmeler
            </p>
        </main>
    );
}

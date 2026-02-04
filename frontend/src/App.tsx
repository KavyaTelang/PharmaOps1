import { useState } from 'react';
import { useAppContext } from './context/AppContext';
import { api } from './services/api';

// Import your dashboards
import AdminDashboard from './dashboards/AdminDashboard';
import VendorDashboard from './dashboards/VendorDashboard';
import QADashboard from './dashboards/QADashboard';
import AuditorDashboard from './dashboards/AuditorDashboard';

function App() {
  const { user, setUser } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const data = await api.login(email, password);
      setUser(data.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  // Login screen
  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
        <h1>PharmaOps Login</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              required
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px' }}>
            Login
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>

        <div style={{ marginTop: '20px', fontSize: '12px' }}>
          <p><strong>Test Accounts:</strong></p>
          <ul>
            <li>Admin: admin@pharmacorp.com / admin123</li>
            <li>QA: qa@pharmacorp.com / qa123</li>
            <li>Vendor: vendor@fastlogistics.com / vendor123</li>
            <li>Auditor: auditor@pharmacorp.com / auditor123</li>
          </ul>
        </div>
      </div>
    );
  }

  // Show dashboard based on role
  return (
    <div>
      <div style={{ padding: '10px', background: '#333', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
        <span>Logged in as: {user.name} ({user.role})</span>
        <button onClick={handleLogout} style={{ padding: '5px 15px' }}>Logout</button>
      </div>

      {user.role === 'ADMIN' && <AdminDashboard />}
      {user.role === 'VENDOR' && <VendorDashboard />}
      {user.role === 'QA' && <QADashboard />}
      {user.role === 'AUDITOR' && <AuditorDashboard />}
    </div>
  );
}

export default App;
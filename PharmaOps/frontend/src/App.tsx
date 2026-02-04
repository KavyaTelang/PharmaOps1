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
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          #root {
            width: 100%;
            height: 100%;
          }
          
          .login-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            /* CHANGE THESE COLORS TO CUSTOMIZE BACKGROUND */
            background: transparent;
            position: relative;
            overflow: hidden;
          }
          
          .login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            /* Make sure map.png is in your /public folder */
            background-image: url('/map.jpg'); 
            background-size: cover;
            background-position: center;
            opacity: 0.25; /* Very subtle */
            z-index: -1;
            pointer-events: none;
          }
          
          .login-container::after {
            content: '';
            position: absolute;
            bottom: -50%;
            left: -50%;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%);
            animation: float 25s ease-in-out infinite reverse;
          }
          
          @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(-20px, 20px) rotate(180deg); }
          }
          
          .login-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 480px;
            padding: 1.5rem;
          }
          
          .login-brand {
            text-align: center;
            margin-bottom: 1.75rem;
            color: white;
          }
          
          .brand-logo {
            margin: 0 auto 1rem auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .brand-logo img {
            width: 500px;
            height: auto;
            object-fit: contain;
            
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
            animation: slideDown 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          
          .brand-logo-emoji {
            font-size: 3.5rem;
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
          }
          
          .login-brand h1 {
            font-size: 2rem;
            font-weight: 800;
            margin: 0 0 0.25rem 0;
            letter-spacing: -0.02em;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .login-brand p {
            font-size: 0.95rem;
            margin: 0;
            opacity: 0.95;
            font-weight: 300;
          }
          
          .login-card {
            background: rgba(248, 249, 250, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            padding: 2.5rem;
            width: 100%;
            animation: cardSlide 0.6s ease-out;
          }
          
          @keyframes cardSlide {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .login-card-header {
            text-align: center;
            margin-bottom: 1.75rem;
          }
          
          .login-card-header h2 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #1e293b;
          }
          
          .login-card-header p {
            margin: 0;
            color: #64748b;
            font-size: 0.9rem;
          }
          
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 1.1rem;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
          }
          
          .form-group label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #334155;
          }
          
          .form-input {
            padding: 0.8rem 0.9rem;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 0.9rem;
            font-family: inherit;
            transition: all 0.2s;
            background: #f8fafc;
            color: #1e293b;
          }
          
          .form-input::placeholder {
            color: #94a3b8;
          }
          
          .form-input:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          }
          
          .login-button {
            padding: 0.9rem;
            /* Change this HEX code to match your logo's primary color */
            background-color: #050f2c; 
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 0.3rem;
            font-family: inherit;
          }
          
          .login-button:hover {
            /* This makes it slightly darker when you hover over it */
            background-color: #000e37;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(2, 31, 128, 0.2);
          }
            
          .login-button:active {
            transform: translateY(0);
          }
          
          .error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 0.75rem;
            border-radius: 10px;
            font-size: 0.85rem;
            text-align: center;
            margin-top: 0.75rem;
            animation: shake 0.3s;
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          
          .test-accounts {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e2e8f0;
          }
          
          .test-accounts-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
            font-size: 0.8rem;
            font-weight: 600;
            color: #64748b;
          }
          
          .test-accounts-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }
          
          .test-account-item {
            display: flex;
            flex-direction: column;
            padding: 0.65rem 0.75rem;
            background: #f8fafc;
            border-radius: 8px;
            font-size: 0.8rem;
            transition: all 0.2s;
            cursor: pointer;
            border: 1px solid #e2e8f0;
            text-align: center;
          }
          
          .test-account-item:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            transform: scale(1.02);
          }
          
          .test-account-role {
            font-weight: 600;
            color: #475569;
            margin-bottom: 0.15rem;
          }
          
          .test-account-email {
            color: #64748b;
            font-size: 0.7rem;
          }
          
          @media (max-width: 640px) {
            .login-content {
              padding: 1rem;
              max-width: 100%;
            }
            
            .login-brand h1 {
              font-size: 1.75rem;
            }
            
            .login-brand p {
              font-size: 0.85rem;
            }
            
            .login-card {
              padding: 2rem 1.5rem;
            }
            
            .brand-logo img {
              width: 100px;
            }
            
            .brand-logo-emoji {
              font-size: 2.5rem;
            }
            
            .test-accounts-list {
              grid-template-columns: 1fr;
            }
          }
          
          @media (max-height: 700px) {
            .login-brand {
              margin-bottom: 1rem;
            }
            
            .brand-logo {
              margin-bottom: 0.75rem;
            }
            
            .brand-logo img {
              width: 100px;
            }
            
            .brand-logo-emoji {
              font-size: 2.5rem;
            }
            
            .login-brand h1 {
              font-size: 1.75rem;
            }
            
            .login-card {
              padding: 2rem 2rem;
            }
            
            .test-accounts {
              margin-top: 1rem;
              padding-top: 1rem;
            }
          }
          
          @keyframes slideDown {
          from {
          opacity: 0;
          transform: translateY(-20px); /* Starts 20px higher */
          }
          to {
          opacity: 1;
          transform: translateY(0);    /* Ends at its natural position */
          }
        }
        `}</style>
        
        <div className="login-container">
          <div className="login-content">
            <div className="login-brand">
              <div className="brand-logo">
                {/* 
                  TO ADD YOUR LOGO IMAGE:
                  1. Place your logo file (e.g., logo.png) in the public folder
                  2. Replace the line below with:
                     <img src="/logo.png" alt="PharmaOps Logo" />
                  3. Remove or comment out the emoji span
                */}
                <img src="/logo.png" alt="PharmaOps Logo" />
              </div>
            </div>
            
            <div className="login-card">
              <div className="login-card-header">
                <h2>Welcome Back</h2>
                <p>Sign in to access your dashboard</p>
              </div>
              
              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                
                <button type="submit" className="login-button">
                  Sign In
                </button>
                
                {error && <div className="error-message">{error}</div>}
              </form>
              
              <div className="test-accounts">
                <div className="test-accounts-header">
                  <span></span>
                  <span>Demo Accounts</span>
                </div>
                <div className="test-accounts-list">
                  <div 
                    className="test-account-item"
                    onClick={() => {
                      setEmail('admin@pharmacorp.com');
                      setPassword('admin123');
                    }}
                  >
                    <span className="test-account-role">Admin</span>
                    <span className="test-account-email">admin@pharmacorp.com</span>
                  </div>
                  <div 
                    className="test-account-item"
                    onClick={() => {
                      setEmail('qa@pharmacorp.com');
                      setPassword('qa123');
                    }}
                  >
                    <span className="test-account-role">QA Lead</span>
                    <span className="test-account-email">qa@pharmacorp.com</span>
                  </div>
                  <div 
                    className="test-account-item"
                    onClick={() => {
                      setEmail('vendor@fastlogistics.com');
                      setPassword('vendor123');
                    }}
                  >
                    <span className="test-account-role">Vendor</span>
                    <span className="test-account-email">vendor@fastlogistics.com</span>
                  </div>
                  <div 
                    className="test-account-item"
                    onClick={() => {
                      setEmail('auditor@pharmacorp.com');
                      setPassword('auditor123');
                    }}
                  >
                    <span className="test-account-role">Auditor</span>
                    <span className="test-account-email">auditor@pharmacorp.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show dashboard based on role
  // Show dashboard based on role
return (
  <>
    <style>{`
      .app-logout-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  padding: 0.75rem 1.5rem;
  background: #1a2332;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-family: 'Poppins', sans-serif;
}

      .app-logout-btn:hover {
        background: #2a3442;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      @media (max-width: 768px) {
        .app-logout-btn {
          top: 1rem;
          right: 1rem;
          padding: 0.6rem 1.2rem;
          font-size: 0.85rem;
        }
      }
    `}</style>

    <button onClick={handleLogout} className="app-logout-btn">
      Logout
    </button>

    {user.role === 'ADMIN' && <AdminDashboard />}
    {user.role === 'VENDOR' && <VendorDashboard />}
    {user.role === 'QA' && <QADashboard />}
    {user.role === 'AUDITOR' && <AuditorDashboard />}
  </>
);
}

export default App;
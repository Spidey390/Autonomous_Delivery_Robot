import React, { useState } from 'react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { Activity, ShieldCheck, Lock, User, ArrowRight, Cpu, Radio, Zap } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useStore(state => state.setUser);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      setUser(res.data.user, res.data.token);
    } catch (err) {
      setError('Invalid credentials or unauthorized access');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="ambient-bg"></div>
      
      <div className="login-card glass-panel">
        {/* Left Branding Side */}
        <div className="login-brand">
          <div className="brand-logo">
            <Activity color="#fff" size={42} />
          </div>
          <h1>AeroBot<span style={{ color: 'var(--accent-hover)' }}>.OS</span></h1>
          <p>Autonomous Logistics & Telemetry Control Platform</p>
          
          <div className="brand-features">
            <div className="feature"><Cpu size={18} /> Edge Computing Ready</div>
            <div className="feature"><Radio size={18} /> Ultra-low Latency MQTT</div>
            <div className="feature"><ShieldCheck size={18} /> Encrypted Staff Access</div>
          </div>
        </div>

        {/* Right Form Side */}
        <div className="login-form-section">
          <div className="form-header">
            <h2>System Login</h2>
            <p>Enter your authorized credentials</p>
          </div>
          
          {error && (
            <div className="error-banner">
              <Zap size={16} /> {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Operator ID</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input 
                  type="text" 
                  placeholder="e.g. admin" 
                  className="input-field" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Passcode</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input-field" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-login" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Establish Uplink'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          padding: 20px;
        }

        .login-card {
          display: flex;
          flex-direction: row;
          max-width: 900px;
          width: 100%;
          padding: 0;
          overflow: hidden;
          background: rgba(10, 10, 15, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .login-brand {
          flex: 1;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.4) 0%, rgba(10, 10, 15, 0.8) 100%);
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }

        .brand-logo {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover));
          border-radius: 20px;
          display: flex; alignItems: center; justify-content: center;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(79, 70, 229, 0.5);
        }

        .login-brand h1 { font-size: 36px; margin-bottom: 12px; }
        .login-brand p { font-size: 16px; color: rgba(255,255,255,0.7); max-width: 250px; }

        .brand-features { margin-top: 40px; display: flex; flex-direction: column; gap: 16px; }
        .feature { display: flex; alignItems: center; gap: 12px; font-size: 14px; color: var(--text-secondary); }

        .login-form-section {
          flex: 1;
          padding: 60px 50px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-header { margin-bottom: 30px; }
        .form-header h2 { font-size: 28px; margin-bottom: 8px; }
        .form-header p { font-size: 15px; color: var(--text-secondary); }

        .input-group { margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        
        .input-with-icon { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 16px; color: var(--text-secondary); pointer-events: none; }
        .input-with-icon .input-field { padding-left: 48px; height: 54px; font-size: 16px; }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          font-size: 14px;
          animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        .btn-login {
          height: 54px;
          font-size: 16px;
          margin-top: 10px;
          justify-content: space-between;
          padding: 0 24px;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        @media (max-width: 768px) {
          .login-card { flex-direction: column; }
          .login-brand { padding: 40px 30px; }
          .login-form-section { padding: 40px 30px; }
        }
      `}</style>
    </div>
  );
}

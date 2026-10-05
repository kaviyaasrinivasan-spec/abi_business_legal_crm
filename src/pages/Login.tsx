import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="flex justify-center mb-4">
          <div className="p-4" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-full)' }}>
            <ShieldCheck size={36} />
          </div>
        </div>
        <h2 className="login-title">ABI Business Legal</h2>
        <p className="login-subtitle">Client Acquisition BD CRM</p>

        {error && (
          <div className="badge badge-danger w-full p-2 mb-4 text-center justify-center font-medium" style={{ display: 'flex' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Mail size={14} />
              <span>Corporate Email</span>
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. ceo@abibusinesslegal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Lock size={14} />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-muted font-bold text-center mb-2">QUICK TEST ACCOUNTS</p>
          <div className="flex flex-wrap gap-1 justify-center">
            <span onClick={() => fillCredentials('ceo@abibusinesslegal.com')} className="badge badge-info cursor-pointer font-medium text-xs">CEO</span>
            <span onClick={() => fillCredentials('manager@abibusinesslegal.com')} className="badge badge-secondary cursor-pointer font-medium text-xs">Manager</span>
            <span onClick={() => fillCredentials('executive@abibusinesslegal.com')} className="badge badge-success cursor-pointer font-medium text-xs">Executive</span>
            <span onClick={() => fillCredentials('telecaller@abibusinesslegal.com')} className="badge badge-warning cursor-pointer font-medium text-xs">Telecaller</span>
            <span onClick={() => fillCredentials('admin@abibusinesslegal.com')} className="badge badge-danger cursor-pointer font-medium text-xs">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

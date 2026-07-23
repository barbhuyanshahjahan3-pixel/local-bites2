import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(accessCode, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center text-center">
          <img src="/delivery/logo.png" alt="Local Bites Delivery Partner" className="w-16 h-16 rounded-2xl mb-3" />
          <h1 className="text-xl font-semibold text-white">Local Bites</h1>
          <p className="text-sm text-slate-400">Delivery partner sign in</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="label">Access code</label>
          <input
            className="input"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="DEL-XXXX"
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="absolute bottom-4 text-center text-xs text-slate-600">
        © 2026 Local Bites — Designed &amp; Developed by Shahjahan
      </p>
    </div>
  );
}

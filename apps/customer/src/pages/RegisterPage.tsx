import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, mobile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not continue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Local Bites" className="w-16 h-16 rounded-2xl mb-3" />
          <h1 className="text-2xl font-semibold text-white">Local Bites</h1>
          <p className="text-sm text-slate-400">Food from your favorite local spots.</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="label">Your name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Mobile number</label>
          <input
            className="input"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="9XXXXXXXXX"
            required
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Continuing…' : 'Continue'}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Returning? Just enter the same mobile number to pick up where you left off.
        </p>
      </form>
    </div>
  );
}

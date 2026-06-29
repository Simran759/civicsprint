import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, Key } from 'lucide-react';

export function DashboardAuthGate({ children, requiredRoles = [] }) {
  const location = useLocation();
  const session = sessionStorage.getItem('civicmind_user');
  const isAuthorized = sessionStorage.getItem('municipal_authorized') === 'true';
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = JSON.parse(session);

  if (!isAuthorized) {
    const submitPin = (e) => {
      e.preventDefault();
      if (pin.trim() === '1234') {
        sessionStorage.setItem('municipal_authorized', 'true');
        window.location.reload();
      } else {
        setError('Incorrect passcode. Please try again.');
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-700 rounded-3xl shadow-2xl p-8 backdrop-blur-xl text-slate-100">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 flex items-center justify-center border border-brand-500/25">
              <Key className="w-6 h-6 text-brand-300" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">Municipal Access Gate</h2>
              <p className="text-xs text-slate-400 mt-1">Enter the city command passcode to continue.</p>
            </div>
          </div>

          <form onSubmit={submitPin} className="space-y-4">
            <label className="block text-[11px] uppercase tracking-[0.24em] text-slate-400">Municipal PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN code"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-all"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all"
            >
              <Lock className="w-4 h-4" />
              Unlock Dashboard
            </button>
          </form>

          <div className="mt-6 text-xs text-slate-500">
            <p>Default demo PIN: <strong>1234</strong></p>
            <Link to="/login" className="text-brand-300 hover:text-brand-200">Return to login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Access Restricted</h2>
          <p className="mt-3 text-sm text-slate-500">
            Your current role (<strong>{user.role}</strong>) cannot access this section.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 mt-6 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default DashboardAuthGate;

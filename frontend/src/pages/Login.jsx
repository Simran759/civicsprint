import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, HardHat, ShieldAlert, Key, Check } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('citizen'); // citizen, worker, supervisor, admin
  const [email, setEmail] = useState('citizen@example.com');
  const [selectedWorker, setSelectedWorker] = useState('Rahul Sharma');
  const [selectedDept, setSelectedDept] = useState('Road Maintenance');

  const workers = [
    { name: 'Rahul Sharma', dept: 'Road Maintenance' },
    { name: 'Siddharth Verma', dept: 'Water & Power' },
    { name: 'Priya Nair', dept: 'Sanitation' },
    { name: 'Carlos Gomez', dept: 'Code Enforcement' },
    { name: 'Emily Watson', dept: 'Parks & Recreation' }
  ];

  const departments = [
    'Road Maintenance',
    'Water & Power',
    'Sanitation',
    'Code Enforcement',
    'Parks & Recreation'
  ];

  const handleSignIn = (e) => {
    e.preventDefault();

    let userSession = {
      role: selectedRole,
      email: email.trim(),
      name: 'Citizen User',
      department: ''
    };

    if (selectedRole === 'worker') {
      const workerInfo = workers.find(w => w.name === selectedWorker);
      userSession = {
        role: 'worker',
        email: `${selectedWorker.toLowerCase().replace(' ', '.')}@city.gov`,
        name: selectedWorker,
        department: workerInfo?.dept || ''
      };
      // Keep worker dashboard sessions clean
      sessionStorage.setItem('civicsprint_worker', selectedWorker);
    } else if (selectedRole === 'supervisor') {
      userSession = {
        role: 'supervisor',
        email: `manager.${selectedDept.toLowerCase().replace(' ', '.')}@city.gov`,
        name: `${selectedDept} Supervisor`,
        department: selectedDept
      };
    } else if (selectedRole === 'admin') {
      userSession = {
        role: 'admin',
        email: 'admin@city.gov',
        name: 'Admin',
        department: 'All'
      };
    }

    sessionStorage.setItem('civicmind_user', JSON.stringify(userSession));
    sessionStorage.setItem('municipal_authorized', 'true');
    
    // Dispatch custom event to let navbar or other pages know user changed
    window.dispatchEvent(new Event('authChange'));

    // Redirect to respective dashboard
    if (selectedRole === 'worker') {
      navigate('/worker');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 relative overflow-hidden">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl text-blue-600 mb-4 border border-blue-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Access Control Center</h2>
          <p className="text-slate-500 text-xs mt-1">
            Choose your role to sign into the CivicSprint operational platform.
          </p>
        </div>

        {/* Role Select Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {[
            { id: 'citizen', label: 'Citizen', icon: User },
            { id: 'worker', label: 'Field Worker', icon: HardHat },
            { id: 'supervisor', label: 'Dept Supervisor', icon: ShieldAlert },
            { id: 'admin', label: 'Admin', icon: Key },
          ].map(({ id, label, icon: Icon }) => {
            const isSelected = selectedRole === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedRole(id)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-xs font-bold transition-all text-center ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 text-blue-600 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-5 h-5 mb-1.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          {/* Conditional Inputs */}
          {selectedRole === 'citizen' && (
            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Citizen Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email to track/submit reports"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {selectedRole === 'worker' && (
            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Select Worker Profile</label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              >
                {workers.map(w => (
                  <option key={w.name} value={w.name}>{w.name} ({w.dept})</option>
                ))}
              </select>
            </div>
          )}

          {selectedRole === 'supervisor' && (
            <div className="space-y-1 text-left">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Select Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d} Supervisor</option>
                ))}
              </select>
            </div>
          )}

          {selectedRole === 'admin' && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 leading-normal">
              Admin bypasses department isolations and receives full override/audit dashboard access.
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center space-x-1.5 active:scale-98"
          >
            <span>Proceed into Portal</span>
            <Check className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

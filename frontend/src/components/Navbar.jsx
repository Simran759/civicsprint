import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, BarChart3, Menu, X, HardHat, LogOut, LayoutGrid } from 'lucide-react';

export function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchSessionUser = () => {
    const session = sessionStorage.getItem('civicmind_user');
    if (session) {
      setCurrentUser(JSON.parse(session));
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    fetchSessionUser();
    
    // Listen to custom authorization change events
    window.addEventListener('authChange', fetchSessionUser);
    return () => {
      window.removeEventListener('authChange', fetchSessionUser);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('civicmind_user');
    sessionStorage.removeItem('municipal_authorized');
    sessionStorage.removeItem('civicsprint_worker');
    setCurrentUser(null);
    navigate('/');
  };

  const navItems = [
    { to: '/', label: 'Command Center', icon: LayoutGrid },
    { to: '/citizen', label: 'Citizen Portal', icon: MapPin },
    { to: '/worker', label: 'Worker Portal', icon: HardHat },
    { to: '/dashboard', label: 'Municipal Dashboard', icon: BarChart3 },
  ];

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'supervisor':
      case 'manager':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'worker':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-205';
    }
  };

  return (
    <nav className="sticky top-0 z-[1000] border-b border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(2,6,23,0.35)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 transition-all hover:bg-white/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
                CivicSprint AI
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-500/15 text-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                        : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* User info & Signout */}
          <div className="hidden lg:flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3 bg-slate-50 py-1.5 px-3 rounded-2xl border border-slate-200">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-700">{currentUser.name}</p>
                  {currentUser.department && (
                    <p className="text-[8px] font-medium text-slate-400 -mt-0.5">{currentUser.department}</p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getRoleBadgeStyle(currentUser.role)}`}>
                  {currentUser.role}
                </span>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1 rounded-lg text-slate-450 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
              >
                <span>Authenticate</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-b border-white/10 bg-slate-950/95 lg:hidden" id="mobile-menu">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 rounded-xl px-3 py-3 text-base font-semibold transition-all ${
                      isActive
                        ? 'border border-blue-500/20 bg-blue-500/10 text-blue-300'
                        : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            
            <div className="pt-4 border-t border-slate-100 px-3">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 px-4 py-2 text-center text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all"
                >
                  Authenticate
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ToastNotification from '../components/ToastNotification';

export function MainLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-transparent text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-white/10 bg-slate-950/70 py-6 text-center text-xs text-slate-400 shadow-[0_-12px_40px_rgba(2,6,23,0.25)]">
          <div className="mx-auto max-w-7xl px-4">
            <p>© {new Date().getFullYear()} CivicSprint AI. Transforming citizen reports into action.</p>
          </div>
        </footer>
      </div>

      <ToastNotification />
    </div>
  );
}

export default MainLayout;

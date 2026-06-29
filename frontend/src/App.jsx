import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import CitizenPortal from './pages/CitizenPortal';
import MunicipalDashboard from './pages/MunicipalDashboard';
import IssueDetails from './pages/IssueDetails';
import WorkerDashboard from './pages/WorkerDashboard';
import ExecutiveBriefing from './pages/ExecutiveBriefing';
import DashboardAuthGate from './components/DashboardAuthGate';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Application Routes inside MainLayout */}
        <Route path="/" element={<MainLayout />}>
          {/* Smart City Command Center Landing Page */}
          <Route index element={<LandingPage />} />
          
          {/* Login Portal Page */}
          <Route path="login" element={<Login />} />
          
          {/* Citizen Portal (Report Incident / Track Timeline) */}
          <Route path="citizen" element={<CitizenPortal />} />
          
          {/* Municipal Administration dashboard (Protected for Supervisor/Admin) */}
          <Route 
            path="dashboard" 
            element={
              <DashboardAuthGate requiredRoles={['supervisor', 'manager', 'admin']}>
                <MunicipalDashboard />
              </DashboardAuthGate>
            } 
          />
          
          {/* Single Issue details (Protected - details check inside controller) */}
          <Route 
            path="issues/:id" 
            element={<IssueDetails />} 
          />

          {/* Executive Briefing (Protected for Supervisor/Admin) */}
          <Route 
            path="executive-briefing" 
            element={
              <DashboardAuthGate requiredRoles={['supervisor', 'manager', 'admin']}>
                <ExecutiveBriefing />
              </DashboardAuthGate>
            } 
          />

          {/* Field Worker workspace (Protected for Worker/Admin) */}
          <Route 
            path="worker" 
            element={
              <DashboardAuthGate requiredRoles={['worker', 'admin']}>
                <WorkerDashboard />
              </DashboardAuthGate>
            } 
          />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

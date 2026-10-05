import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LeadPipeline } from './pages/LeadPipeline';
import { Companies } from './pages/Companies';
import { Meetings } from './pages/Meetings';
import { Tasks } from './pages/Tasks';
import { Followups } from './pages/Followups';
import { Documents } from './pages/Documents';
import { Reports } from './pages/Reports';
import { Analytics } from './pages/Analytics';
import { AuditLogs } from './pages/AuditLogs';
import { Masters } from './pages/Masters';
import { Settings } from './pages/Settings';
import { UsersManagement } from './pages/UsersManagement';
import { CeoDashboard } from './pages/CeoDashboard';
import { CalendarPage, NotificationsPage, Profile } from './pages/Misc';

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', fontFamily: 'Inter, sans-serif',
        background: 'var(--background)', color: 'var(--text-muted)'
      }}>
        Loading ABI CRM...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* All authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications-page" element={<NotificationsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/followups" element={<Followups />} />
          </Route>

          {/* BDE and above */}
          <Route element={<ProtectedRoute allowedRoles={['CEO', 'BD Manager', 'BD Executive', 'Admin']} />}>
            <Route path="/pipeline" element={<LeadPipeline />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/documents" element={<Documents />} />
          </Route>

          {/* Managerial and Admin */}
          <Route element={<ProtectedRoute allowedRoles={['CEO', 'BD Manager', 'Admin']} />}>
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* CEO + Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['Admin', 'CEO']} />}>
            <Route path="/ceo-dashboard" element={<CeoDashboard />} />
            <Route path="/users-management" element={<UsersManagement />} />
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/masters" element={<Masters />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

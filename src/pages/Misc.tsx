import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as CalendarIcon, Bell, User as UserIcon } from 'lucide-react';

export const CalendarPage: React.FC = () => (
  <div className="card p-8 text-center" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <CalendarIcon size={56} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
    <h3 className="text-lg font-bold mb-2">Calendar Integration</h3>
    <p className="text-muted text-sm">Syncs with Google Calendar / Outlook — Coming soon</p>
  </div>
);

export const NotificationsPage: React.FC = () => (
  <div className="card p-8 text-center" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <Bell size={56} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
    <h3 className="text-lg font-bold mb-2">All Notifications</h3>
    <p className="text-muted text-sm">View and manage all your alerts, reminders, and system notifications here.</p>
  </div>
);

export const Profile: React.FC = () => {
  const { user } = useAuth();
  return (
    <div>
      <div className="card" style={{ maxWidth: '600px' }}>
        <div className="flex items-center gap-4 mb-6">
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700
          }}>
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold">{user?.fullName}</h3>
            <p className="text-muted text-sm">{user?.email}</p>
            <span className="badge badge-info mt-1">{user?.role}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <h4 className="font-semibold text-sm mb-4">Account Information</h4>
          <table className="w-full text-sm">
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="p-3 text-muted font-medium">Full Name</td>
                <td className="p-3 text-right font-semibold">{user?.fullName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="p-3 text-muted font-medium">Email Address</td>
                <td className="p-3 text-right">{user?.email}</td>
              </tr>
              <tr>
                <td className="p-3 text-muted font-medium">Access Role</td>
                <td className="p-3 text-right">
                  <span className="badge badge-info">{user?.role}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

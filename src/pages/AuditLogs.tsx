import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../contexts/AuthContext';
import { ShieldAlert, Search } from 'lucide-react';

interface AuditLog {
  log_id: number;
  user_name: string;
  user_role: string;
  action: string;
  old_value: any;
  new_value: any;
  ip_address: string;
  browser: string;
  created_at: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/audit-logs`);
        setLogs(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    (l.user_name || 'System').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="card flex items-center justify-between p-4 mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-danger" />
          <span className="font-bold">System Audit Logs</span>
        </div>
        <div className="search-container">
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="search-input" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center p-6">Loading audit trail...</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details (New Value)</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.log_id}>
                  <td className="text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="font-medium">{l.user_name || 'System'}</td>
                  <td><span className="badge badge-secondary text-xs">{l.user_role || 'Auto'}</span></td>
                  <td className="font-bold">{l.action}</td>
                  <td className="text-xs text-muted" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.new_value ? JSON.stringify(l.new_value).substring(0, 50) + '...' : '—'}
                  </td>
                  <td className="text-xs">{l.ip_address}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted">No logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

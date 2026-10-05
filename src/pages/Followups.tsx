import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../contexts/AuthContext';
import { PhoneCall, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface FollowUp {
  follow_up_id: number;
  company_id: number;
  company_name: string;
  follow_up_date: string;
  follow_up_time: string;
  priority: string;
  comments: string;
  status: string;
}

export const Followups: React.FC = () => {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');

  const fetchFollowups = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/followups`);
      setFollowups(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFollowups(); }, []);

  const handleComplete = async (id: number) => {
    try {
      await axios.put(`${API_BASE_URL}/followups/${id}`, { status: 'Completed' });
      fetchFollowups();
    } catch (err) {
      alert('Error updating follow-up status');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const filtered = followups.filter(f => {
    if (filter === 'pending') return f.status === 'Pending';
    if (filter === 'overdue') return f.follow_up_date < today && f.status === 'Pending';
    if (filter === 'completed') return f.status === 'Completed';
    return true;
  });

  const overdueCount = followups.filter(f => f.follow_up_date < today && f.status === 'Pending').length;

  return (
    <div>
      <div className="grid grid-3 gap-4 mb-4">
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">PENDING FOLLOW-UPS</span>
          <span className="kpi-value">{followups.filter(f => f.status === 'Pending').length}</span>
          <div className="kpi-icon-wrapper"><PhoneCall size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">OVERDUE CALLS</span>
          <span className="kpi-value" style={{ color: 'var(--danger)' }}>{overdueCount}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--danger)', background: 'var(--danger-light)' }}><AlertCircle size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">COMPLETED</span>
          <span className="kpi-value" style={{ color: 'var(--success)' }}>{followups.filter(f => f.status === 'Completed').length}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--success)', background: 'var(--success-light)' }}><CheckCircle size={20} /></div>
        </div>
      </div>

      <div className="card flex items-center gap-4 p-4 mb-4">
        <span className="font-bold text-sm">Filter:</span>
        {(['all', 'pending', 'overdue', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-6">Loading follow-ups...</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Follow-up Date</th>
                <th>Time</th>
                <th>Priority</th>
                <th>Notes / Comments</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted">No follow-ups for this filter.</td></tr>
              ) : filtered.map(f => {
                const isOverdue = f.follow_up_date < today && f.status === 'Pending';
                return (
                  <tr key={f.follow_up_id} style={isOverdue ? { backgroundColor: 'var(--danger-light)' } : {}}>
                    <td className="font-semibold">{f.company_name}</td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : undefined, fontWeight: isOverdue ? 700 : undefined }}>
                      {new Date(f.follow_up_date + 'T00:00:00').toLocaleDateString('en-IN')}
                      {isOverdue && <span className="badge badge-danger ml-2" style={{ fontSize: '9px' }}>Overdue</span>}
                    </td>
                    <td>{f.follow_up_time || '—'}</td>
                    <td>
                      <span className={`badge ${f.priority === 'High' ? 'badge-danger' : f.priority === 'Medium' ? 'badge-warning' : 'badge-secondary'}`}>
                        {f.priority}
                      </span>
                    </td>
                    <td className="text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.comments || '—'}</td>
                    <td>
                      <span className={`badge ${f.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{f.status}</span>
                    </td>
                    <td className="text-center">
                      {f.status !== 'Completed' && (
                        <button onClick={() => handleComplete(f.follow_up_id)} className="btn btn-sm btn-primary">
                          <CheckCircle size={12} /> Done
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

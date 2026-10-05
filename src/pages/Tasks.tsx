import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../contexts/AuthContext';
import { CheckSquare, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface Task {
  task_id: number;
  company_id: number;
  company_name: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  progress: number;
  owner_name: string;
  subtasks?: { subtask_id: number; title: string; status: string }[];
}

export const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      setTasks(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await axios.put(`${API_BASE_URL}/tasks/${id}`, { status, progress: status === 'Completed' ? 100 : undefined });
      fetchTasks();
    } catch (err) {
      alert('Error updating task status');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = tasks.filter(t => !statusFilter || t.status === statusFilter);
  const overdue = tasks.filter(t => t.due_date < today && t.status !== 'Completed').length;

  return (
    <div>
      <div className="grid grid-4 gap-4 mb-4">
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">TOTAL TASKS</span>
          <span className="kpi-value">{tasks.length}</span>
          <div className="kpi-icon-wrapper"><CheckSquare size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">COMPLETED</span>
          <span className="kpi-value" style={{ color: 'var(--success)' }}>{tasks.filter(t => t.status === 'Completed').length}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--success)', background: 'var(--success-light)' }}><CheckCircle size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">IN PROGRESS</span>
          <span className="kpi-value">{tasks.filter(t => t.status === 'In Progress').length}</span>
          <div className="kpi-icon-wrapper"><Clock size={20} /></div>
        </div>
        <div className="card kpi-card">
          <span className="text-xs text-muted font-bold">OVERDUE</span>
          <span className="kpi-value" style={{ color: 'var(--danger)' }}>{overdue}</span>
          <div className="kpi-icon-wrapper" style={{ color: 'var(--danger)', background: 'var(--danger-light)' }}><AlertCircle size={20} /></div>
        </div>
      </div>

      <div className="card flex items-center gap-4 p-4 mb-4">
        <span className="font-bold text-sm">Filter:</span>
        {['', 'Pending', 'In Progress', 'Completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-6">Loading tasks...</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Company</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted">No tasks found.</td></tr>
              ) : filtered.map(t => {
                const isOverdue = t.due_date < today && t.status !== 'Completed';
                return (
                  <tr key={t.task_id} style={isOverdue ? { backgroundColor: 'var(--danger-light)' } : {}}>
                    <td className="font-semibold">{t.title}</td>
                    <td className="text-muted">{t.company_name}</td>
                    <td>{t.owner_name || '—'}</td>
                    <td>
                      <span style={{ color: isOverdue ? 'var(--danger)' : undefined, fontWeight: isOverdue ? 700 : undefined }}>
                        {t.due_date ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-IN') : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.priority === 'High' ? 'badge-danger' : t.priority === 'Medium' ? 'badge-warning' : 'badge-secondary'}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <div style={{ background: 'var(--border)', borderRadius: 'var(--radius-full)', height: '6px', width: '80px', overflow: 'hidden' }}>
                        <div style={{ width: `${t.progress || 0}%`, background: t.progress === 100 ? 'var(--success)' : 'var(--primary)', height: '100%', transition: 'width 0.3s' }} />
                      </div>
                      <span className="text-xs text-muted">{t.progress || 0}%</span>
                    </td>
                    <td>
                      <span className={`badge ${t.status === 'Completed' ? 'badge-success' : t.status === 'In Progress' ? 'badge-info' : 'badge-secondary'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="text-center">
                      {t.status !== 'Completed' && (
                        <button onClick={() => handleStatusUpdate(t.task_id, 'Completed')} className="btn btn-sm btn-primary" title="Mark as Completed">
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

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../contexts/AuthContext';
import { Users, Plus, Edit, Trash2, X, ShieldCheck, Mail, Phone } from 'lucide-react';

interface UserRecord {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

const ROLES = ['CEO', 'BD Manager', 'BD Executive', 'Telecaller', 'Admin'];

const roleBadgeClass: Record<string, string> = {
  'CEO': 'badge-danger',
  'BD Manager': 'badge-info',
  'BD Executive': 'badge-success',
  'Telecaller': 'badge-warning',
  'Admin': 'badge-secondary',
};

export const UsersManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('BD Executive');
  const [formPassword, setFormPassword] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormName(''); setFormEmail(''); setFormPhone('');
    setFormRole('BD Executive'); setFormPassword(''); setFormActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setFormName(u.full_name);
    setFormEmail(u.email);
    setFormPhone(u.phone || '');
    setFormRole(u.role);
    setFormPassword('');
    setFormActive(u.is_active);
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingUser) {
        const payload: any = {
          full_name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          is_active: formActive,
        };
        if (formPassword) payload.password = formPassword;
        await axios.put(`${API_BASE_URL}/users/${editingUser.user_id}`, payload);
      } else {
        await axios.post(`${API_BASE_URL}/users`, {
          full_name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          password: formPassword,
          is_active: formActive,
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (id === currentUser?.id) { alert('You cannot delete your own account.'); return; }
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (u: UserRecord) => {
    try {
      await axios.put(`${API_BASE_URL}/users/${u.user_id}`, { is_active: !u.is_active });
      fetchUsers();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div>
      {/* Header Row */}
      <div className="card flex items-center justify-between p-4 mb-4">
        <div className="flex items-center gap-3">
          <Users className="text-primary" />
          <span className="font-bold">User Management</span>
          <span className="badge badge-secondary">{users.length} Users</span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add New User
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-4 gap-4 mb-4">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="card kpi-card" style={{ marginBottom: 0 }}>
              <span className="text-xs text-muted font-bold">{role.toUpperCase()}</span>
              <span className="kpi-value">{count}</span>
              <div className="kpi-icon-wrapper"><ShieldCheck size={20} /></div>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center p-6">Loading users...</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th className="text-center">Status</th>
                <th>Last Login</th>
                <th>Joined</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted">No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.user_id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14, flexShrink: 0
                      }}>
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold">{u.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-sm">
                      <Mail size={12} className="text-muted" />
                      {u.email}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-sm text-muted">
                      <Phone size={12} />
                      {u.phone || '—'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${roleBadgeClass[u.role] || 'badge-secondary'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`badge cursor-pointer ${u.is_active ? 'badge-success' : 'badge-danger'}`}
                      title="Click to toggle active status"
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="text-xs text-muted">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="text-xs text-muted">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEditModal(u)} className="btn btn-secondary btn-sm" title="Edit">
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.user_id, u.full_name)}
                        className="btn btn-danger btn-sm"
                        title="Delete"
                        disabled={u.user_id === currentUser?.id}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="theme-switch" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body grid grid-2 gap-4">
                {error && (
                  <div className="span-2 badge badge-danger w-full p-2 text-center justify-center" style={{ display: 'flex' }}>
                    {error}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" required className="form-input" value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Corporate Email *</label>
                  <input type="email" required className="form-input" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-input" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select required className="form-select" value={formRole} onChange={e => setFormRole(e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group span-2">
                  <label className="form-label">
                    {editingUser ? 'New Password (leave blank to keep existing)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    required={!editingUser}
                    placeholder={editingUser ? '••••••••' : 'Min 8 characters'}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                  />
                </div>
                <div className="form-group span-2 flex items-center gap-3">
                  <input type="checkbox" id="chkActive" checked={formActive} onChange={e => setFormActive(e.target.checked)} />
                  <label htmlFor="chkActive" className="form-label mb-0 cursor-pointer">Account Active</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useStore from '../store/useStore';
import { UserPlus, UserCircle, Trash2, Edit2, ShieldAlert, KeyRound } from 'lucide-react';
import { toast } from './Toast';

export default function StaffManager() {
  const user = useStore(state => state.user);
  const token = useStore(state => state.token);
  const [staffList, setStaffList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);

  // Note: For a real app, pass the JWT token in headers. 
  // Here we're on localhost but we should attach it to prevent unauthorized access.
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchStaff = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users', axiosConfig);
      setStaffList(res.data);
    } catch { toast('Failed to fetch staff list', 'error'); }
  };

  useEffect(() => {
    if (user?.role === 'admin') fetchStaff();
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: 'var(--danger)' }}>
        <ShieldAlert size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
        <h2>Access Denied</h2>
        <p>You must be an administrator to view this page.</p>
      </div>
    );
  }

  const handleOpenNew = () => {
    setEditingId(null);
    setUsername(''); setPassword(''); setRole('staff');
    setShowModal(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingId(staff._id);
    setUsername(staff.username);
    setPassword(''); // leave blank unless changing
    setRole(staff.role);
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (name === 'admin') { toast('Cannot delete main admin', 'error'); return; }
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, axiosConfig);
      toast('Staff account deleted', 'success');
      fetchStaff();
    } catch { toast('Failed to delete staff account', 'error'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { role };
      if (!editingId) {
        payload.username = username;
        if (!password) { toast('Password is required', 'error'); setLoading(false); return; }
        payload.password = password;
        await axios.post('http://localhost:5000/api/users', payload, axiosConfig);
        toast('Staff added successfully', 'success');
      } else {
        if (password) payload.password = password;
        await axios.put(`http://localhost:5000/api/users/${editingId}`, payload, axiosConfig);
        toast('Staff updated successfully', 'success');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save staff', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Staff Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Manage access to the robot control system</p>
        </div>
        <button className="btn" onClick={handleOpenNew}>
          <UserPlus size={18} /> Add Staff
        </button>
      </div>

      <div className="grid-3">
        {staffList.map(staff => (
          <div key={staff._id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: staff.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', padding: '12px', borderRadius: '12px' }}>
                <UserCircle size={24} color={staff.role === 'admin' ? 'var(--danger)' : 'var(--accent-primary)'} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{staff.username}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Role: <strong style={{ color: staff.role === 'admin' ? 'var(--danger)' : 'var(--accent-primary)' }}>{staff.role}</strong>
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }} onClick={() => handleOpenEdit(staff)}>
                <Edit2 size={14} /> Edit
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} disabled={staff.username === 'admin'} onClick={() => handleDelete(staff._id, staff.username)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>👤</div>
            <h3>{editingId ? 'Edit User' : 'Add New User'}</h3>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>Set credentials and permissions.</p>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!editingId && (
                <input type="text" placeholder="Username" className="input-field" value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
              )}
              {editingId && (
                <div style={{ fontSize: '14px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  Editing: <strong>{username}</strong>
                </div>
              )}
              
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  placeholder={editingId ? "Leave blank to keep current password" : "Password"} 
                  className="input-field" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required={!editingId} 
                  style={{ paddingLeft: '40px' }} 
                />
              </div>

              <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
                <option value="staff">Staff (Control & Monitor)</option>
                <option value="admin">Admin (Manage Users & Settings)</option>
              </select>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Saving...' : '✅ Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

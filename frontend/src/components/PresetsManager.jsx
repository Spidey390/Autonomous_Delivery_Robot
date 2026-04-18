import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { toast } from './Toast';

export default function PresetsManager() {
  const presets = useStore(state => state.presets);
  const setPresets = useStore(state => state.setPresets);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPresets = async () => {
    try {
      const res = await api.get('/presets');
      setPresets(res.data);
    } catch { toast('Failed to fetch presets', 'error'); }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setName(''); setLat(''); setLng('');
    setShowModal(true);
  };

  const handleOpenEdit = (preset) => {
    setEditingId(preset._id);
    setName(preset.name);
    setLat(preset.lat);
    setLng(preset.lng);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/presets/${id}`);
      toast('Location deleted', 'success');
      fetchPresets();
    } catch { toast('Failed to delete location', 'error'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name, lat: parseFloat(lat), lng: parseFloat(lng) };
      if (editingId) {
        await api.put(`/presets/${editingId}`, payload);
        toast('Location updated successfully', 'success');
      } else {
        await api.post('/presets', payload);
        toast('Location added successfully', 'success');
      }
      setShowModal(false);
      fetchPresets();
    } catch { toast('Failed to save location', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Campus Locations</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Manage preset delivery destinations</p>
        </div>
        <button className="btn" onClick={handleOpenNew}>
          <Plus size={18} /> Add Location
        </button>
      </div>

      <div className="grid-3">
        {presets.map(preset => (
          <div key={preset._id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(59,130,246,0.2)', padding: '12px', borderRadius: '12px' }}>
                <MapPin size={24} color="var(--accent-primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{preset.name}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {preset.lat.toFixed(6)}, {preset.lng.toFixed(6)}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }} onClick={() => handleOpenEdit(preset)}>
                <Edit2 size={14} /> Edit
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(preset._id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
        {presets.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <MapPin size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <p>No locations saved yet.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📍</div>
            <h3>{editingId ? 'Edit Location' : 'Add New Location'}</h3>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>Enter the exact GPS coordinates for this place.</p>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="text" placeholder="Location Name (e.g. CS Dept)" className="input-field" value={name} onChange={e => setName(e.target.value)} required autoFocus />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" step="any" placeholder="Latitude" className="input-field" value={lat} onChange={e => setLat(e.target.value)} required />
                <input type="number" step="any" placeholder="Longitude" className="input-field" value={lng} onChange={e => setLng(e.target.value)} required />
              </div>
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

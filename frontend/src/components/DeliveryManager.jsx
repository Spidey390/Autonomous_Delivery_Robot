import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { Plus, KeyRound, MapPin, Truck, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import LocationSearch from './LocationSearch';
import { toast } from './Toast';

const STATUS_ORDER = ['Pending', 'In Progress', 'Arrived', 'Delivered', 'Cancelled'];

function StatusBadge({ status }) {
  const map = {
    'Pending':     { cls: 'status-pending',     icon: '⏳' },
    'In Progress': { cls: 'status-in-progress',  icon: '🚗' },
    'Arrived':     { cls: 'status-arrived',      icon: '📍' },
    'Delivered':   { cls: 'status-delivering',   icon: '✅' },
    'Cancelled':   { cls: 'status-stopped',      icon: '❌' },
  };
  const s = map[status] || map['Pending'];
  return <span className={`status-badge ${s.cls}`}>{s.icon} {status}</span>;
}

export default function DeliveryManager() {
  const token = useStore(state => state.token);
  const deliveries = useStore(state => state.deliveries);
  const setDeliveries = useStore(state => state.setDeliveries);
  const presets = useStore(state => state.presets);
  const sysSettings = useStore(state => state.sysSettings) || {};

  const [showNewModal, setShowNewModal] = useState(false);
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [newLocName, setNewLocName] = useState('');

  const [otpModal, setOtpModal] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpMsg, setOtpMsg] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const res = await api.get('/deliveries');
      setDeliveries(res.data);
    } catch { toast('Failed to fetch deliveries', 'error'); }
  };

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleLocationPick = ({ lat, lng, name }) => {
    setNewLat(lat);
    setNewLng(lng);
    setNewLocName(name ? name.split(',').slice(0, 3).join(',') : 'Selected Location');
  };

  const handlePresetSelect = (e) => {
    const val = e.target.value;
    if (!val) return;
    const loc = presets[parseInt(val)];
    setNewLat(loc.lat);
    setNewLng(loc.lng);
    setNewLocName(loc.name);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newLat || !newLng) { toast('Please search and select a location', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/deliveries', { lat: parseFloat(newLat), lng: parseFloat(newLng) });
      toast(`📦 Delivery to "${newLocName || 'destination'}" created!`, 'success');
      setShowNewModal(false);
      setNewLat(''); setNewLng(''); setNewLocName('');
      fetchDeliveries();
    } catch { toast('Failed to create delivery', 'error'); }
    finally { setLoading(false); }
  };

  const handleAssign = async (del) => {
    try {
      await api.post('/robot/command', {
        command: 'destination',
        payload: del.destination
      });
      await api.patch(`/deliveries/${del.deliveryId}/status`, { status: 'In Progress' });
      toast(`🚗 Robot assigned to ${del.deliveryId}`, 'info');
      fetchDeliveries();
    } catch { toast('Failed to assign robot', 'error'); }
  };

  const handleGenerateOTP = async (deliveryId) => {
    try {
      if (sysSettings.otpEnabled === false) {
        await api.post('/otp/verify', { deliveryId, otp: 'BYPASS' });
        toast('Delivery completed (OTP Disabled)', 'success');
        fetchDeliveries();
        return;
      }

      const res = await api.post('/otp/generate', { deliveryId });
      setActiveDelivery(deliveryId);
      setOtpModal(true);
      setCountdown(60);
      fetchDeliveries();
    } catch { toast('Failed to generate OTP', 'error'); }
  };

  const handleOpenOtpModal = (del) => {
    setActiveDelivery(del.deliveryId);
    setOtpInput('');
    setOtpMsg('');
    setOtpSuccess(false);
    setOtpModal(true);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/otp/verify', { deliveryId: activeDelivery, otp: otpInput });
      setOtpMsg(res.data.message);
      setOtpSuccess(true);
      toast('🔓 Package unlocked successfully!', 'success');
      setTimeout(() => {
        setOtpModal(false);
        fetchDeliveries();
      }, 2500);
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed';
      setOtpMsg(msg);
      setOtpSuccess(false);
      toast(`❌ ${msg}`, 'error');
    } finally { setLoading(false); }
  };

  const counts = {
    total:      deliveries.length,
    pending:    deliveries.filter(d => d.status === 'Pending').length,
    active:     deliveries.filter(d => d.status === 'In Progress').length,
    delivered:  deliveries.filter(d => d.status === 'Delivered').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Delivery Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Create, track, and verify deliveries</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)' }} onClick={fetchDeliveries}>
            <RefreshCw size={16} />
          </button>
          <button className="btn" onClick={() => setShowNewModal(true)}>
            <Plus size={18} /> New Delivery
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: counts.total,     icon: Truck,       color: 'var(--accent-primary)' },
          { label: 'Pending', value: counts.pending,  icon: Clock,       color: 'var(--text-secondary)' },
          { label: 'Active', value: counts.active,    icon: Truck,       color: 'var(--warning)' },
          { label: 'Delivered', value: counts.delivered, icon: CheckCircle, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 18px' }}>
            <div style={{ background:`${s.color}22`, borderRadius:'8px', padding:'8px' }}><s.icon size={20} color={s.color} /></div>
            <div>
              <div style={{ fontSize:'11px', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
              <div style={{ fontSize:'22px', fontWeight:700, color:s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-color)' }}>
              {['Delivery ID', 'Destination', 'Created', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 20px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveries.map(del => (
              <tr key={del._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '16px 20px', fontWeight: 700, fontFamily: 'monospace', fontSize: '14px' }}>{del.deliveryId}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '5px', color: 'var(--accent-primary)' }} />
                  {del.destination.lat.toFixed(4)}, {del.destination.lng.toFixed(4)}
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {new Date(del.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <StatusBadge status={del.status} />
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {del.status === 'Pending' && (
                      <button className="btn" onClick={() => handleAssign(del)} style={{ fontSize: '12px', padding: '6px 14px' }}>
                        <Truck size={13} /> Assign
                      </button>
                    )}
                    {del.status === 'In Progress' && (
                      <button className="btn btn-success" onClick={() => handleGenerateOTP(del.deliveryId)} style={{ fontSize: '12px', padding: '6px 14px' }}>
                        📍 Simulate Arrive
                      </button>
                    )}
                    {del.status === 'Arrived' && (
                      <button className="btn btn-success" onClick={() => handleOpenOtpModal(del)} style={{ fontSize: '12px', padding: '6px 14px' }}>
                        <KeyRound size={13} /> Enter OTP {countdown > 0 && `(${countdown}s)`}
                      </button>
                    )}
                    {del.status === 'Delivered' && (
                      <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600 }}>✅ Complete</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
                  No deliveries yet. Create your first one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Delivery Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📦</div>
            <h3>New Delivery Request</h3>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>Enter the GPS destination for this delivery.</p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <select className="input-field" onChange={handlePresetSelect} defaultValue="">
                <option value="" disabled>Select Campus Preset...</option>
                {presets.map((loc, i) => (
                  <option key={i} value={i}>{loc.name}</option>
                ))}
              </select>

              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>— OR —</div>

              <LocationSearch
                placeholder="Search global destination…"
                onSelect={handleLocationPick}
              />
              {newLat && newLng && (
                <div style={{ fontSize: '12px', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: 'var(--success)' }}>
                  ✅ {newLocName || `${parseFloat(newLat).toFixed(5)}, ${parseFloat(newLng).toFixed(5)}`}<br/>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{parseFloat(newLat).toFixed(5)}, {parseFloat(newLng).toFixed(5)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setShowNewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Creating...' : '✅ Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {otpModal && (
        <div className="modal-overlay" onClick={() => !otpSuccess && setOtpModal(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            {!otpSuccess ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔑</div>
                <h3>Verify OTP</h3>
                <p style={{ fontSize: '13px', marginBottom: '4px' }}>Delivery: <strong>{activeDelivery}</strong></p>
                {countdown > 0 && (
                  <div style={{ margin: '8px 0', padding: '6px 14px', background: 'rgba(245,158,11,0.15)', borderRadius: '999px', display: 'inline-block', fontSize: '13px', color: 'var(--warning)' }}>
                    ⏱ Expires in {countdown}s
                  </div>
                )}
                {otpMsg && (
                  <div style={{ color: 'var(--danger)', margin: '12px 0', fontSize: '14px' }}>❌ {otpMsg}</div>
                )}
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <input
                    type="text" placeholder="Enter 6-digit OTP" className="input-field"
                    style={{ textAlign: 'center', fontSize: '28px', letterSpacing: '8px', fontWeight: 700 }}
                    value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/, ''))}
                    maxLength={6} required autoFocus
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setOtpModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={loading || otpInput.length !== 6}>
                      {loading ? 'Verifying...' : '🔓 Unlock Box'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ color: 'var(--success)' }}>Box Unlocked!</h3>
                <p>Servo motor activated. Package is ready for collection.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

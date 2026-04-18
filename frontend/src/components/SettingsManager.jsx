import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { toast } from './Toast';
import { Settings, Shield, Cpu, Navigation, Wifi, Bell, Database, Save, Trash2, Power, AlertTriangle, UserCircle } from 'lucide-react';

export default function SettingsManager() {
  const user = useStore(state => state.user);
  const sysSettings = useStore(state => state.sysSettings);
  const setSysSettings = useStore(state => state.setSysSettings);
  const logout = useStore(state => state.logout);

  const [activeTab, setActiveTab] = useState('account');
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSysSettings(res.data);
      setFormData(res.data);
    } catch { toast('Failed to load settings', 'error'); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/settings', formData);
      setSysSettings(res.data);
      toast('⚙️ Settings saved and synced with robot', 'success');
    } catch { toast('Failed to save settings', 'error'); }
    finally { setLoading(false); }
  };

  const handleTestCommand = async (cmd, payload) => {
    try {
      await api.post('/robot/command', { command: cmd, payload });
      toast(`Sent test command: ${cmd}`, 'info');
    } catch { toast('Command failed', 'error'); }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to delete all delivery history? This cannot be undone.')) return;
    try {
      await api.delete('/deliveries/history');
      toast('Delivery history cleared', 'success');
    } catch { toast('Failed to clear history', 'error'); }
  };

  if (!formData) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  const tabs = [
    { id: 'account', icon: UserCircle, label: 'Account' },
    { id: 'security', icon: Shield, label: 'Security & Network' },
    { id: 'robot', icon: Cpu, label: 'Robot Config' },
    { id: 'nav', icon: Navigation, label: 'Navigation & Map' },
    { id: 'system', icon: Database, label: 'System & Data' },
  ];

  return (
    <div className="settings-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={24} color="var(--accent-primary)" /> System Settings
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Configure robot behavior, security, and interface</p>
        </div>
        <button className="btn btn-success" onClick={handleSave} disabled={loading}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Sidebar Tabs */}
        <div className="glass-panel" style={{ width: '240px', padding: '12px' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`nav-item ${activeTab === t.id ? 'active' : ''}`}
              style={{ width: '100%', border: 'none', background: activeTab === t.id ? 'rgba(59,130,246,0.1)' : 'transparent', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => setActiveTab(t.id)}
            >
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-panel" style={{ flex: 1 }}>
          <form onSubmit={handleSave}>
            
            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="settings-section">
                <h3><UserCircle size={18}/> Account Profile</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{user?.username}</div>
                    <div style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Role: {user?.role}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-danger" onClick={logout}>Logout</button>
                  {user?.role === 'admin' && (
                    <button type="button" className="btn" onClick={() => window.location.href='/staff'}>Manage Staff Accounts</button>
                  )}
                </div>

                <h3 style={{ marginTop: '32px' }}><Bell size={18}/> Notification Preferences</h3>
                <div className="grid-2">
                  <label className="toggle-label">
                    <input type="checkbox" name="notificationsEnabled" checked={formData.notificationsEnabled} onChange={handleChange} /> Enable All Notifications
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="soundEnabled" checked={formData.soundEnabled} onChange={handleChange} /> Enable Sound Alerts
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="notifyObstacle" checked={formData.notifyObstacle} onChange={handleChange} disabled={!formData.notificationsEnabled} /> Notify on Obstacle
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="notifyBattery" checked={formData.notifyBattery} onChange={handleChange} disabled={!formData.notificationsEnabled} /> Notify Low Battery
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="notifyDelivery" checked={formData.notifyDelivery} onChange={handleChange} disabled={!formData.notificationsEnabled} /> Notify Delivery Complete
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="notifyOtp" checked={formData.notifyOtp} onChange={handleChange} disabled={!formData.notificationsEnabled} /> Notify OTP Generation
                  </label>
                </div>
              </div>
            )}

            {/* SECURITY & NETWORK TAB */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <h3><Shield size={18}/> Security & OTP</h3>
                <div className="grid-2">
                  <label className="toggle-label" style={{ gridColumn: '1 / -1' }}>
                    <input type="checkbox" name="otpEnabled" checked={formData.otpEnabled} onChange={handleChange} /> 
                    Enable OTP Verification for Deliveries
                  </label>
                  <div>
                    <label>OTP Expiry Time (seconds)</label>
                    <input type="number" className="input-field" name="otpExpiryTime" value={formData.otpExpiryTime} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Max OTP Attempts</label>
                    <input type="number" className="input-field" name="otpMaxAttempts" value={formData.otpMaxAttempts} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Session Timeout (seconds)</label>
                    <input type="number" className="input-field" name="sessionTimeout" value={formData.sessionTimeout} onChange={handleChange} />
                  </div>
                </div>

                <h3 style={{ marginTop: '32px' }}><Wifi size={18}/> Network Connectivity</h3>
                <div className="grid-2">
                  <div>
                    <label>Robot WiFi SSID</label>
                    <input type="text" className="input-field" name="wifiSsid" value={formData.wifiSsid} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Robot WiFi Password</label>
                    <input type="password" className="input-field" name="wifiPassword" value={formData.wifiPassword} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Backend API URL</label>
                    <input type="text" className="input-field" name="backendUrl" value={formData.backendUrl} onChange={handleChange} />
                  </div>
                  <div>
                    <label>MQTT Retry Interval (sec)</label>
                    <input type="number" className="input-field" name="retryInterval" value={formData.retryInterval} onChange={handleChange} />
                  </div>
                </div>
              </div>
            )}

            {/* ROBOT CONFIG TAB */}
            {activeTab === 'robot' && (
              <div className="settings-section">
                <h3><Cpu size={18}/> Hardware Calibration</h3>
                <div className="grid-2">
                  <div>
                    <label>Default Speed ({formData.defaultSpeed}%)</label>
                    <input type="range" name="defaultSpeed" min="0" max="100" value={formData.defaultSpeed} onChange={handleChange} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label>Obstacle Threshold ({formData.obstacleThreshold} cm)</label>
                    <input type="range" name="obstacleThreshold" min="5" max="100" value={formData.obstacleThreshold} onChange={handleChange} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label>Motor Calibration - Left Offset</label>
                    <input type="number" className="input-field" name="motorCalibrationLeft" value={formData.motorCalibrationLeft} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Motor Calibration - Right Offset</label>
                    <input type="number" className="input-field" name="motorCalibrationRight" value={formData.motorCalibrationRight} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Servo Angle: Locked</label>
                    <input type="number" className="input-field" name="servoLockAngle" value={formData.servoLockAngle} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Servo Angle: Unlocked</label>
                    <input type="number" className="input-field" name="servoUnlockAngle" value={formData.servoUnlockAngle} onChange={handleChange} />
                  </div>
                </div>

                <h3 style={{ marginTop: '32px' }}><Power size={18}/> Power & Control</h3>
                <div className="grid-2">
                  <div>
                    <label>Low Battery Threshold (%)</label>
                    <input type="number" className="input-field" name="lowBatteryThreshold" value={formData.lowBatteryThreshold} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Control Sensitivity ({formData.controlSensitivity}%)</label>
                    <input type="range" name="controlSensitivity" min="0" max="100" value={formData.controlSensitivity} onChange={handleChange} style={{ width: '100%' }} />
                  </div>
                  <label className="toggle-label">
                    <input type="checkbox" name="autoStopLowBattery" checked={formData.autoStopLowBattery} onChange={handleChange} /> Auto-Stop on Low Battery
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="powerSavingMode" checked={formData.powerSavingMode} onChange={handleChange} /> Enable Power Saving Mode
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="manualControlEnabled" checked={formData.manualControlEnabled} onChange={handleChange} /> Allow Manual Control
                  </label>
                  <label className="toggle-label">
                    <input type="checkbox" name="eStopConfirmation" checked={formData.eStopConfirmation} onChange={handleChange} /> Require Confirmation for E-Stop
                  </label>
                </div>
              </div>
            )}

            {/* NAV TAB */}
            {activeTab === 'nav' && (
              <div className="settings-section">
                <h3><Navigation size={18}/> Navigation Rules</h3>
                <div className="grid-2">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Navigation Mode</label>
                    <select className="input-field" name="navigationMode" value={formData.navigationMode} onChange={handleChange}>
                      <option value="GPS">Pure GPS</option>
                      <option value="Line-follow">Line Following (Sensors)</option>
                      <option value="Hybrid">Hybrid (GPS + Vision)</option>
                    </select>
                  </div>
                  <div>
                    <label>Default Return Latitude</label>
                    <input type="number" step="any" className="input-field" name="defaultDeliveryLat" value={formData.defaultDeliveryLat} onChange={handleChange} />
                  </div>
                  <div>
                    <label>Default Return Longitude</label>
                    <input type="number" step="any" className="input-field" name="defaultDeliveryLng" value={formData.defaultDeliveryLng} onChange={handleChange} />
                  </div>
                  <label className="toggle-label" style={{ gridColumn: '1 / -1' }}>
                    <input type="checkbox" name="autoReturn" checked={formData.autoReturn} onChange={handleChange} /> 
                    Auto-return to default location after delivery completes
                  </label>
                </div>

                <h3 style={{ marginTop: '32px' }}><Settings size={18}/> UI & Map</h3>
                <div className="grid-2">
                  <div>
                    <label>Map Visual Style</label>
                    <select className="input-field" name="mapType" value={formData.mapType} onChange={handleChange}>
                      <option value="Street">Street Map</option>
                      <option value="Satellite">Satellite View</option>
                    </select>
                  </div>
                  <div>
                    <label>UI Refresh Rate (seconds)</label>
                    <input type="number" className="input-field" name="locationRefreshRate" value={formData.locationRefreshRate} onChange={handleChange} />
                  </div>
                  <label className="toggle-label" style={{ gridColumn: '1 / -1' }}>
                    <input type="checkbox" name="showRouteHistory" checked={formData.showRouteHistory} onChange={handleChange} /> 
                    Show robot route history trail on dashboard map
                  </label>
                </div>
              </div>
            )}

            {/* SYSTEM TAB */}
            {activeTab === 'system' && (
              <div className="settings-section">
                <h3><Database size={18}/> Data Management</h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button type="button" className="btn btn-danger" onClick={handleClearHistory} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Trash2 size={16} /> Clear Delivery History
                  </button>
                  <button type="button" className="btn" onClick={() => toast('Exporting logs to CSV...', 'info')}>
                    Export System Logs
                  </button>
                </div>

                <h3 style={{ marginTop: '32px' }}><AlertTriangle size={18}/> Hardware Diagnostics</h3>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Use these commands to physically test the robot hardware via MQTT.
                  </p>
                  <div className="grid-3">
                    <button type="button" className="btn" onClick={() => handleTestCommand('servo', { angle: formData.servoUnlockAngle })}>
                      Test Servo Open
                    </button>
                    <button type="button" className="btn" onClick={() => handleTestCommand('servo', { angle: formData.servoLockAngle })}>
                      Test Servo Close
                    </button>
                    <button type="button" className="btn" onClick={() => handleTestCommand('motor_test', { speed: 50 })}>
                      Test Motors (5 sec)
                    </button>
                    <button type="button" className="btn btn-danger" style={{ gridColumn: '1 / -1' }} onClick={() => {
                      if(window.confirm('Reboot physical ESP32?')) handleTestCommand('reboot', {});
                    }}>
                      Soft Reboot ESP32
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
      <style>{`
        .settings-page { max-width: 1200px; margin: 0 auto; }
        .settings-section h3 { display: flex; alignItems: center; gap: 8px; font-size: 16px; margin-bottom: 20px; color: var(--accent-primary); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
        .toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 14px; user-select: none; }
        .toggle-label input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent-primary); cursor: pointer; }
      `}</style>
    </div>
  );
}

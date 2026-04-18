import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../utils/api';
import useStore from '../store/useStore';
import { Navigation, Play, Square, AlertTriangle, Battery, Wifi, Cpu, MapPin } from 'lucide-react';
import { toast } from './Toast';
import LocationSearch from './LocationSearch';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const robotIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 0 10px rgba(59,130,246,0.8)"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destIcon = new L.DivIcon({
  html: `<div style="background:#10b981;border:3px solid #fff;border-radius:4px;width:16px;height:16px;transform:rotate(45deg);box-shadow:0 0 8px rgba(16,185,129,0.8)"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const previewIcon = new L.DivIcon({
  html: `<div style="background:#f59e0b;border:3px solid #fff;border-radius:4px;width:16px;height:16px;transform:rotate(45deg);box-shadow:0 0 8px rgba(245,158,11,0.8)"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyToLocation({ center }) {
  const map = useMap();
  const prev = React.useRef(null);
  useEffect(() => {
    if (!center || (prev.current && prev.current[0] === center[0] && prev.current[1] === center[1])) return;
    map.flyTo(center, 17, { animate: true, duration: 1.5 });
    prev.current = center;
  }, [center, map]);
  return null;
}

function StatCard({ icon: Icon, label, value, color, unit = '' }) {
  return (
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
      <div style={{ background: `${color}22`, borderRadius: '10px', padding: '10px' }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}{unit}</div>
      </div>
    </div>
  );
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Dashboard({ mqttClient }) {
  const robotState = useStore(state => state.robotState);
  const presets = useStore(state => state.presets);
  const sysSettings = useStore(state => state.sysSettings) || {};
  
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [destName, setDestName] = useState('');
  const [destination, setDestination] = useState(null);
  const [previewLocation, setPreviewLocation] = useState(null);
  const [prevStatus, setPrevStatus] = useState(null);
  const [prevObstacle, setPrevObstacle] = useState(false);
  const [trail, setTrail] = useState([]);

  const isBusy = robotState.status === 'Moving' || robotState.status === 'In Progress';

  const center = [
    robotState.lat && robotState.lat !== 0 ? robotState.lat : 12.9716,
    robotState.lng && robotState.lng !== 0 ? robotState.lng : 77.5946
  ];

  // Build movement trail
  useEffect(() => {
    if (robotState.lat && robotState.lng) {
      setTrail(prev => {
        const last = prev[prev.length - 1];
        if (last && last[0] === robotState.lat && last[1] === robotState.lng) return prev;
        return [...prev.slice(-49), [robotState.lat, robotState.lng]];
      });
    }
  }, [robotState.lat, robotState.lng]);

  // Toast on status change
  useEffect(() => {
    if (!prevStatus || prevStatus === robotState.status) { setPrevStatus(robotState.status); return; }
    setPrevStatus(robotState.status);
    if (robotState.status === 'Moving')   toast('🤖 Robot is now moving!', 'info');
    if (robotState.status === 'Stopped')  toast('⏹ Robot stopped.', 'warning');
    if (robotState.status === 'Arrived')  toast('📍 Robot arrived! Generate OTP.', 'success');
    if (robotState.status === 'Delivered') toast('🎉 Package delivered!', 'success');
    if (robotState.battery < 20 && robotState.battery > 0) toast('🔋 Low battery warning!', 'warning');
  }, [robotState.status]);

  // Toast on obstacle change
  useEffect(() => {
    if (robotState.obstacle && !prevObstacle) {
      toast('🚨 OBSTACLE DETECTED! Robot paused.', 'error');
    }
    setPrevObstacle(robotState.obstacle);
  }, [robotState.obstacle]);

  const sendCommand = (cmd, payload = {}) => {
    api.post('/robot/command', { command: cmd, payload })
      .catch(() => toast('Command failed — is backend running?', 'error'));
  };

  const handleStart = () => { sendCommand('start'); toast('▶ Start command sent', 'success'); };
  const handleStop  = () => { sendCommand('stop');  toast('⏹ Stop command sent', 'warning'); };
  const handleEStop = () => { 
    if (sysSettings?.eStopConfirmation && !window.confirm('🛑 Emergency Stop requested. Are you sure?')) return;
    sendCommand('emergency_stop'); 
    toast('🛑 Emergency Stop!', 'error'); 
  };
  const handleManual = (dir) => {
    if (sysSettings?.manualControlEnabled === false) return;
    sendCommand('manual', { direction: dir });
  };
  
  const handleReturnToBase = () => {
    const lat = sysSettings?.defaultDeliveryLat || 12.9716;
    const lng = sysSettings?.defaultDeliveryLng || 77.5946;
    sendCommand('destination', { lat, lng });
    setDestination([lat, lng]);
    toast(`📍 Returning to base: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
  };

  const handleLocationSelect = ({ lat, lng, name }) => {
    setDestLat(lat);
    setDestLng(lng);
    setDestName(name ? name.split(',').slice(0,2).join(',') : 'Map Selection');
    setPreviewLocation([lat, lng]);
  };

  const handleMapClick = (lat, lng) => {
    setDestLat(lat);
    setDestLng(lng);
    setDestName('Map Pin');
    setPreviewLocation([lat, lng]);
    toast(`📍 Pinned on map: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'info');
  };

  const handlePresetSelect = (e) => {
    const val = e.target.value;
    if (!val) return;
    const loc = presets[parseInt(val)];
    setDestLat(loc.lat);
    setDestLng(loc.lng);
    setDestName(loc.name);
    setPreviewLocation([loc.lat, loc.lng]);
  };

  const handleSendDest = (e) => {
    e.preventDefault();
    const lat = parseFloat(destLat), lng = parseFloat(destLng);
    if (!lat || !lng) { toast('Please search and select a location first', 'error'); return; }
    sendCommand('destination', { lat, lng });
    setDestination([lat, lng]);
    setPreviewLocation(null); // Clear preview since it's now the actual destination
    toast(`📍 Destination set: ${destName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}`, 'success');
    setDestLat(''); setDestLng(''); setDestName('');
  };

  const getBatteryColor = () => robotState.battery > 50 ? 'var(--success)' : robotState.battery > 20 ? 'var(--warning)' : 'var(--danger)';
  const getStatusColor = () => {
    const s = robotState.status?.toLowerCase();
    if (s === 'moving') return 'var(--accent-primary)';
    if (s === 'arrived') return 'var(--warning)';
    if (s === 'delivered') return 'var(--success)';
    return 'var(--danger)';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Live Dashboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Real-time robot tracking and control</p>
        </div>
      </div>

      {robotState.obstacle && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <AlertTriangle color="var(--danger)" size={24} style={{ animation: 'pulse 1s infinite' }} />
          <div>
            <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '15px' }}>🚨 OBSTACLE DETECTED</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>The robot's sensors have detected an obstacle in its path and it has paused automatically.</p>
          </div>
        </div>
      )}

      {isBusy && !robotState.obstacle && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <AlertTriangle color="var(--warning)" size={24} />
          <div>
            <h3 style={{ margin: 0, color: 'var(--warning)', fontSize: '15px' }}>Robot is Busy</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>The robot is currently executing a delivery or moving to a destination. Manual controls are disabled.</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={Cpu}      label="Status"   value={robotState.status || 'Stopped'} color={getStatusColor()} />
        <StatCard icon={Battery}  label="Battery"  value={robotState.battery?.toFixed(0) || 100} unit="%" color={getBatteryColor()} />
        <StatCard icon={Wifi}     label="WiFi"     value={robotState.wifi || 100} unit="%" color="var(--success)" />
        <StatCard icon={MapPin}   label="Position" value={`${(robotState.lat||12.9716).toFixed(4)}, ${(robotState.lng||77.5946).toFixed(4)}`} color="var(--accent-primary)" />
      </div>

      <div className="grid-2">
        {/* Map */}
        <div className="glass-panel" style={{ height: '480px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={16} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Live GPS Tracking</span>
          </div>
          <MapContainer center={center} zoom={16} style={{ height: 'calc(100% - 50px)', width: '100%' }}>
            <TileLayer
              attribution=''
              url={sysSettings?.mapType === 'Street' 
                ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}
            />
            {/* Robot position */}
            <Marker position={center} icon={robotIcon}>
              <Popup>
                <strong>Robot</strong><br />
                Lat: {center[0].toFixed(6)}<br />
                Lng: {center[1].toFixed(6)}<br />
                Battery: {robotState.battery?.toFixed(0)}%
              </Popup>
            </Marker>
            {/* Destination */}
            {destination && <Marker position={destination} icon={destIcon}><Popup>Active Destination</Popup></Marker>}
            {/* Preview Selected Location */}
            {previewLocation && <Marker position={previewLocation} icon={previewIcon}><Popup>Preview: {destName}</Popup></Marker>}
            {/* Route trail */}
            {trail.length > 1 && sysSettings?.showRouteHistory !== false && (
              <Polyline positions={trail} color="#3b82f6" weight={3} opacity={0.7} dashArray="6,4" />
            )}
            <FlyToLocation center={previewLocation || center} />
            <MapClickHandler onLocationSelect={handleMapClick} />
          </MapContainer>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Quick controls */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>🎮 Quick Controls</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button className="btn btn-success" onClick={handleStart} style={{ padding: '12px' }} disabled={isBusy || robotState.status === 'Moving'}>
                <Play size={16} /> Start
              </button>
              <button className="btn" onClick={handleStop} style={{ padding: '12px', background: 'var(--warning)' }} disabled={!isBusy && robotState.status !== 'Moving'}>
                <Square size={16} /> Stop
              </button>
              <button className="btn btn-danger" onClick={handleEStop} style={{ padding: '12px' }}>
                <AlertTriangle size={16} /> E-Stop
              </button>
            </div>
          </div>

          {/* D-Pad */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>🕹 Manual Drive</h3>
            <div className="d-pad" style={{ opacity: sysSettings?.manualControlEnabled === false ? 0.5 : 1 }}>
              <button className="d-pad-btn d-up"    onMouseDown={() => handleManual('forward')}  onMouseUp={() => handleManual('stop')} title="Forward" disabled={isBusy || sysSettings?.manualControlEnabled === false}>▲</button>
              <button className="d-pad-btn d-left"  onMouseDown={() => handleManual('left')}     onMouseUp={() => handleManual('stop')} title="Left" disabled={isBusy || sysSettings?.manualControlEnabled === false}>◀</button>
              <button className="d-pad-btn d-right" onMouseDown={() => handleManual('right')}    onMouseUp={() => handleManual('stop')} title="Right" disabled={isBusy || sysSettings?.manualControlEnabled === false}>▶</button>
              <button className="d-pad-btn d-down"  onMouseDown={() => handleManual('backward')} onMouseUp={() => handleManual('stop')} title="Backward" disabled={isBusy || sysSettings?.manualControlEnabled === false}>▼</button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              {sysSettings?.manualControlEnabled === false ? 'Manual control disabled in settings' : 'Hold a button to move'}
            </p>
          </div>

          {/* Destination input */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '16px', fontSize: '15px', display: 'flex', justifyContent: 'space-between' }}>
              <span>📍 Set Destination</span>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={handleReturnToBase} disabled={isBusy}>
                🏠 Return Base
              </button>
            </h3>
            
            <div style={{ marginBottom: '12px' }}>
              <select className="input-field" onChange={handlePresetSelect} defaultValue="">
                <option value="" disabled>Select Campus Preset...</option>
                {presets.map((loc, i) => (
                  <option key={i} value={i}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>— OR —</div>

            <form onSubmit={handleSendDest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <LocationSearch
                placeholder="Search globally or click on map…"
                onSelect={handleLocationSelect}
              />
              {destLat && destLng && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '6px 10px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px' }}>
                  📌 {parseFloat(destLat).toFixed(5)}, {parseFloat(destLng).toFixed(5)} {destName && `(${destName})`}
                </div>
              )}
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={isBusy}>
                <Navigation size={16} /> Send to Robot
              </button>
            </form>
            {destination && (
              <p style={{ fontSize: '12px', marginTop: '10px', color: 'var(--success)' }}>
                ✅ Target: {destination[0].toFixed(4)}, {destination[1].toFixed(4)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

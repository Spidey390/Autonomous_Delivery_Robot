import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, List, LogOut, Wifi, Battery, Activity, MapPin, Users, UserCircle, Settings, PieChart } from 'lucide-react';
import useStore from '../store/useStore';

export default function Layout({ mqttClient }) {
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const robotState = useStore(state => state.robotState);

  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'moving': return 'status-moving';
      case 'stopped': return 'status-stopped';
      case 'delivering': return 'status-delivering';
      case 'arrived': return 'status-arrived';
      default: return 'status-stopped';
    }
  };

  return (
    <>
      <div className="ambient-bg"></div>
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
          <Activity color="var(--accent-primary)" size={28} />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '1px' }}>AeroBot<span style={{color: 'var(--accent-primary)'}}>.OS</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/deliveries" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <List size={20} /> Deliveries
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <PieChart size={20} /> Analytics
          </NavLink>
          <NavLink to="/presets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <MapPin size={20} /> Campus Locations
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/staff" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} /> Staff Access
            </NavLink>
          )}
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} /> System Settings
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className={`status-badge ${getStatusClass(robotState.status)}`}>
              STATUS: {robotState.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <UserCircle size={20} color={user?.role === 'admin' ? 'var(--danger)' : 'var(--accent-primary)'} />
              <span style={{ textTransform: 'capitalize', fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username} ({user?.role})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Battery size={20} color={robotState.battery > 20 ? 'var(--success)' : 'var(--danger)'} />
              <span>{robotState.battery}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Wifi size={20} color={robotState.wifi > 50 ? 'var(--success)' : 'var(--warning)'} />
              <span>{robotState.wifi}%</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
    </>
  );
}

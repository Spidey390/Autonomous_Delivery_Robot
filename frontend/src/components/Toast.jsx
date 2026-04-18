import React, { useState, useCallback } from 'react';

// Simple context-free Toast system using module-level state
let listeners = [];

export function toast(message, type = 'info') {
  const id = Date.now();
  const event = { id, message, type };
  listeners.forEach(fn => fn(event));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  React.useEffect(() => {
    const handler = (event) => {
      setToasts(prev => [...prev, event]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== event.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter(fn => fn !== handler);
    };
  }, []);

  const typeStyles = {
    success: { background: 'linear-gradient(135deg,#10b981,#059669)', icon: '✅' },
    error:   { background: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '❌' },
    warning: { background: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '⚠️' },
    info:    { background: 'linear-gradient(135deg,#3b82f6,#2563eb)', icon: '📡' },
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {toasts.map(t => {
        const s = typeStyles[t.type] || typeStyles.info;
        return (
          <div key={t.id} style={{
            background: s.background, color: '#fff', padding: '14px 20px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '10px', minWidth: '280px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease',
            fontWeight: 500, fontSize: '14px'
          }}>
            <span style={{ fontSize: '18px' }}>{s.icon}</span>
            {t.message}
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

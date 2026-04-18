import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader } from 'lucide-react';

// Uses OpenStreetMap Nominatim — free, no API key needed
export default function LocationSearch({ onSelect, placeholder = 'Search location...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q) => {
    if (!q || q.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`)
      .then(r => r.json())
      .then(data => {
        setResults(data);
        setOpen(data.length > 0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 500); // 500ms debounce
  };

  const handleSelect = (item) => {
    setQuery(item.display_name.split(',').slice(0, 2).join(','));
    setOpen(false);
    onSelect({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      name: item.display_name
    });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        {loading && <Loader size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />}
        <input
          type="text"
          className="input-field"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ paddingLeft: '40px', paddingRight: '36px' }}
        />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
          background: '#1e293b', border: '1px solid var(--border-color)',
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
        }}>
          {results.map((item, i) => (
            <div
              key={item.place_id}
              onClick={() => handleSelect(item)}
              style={{
                padding: '12px 16px', cursor: 'pointer', fontSize: '13px',
                borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {item.display_name.split(',')[0]}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                {item.display_name.split(',').slice(1, 4).join(',')} · {parseFloat(item.lat).toFixed(4)}, {parseFloat(item.lon).toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from{transform:translateY(-50%) rotate(0deg)} to{transform:translateY(-50%) rotate(360deg)} }`}</style>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useStore from '../store/useStore';
import { toast } from './Toast';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Battery, CheckCircle, Clock, Calendar, AlertTriangle } from 'lucide-react';

export default function AnalyticsDashboard() {
  const token = useStore(state => state.token);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState('30d'); // 'today', '7d', '30d'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 30 seconds for real-time feel
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/analytics?timeRange=${timeRange}`);
      setData(res.data);
    } catch {
      toast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Analytics...</div>;

  return (
    <div className="analytics-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={24} color="var(--accent-primary)" /> Performance Analytics
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Monitor robot efficiency and delivery metrics</p>
        </div>
        
        <select 
          className="input-field" 
          style={{ width: '200px' }} 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px' }}>
            <Activity size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Total Deliveries</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.totalDeliveries}</div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
            <CheckCircle size={24} color="var(--success)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Success Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.successRate.toFixed(1)}%</div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px' }}>
            <Clock size={24} color="var(--warning)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Avg Delivery Time</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.averageDeliveryTime.toFixed(1)} min</div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px' }}>
            <Battery size={24} color="var(--danger)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Avg Battery Used</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.averageBatteryUsed.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="glass-panel">
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Deliveries Per Day
          </h3>
          {data.deliveriesPerDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.deliveriesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No delivery data available for this period.</div>
          )}
        </div>

        <div className="glass-panel">
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Battery size={18} /> Battery Usage Trend
          </h3>
          {data.batteryTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.batteryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="batteryUsed" stroke="var(--danger)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No battery data available for this period.</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid-2">
        <div className="glass-panel">
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} /> Success vs Failure
          </h3>
          {data.totalDeliveries > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No delivery data available for this period.</div>
          )}
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> System Efficiency Note
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            This dashboard aggregates telemetry and logistics data to calculate operational efficiency. 
            Battery usage is computed by capturing state at `In Progress` vs `Delivered`.
            Time is measured strictly from departure to successful unlock or failure.
          </p>
          <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Efficiency Score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${data.successRate}%`, height: '100%', background: 'linear-gradient(90deg, var(--warning), var(--success))' }}></div>
              </div>
              <span style={{ fontWeight: 'bold' }}>{data.successRate >= 90 ? 'A+' : data.successRate >= 75 ? 'B' : 'C'}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

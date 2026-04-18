import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import mqtt from 'mqtt';
import axios from 'axios';
import useStore from './store/useStore';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import DeliveryManager from './components/DeliveryManager';
import PresetsManager from './components/PresetsManager';
import StaffManager from './components/StaffManager';
import SettingsManager from './components/SettingsManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ToastContainer, { toast } from './components/Toast';

function App() {
  const token = useStore((state) => state.token);
  const setRobotState = useStore((state) => state.setRobotState);
  const setPresets = useStore((state) => state.setPresets);
  const setSysSettings = useStore((state) => state.setSysSettings);
  const [mqttClient, setMqttClient] = useState(null);

  // Fetch presets and settings on load
  useEffect(() => {
    if (token) {
      axios.get('http://localhost:5000/api/presets').then(res => setPresets(res.data)).catch(console.error);
      axios.get('http://localhost:5000/api/settings').then(res => setSysSettings(res.data)).catch(console.error);
    }
  }, [token, setPresets, setSysSettings]);

  useEffect(() => {
    if (!token) return;

    // Connect to public HiveMQ WebSocket Broker (Port 8884)
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
      clientId: `web_${Math.random().toString(16).slice(2, 8)}`,
      reconnectPeriod: 3000,
    });

    client.on('connect', () => {
      client.subscribe('robot/telemetry');
      client.subscribe('robot/status');
      toast('📡 Connected to robot broker', 'success');
    });

    let errorShown = false;
    client.on('reconnect', () => {
      if (!errorShown) { toast('🔄 Connecting to broker…', 'warning'); errorShown = true; }
    });
    client.on('error', () => {
      if (!errorShown) { toast('⚠️ MQTT broker unreachable — retrying…', 'error'); errorShown = true; }
    });
    client.on('connect', () => { errorShown = false; });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === 'robot/telemetry') {
          setRobotState(data);
        }
        if (topic === 'robot/status') {
          if (data.status) setRobotState({ status: data.status });
          if (data.status === 'Arrived') toast('📍 Robot arrived at destination!', 'success');
          if (data.status === 'Delivered') toast('🎉 Package delivered!', 'success');
        }
      } catch (_) { /* ignore */ }
    });

    setMqttClient(client);
    return () => client.end();
  }, [token, setRobotState]);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={token ? <Layout mqttClient={mqttClient} /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard mqttClient={mqttClient} />} />
            <Route path="deliveries" element={<DeliveryManager />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="presets" element={<PresetsManager />} />
            <Route path="settings" element={<SettingsManager />} />
            <Route path="staff" element={<StaffManager />} />
          </Route>
        </Routes>
      </Router>
      <ToastContainer />
    </>
  );
}

export default App;

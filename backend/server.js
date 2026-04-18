require('dotenv').config();
require('./validateEnv');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const net = require('net');
const mqtt = require('mqtt');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const User = require('./models/User');
const Delivery = require('./models/Delivery');
const RobotState = require('./models/RobotState');
const LocationPreset = require('./models/LocationPreset');
const RobotSettings = require('./models/RobotSettings');

const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const { validate, loginRules, userRules, deliveryRules, presetRules, otpRules, commandRules } = require('./middleware/validation');
const { body, param } = require('express-validator');
const { generalLimiter, authLimiter, otpLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const app = express();

// Create logs directory
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Request logging
const morgan = require('morgan');
const morganJson = {
  write: (str) => logger.http(str.trim()),
};
app.use(morgan('combined', { stream: morganJson }));
app.use(cors());
app.use(express.json());
app.use(generalLimiter);

const PORT = parseInt(process.env.PORT) || 5000;
const MQTT_PORT = parseInt(process.env.MQTT_PORT) || 1883;
const MQTT_WS_PORT = parseInt(process.env.MQTT_WS_PORT) || 8883;

// ─── External Cloud MQTT Broker (Render Compatible) ─────────────────────────

const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');

mqttClient.on('connect', () => {
  console.log('✅ Connected to Public HiveMQ Cloud Broker');
  mqttClient.subscribe('robot/telemetry');
});

mqttClient.on('error', (err) => {
  console.log('❌ MQTT Connection Error:', err);
});

mqttClient.on('message', async (topic, message) => {
  if (topic === 'robot/telemetry') {
    try {
      const data = JSON.parse(message.toString());
      let state = await RobotState.findOne();
      if (!state) state = new RobotState();
      if (data.lat !== undefined) state.lat = data.lat;
      if (data.lng !== undefined) state.lng = data.lng;
      if (data.battery !== undefined) state.battery = data.battery;
      if (data.status !== undefined) state.status = data.status;
      if (data.wifi !== undefined) state.wifi = data.wifi;
      if (data.obstacle !== undefined) state.obstacle = data.obstacle;
      state.lastUpdated = Date.now();
      await state.save();
    } catch (e) { /* non-JSON or DB error */ }
  }
});

// Helper for publishing
const publishMqtt = (topic, payload) => {
  if (mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(payload));
  }
};

// ─── MongoDB ──────────────────────────────────────────────────────────────────

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      const hashed = await bcrypt.hash('admin123', 10);
      await User.create({ username: 'admin', password: hashed, role: 'admin' });
      console.log('🔑 Default admin: admin / admin123');
    }
    
    const presetCount = await LocationPreset.countDocuments();
    if (presetCount === 0) {
      await LocationPreset.insertMany([
        { name: 'Main Gate', lat: 12.8400, lng: 80.1530 },
        { name: 'CS Department', lat: 12.8402, lng: 80.1534 },
        { name: 'ECE Department', lat: 12.8405, lng: 80.1538 },
        { name: 'Library', lat: 12.8410, lng: 80.1542 },
        { name: 'Hostel', lat: 12.8395, lng: 80.1525 }
      ]);
      console.log('📍 Default campus presets created');
    }
    
    // Init default settings if they don't exist
    const settingsCount = await RobotSettings.countDocuments();
    if (settingsCount === 0) {
      await RobotSettings.create({});
      console.log('⚙️ Default robot settings created');
    }
  })
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── REST APIs ────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.post('/api/auth/login', authLimiter, validate(loginRules()), async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    logger.info(`User logged in: ${username}`);
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users/Staff Management (Admin only)
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ role: 1, username: 1 });
    res.json(users);
  } catch (err) {
    logger.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', authMiddleware, validate(userRules()), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, role: role || 'staff' });
    logger.info(`User created: ${username}`);
    res.json({ _id: user._id, username: user.username, role: user.role });
  } catch (err) {
    logger.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', authMiddleware, validate([body('password').optional().isLength({ min: 6 }), body('role').optional().isIn(['admin', 'staff'])]), async (req, res) => {
  try {
    const { password, role } = req.body;
    const update = { role };
    if (password) update.password = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ _id: user._id, username: user.username, role: user.role });
  } catch (err) {
    logger.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user.username === 'admin') return res.status(400).json({ error: 'Cannot delete main admin' });
    await User.findByIdAndDelete(req.params.id);
    logger.info(`User deleted: ${user.username}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Robot State
app.get('/api/robot/state', authMiddleware, async (req, res) => {
  try {
    let state = await RobotState.findOne();
    if (!state) state = await RobotState.create({ lat: 12.9716, lng: 77.5946, battery: 100, status: 'Stopped', wifi: 100, obstacle: false });
    res.json(state);
  } catch (err) {
    logger.error('Get robot state error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Deliveries
app.get('/api/deliveries', authMiddleware, async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    logger.error('Get deliveries error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/deliveries', authMiddleware, validate(deliveryRules()), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const deliveryId = `DEL-${Date.now().toString().slice(-6)}`;
    const delivery = new Delivery({ deliveryId, destination: { lat, lng }, status: 'Pending' });
    await delivery.save();
    logger.info(`Delivery created: ${deliveryId}`);
    res.json(delivery);
  } catch (err) {
    logger.error('Create delivery error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/deliveries/history', authMiddleware, async (req, res) => {
  try {
    await Delivery.deleteMany({});
    logger.info('Delivery history cleared');
    res.json({ success: true, message: 'History cleared' });
  } catch (err) {
    logger.error('Clear history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Presets ---
app.get('/api/presets', authMiddleware, async (req, res) => {
  try {
    const presets = await LocationPreset.find().sort({ name: 1 });
    res.json(presets);
  } catch (err) {
    logger.error('Get presets error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/presets', authMiddleware, validate(presetRules()), async (req, res) => {
  try {
    const { name, lat, lng } = req.body;
    const preset = new LocationPreset({ name, lat, lng });
    await preset.save();
    logger.info(`Preset created: ${name}`);
    res.json(preset);
  } catch (err) {
    logger.error('Create preset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/presets/:id', authMiddleware, validate(presetRules()), async (req, res) => {
  try {
    const { name, lat, lng } = req.body;
    const preset = await LocationPreset.findByIdAndUpdate(req.params.id, { name, lat, lng }, { new: true });
    res.json(preset);
  } catch (err) {
    logger.error('Update preset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/presets/:id', authMiddleware, async (req, res) => {
  try {
    await LocationPreset.findByIdAndDelete(req.params.id);
    logger.info(`Preset deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete preset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update delivery status
app.patch('/api/deliveries/:deliveryId/status', authMiddleware, validate([param('deliveryId').notEmpty(), body('status').isIn(['Pending', 'In Progress', 'Arrived', 'Delivered', 'Failed'])]), async (req, res) => {
  const { deliveryId } = req.params;
  const { status } = req.body;
  try {
    let updateFields = { status };

    if (status === 'In Progress') {
      const state = await RobotState.findOne() || { battery: 100 };
      updateFields.startTime = new Date();
      updateFields.startBattery = state.battery;
    }

    if (status === 'Failed') {
      const state = await RobotState.findOne() || { battery: 100 };
      const delivery = await Delivery.findOne({ deliveryId });
      updateFields.endTime = new Date();
      if (delivery && delivery.startBattery) {
        updateFields.batteryUsed = delivery.startBattery - state.battery;
      }
    }

    const delivery = await Delivery.findOneAndUpdate(
      { deliveryId },
      updateFields,
      { new: true }
    );
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    res.json(delivery);
  } catch (err) {
    logger.error('Update delivery status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Robot command
app.post('/api/robot/command', authMiddleware, validate(commandRules()), async (req, res) => {
  const { command, payload } = req.body;
  try {
    publishMqtt('robot/command', { command, ...payload });
    logger.info(`Command sent: ${command}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Send command error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// OTP Generate
app.post('/api/otp/generate', otpLimiter, authMiddleware, validate(otpRules()), async (req, res) => {
  const { deliveryId } = req.body;
  try {
    const delivery = await Delivery.findOne({ deliveryId });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    let settings = await RobotSettings.findOne();
    const expirySeconds = settings ? settings.otpExpiryTime : 60;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    delivery.otp = otp;
    delivery.otpExpiry = new Date(Date.now() + expirySeconds * 1000);
    delivery.status = 'Arrived';
    await delivery.save();
    logger.info(`OTP generated for delivery: ${deliveryId}`);
    publishMqtt('robot/status', { status: 'Arrived', message: 'OTP Generated' });
    res.json({ success: true, otp });
  } catch (err) {
    logger.error('Generate OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// OTP Verify
app.post('/api/otp/verify', otpLimiter, authMiddleware, validate(otpRules()), async (req, res) => {
  const { deliveryId, otp } = req.body;
  try {
    const delivery = await Delivery.findOne({ deliveryId });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    let settings = await RobotSettings.findOne();
    const isBypass = (settings && settings.otpEnabled === false && otp === 'BYPASS');

    if (!isBypass) {
      if (delivery.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
      if (new Date() > delivery.otpExpiry) return res.status(400).json({ error: 'OTP Expired' });
    }

    delivery.status = 'Delivered';
    delivery.endTime = new Date();

    const state = await RobotState.findOne() || { battery: 100 };
    if (delivery.startBattery) {
      delivery.batteryUsed = Math.max(0, delivery.startBattery - state.battery);
    }

    await delivery.save();
    logger.info(`OTP verified for delivery: ${deliveryId}`);
    publishMqtt('robot/unlock', { deliveryId, unlock: true });
    res.json({ success: true, message: 'Box Unlocked ✅' });
  } catch (err) {
    logger.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Settings Management
app.get('/api/settings', authMiddleware, async (req, res) => {
  try {
    let settings = await RobotSettings.findOne();
    if (!settings) settings = await RobotSettings.create({});
    res.json(settings);
  } catch (err) {
    logger.error('Get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/settings', authMiddleware, async (req, res) => {
  try {
    let settings = await RobotSettings.findOne();
    if (!settings) settings = new RobotSettings(req.body);
    else Object.assign(settings, req.body);

    await settings.save();

    // Sync settings to the physical ESP32
    publishMqtt('robot/settings', settings);
    logger.info('Settings updated');

    res.json(settings);
  } catch (err) {
    logger.error('Update settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analytics Endpoint
app.get('/api/analytics', authMiddleware, async (req, res) => {
  try {
    const { timeRange } = req.query;

    let dateFilter = {};
    if (timeRange === 'today') {
      const today = new Date();
      today.setHours(0,0,0,0);
      dateFilter = { createdAt: { $gte: today } };
    } else if (timeRange === '7d') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      dateFilter = { createdAt: { $gte: lastWeek } };
    } else if (timeRange === '30d') {
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      dateFilter = { createdAt: { $gte: lastMonth } };
    }

    const deliveries = await Delivery.find(dateFilter).sort({ createdAt: 1 });

    const completed = deliveries.filter(d => d.status === 'Delivered');
    const failed = deliveries.filter(d => d.status === 'Failed');

    const totalDeliveries = completed.length + failed.length;
    const successRate = totalDeliveries > 0 ? (completed.length / totalDeliveries) * 100 : 100;

    let totalDeliveryTimeMs = 0;
    let totalBatteryUsed = 0;
    let validBatteryCount = 0;

    const batteryTrend = [];
    const deliveriesPerDayMap = {};

    completed.forEach(d => {
      if (d.startTime && d.endTime) {
        totalDeliveryTimeMs += (new Date(d.endTime) - new Date(d.startTime));
      }

      if (d.batteryUsed !== undefined) {
        totalBatteryUsed += d.batteryUsed;
        validBatteryCount++;
        batteryTrend.push({
          deliveryId: d.deliveryId,
          batteryUsed: d.batteryUsed,
          date: new Date(d.createdAt).toLocaleDateString()
        });
      }

      const day = new Date(d.createdAt).toLocaleDateString();
      deliveriesPerDayMap[day] = (deliveriesPerDayMap[day] || 0) + 1;
    });

    const averageDeliveryTime = completed.length > 0 ? (totalDeliveryTimeMs / completed.length) / 60000 : 0;
    const averageBatteryUsed = validBatteryCount > 0 ? (totalBatteryUsed / validBatteryCount) : 0;

    const deliveriesPerDay = Object.keys(deliveriesPerDayMap).map(date => ({
      date,
      count: deliveriesPerDayMap[date]
    }));

    res.json({
      totalDeliveries,
      successRate,
      averageDeliveryTime,
      averageBatteryUsed,
      batteryTrend,
      deliveriesPerDay,
      pieData: [
        { name: 'Successful', value: completed.length, fill: '#10b981' },
        { name: 'Failed', value: failed.length, fill: '#ef4444' }
      ]
    });
  } catch (err) {
    logger.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Express
app.listen(PORT, () => {
  logger.info(`Express REST server on http://localhost:${PORT}`);
  console.log(`✅ Express REST server on http://localhost:${PORT}`);
});

// Error handler must be last
app.use(errorHandler);

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Security Settings
    otpEnabled: { type: Boolean, default: true },
    otpExpiryTime: { type: Number, default: 60 }, // seconds
    otpMaxAttempts: { type: Number, default: 3 },
    sessionTimeout: { type: Number, default: 3600 }, // seconds
    
    // Robot Configuration
    defaultSpeed: { type: Number, default: 50 }, // 0-100
    motorCalibrationLeft: { type: Number, default: 0 },
    motorCalibrationRight: { type: Number, default: 0 },
    servoLockAngle: { type: Number, default: 0 },
    servoUnlockAngle: { type: Number, default: 90 },
    obstacleThreshold: { type: Number, default: 30 }, // cm
    
    // Navigation Settings
    defaultDeliveryLat: { type: Number, default: 12.9716 },
    defaultDeliveryLng: { type: Number, default: 77.5946 },
    autoReturn: { type: Boolean, default: true },
    navigationMode: { type: String, enum: ['GPS', 'Line-follow', 'Hybrid'], default: 'GPS' },
    
    // Power & Battery Settings
    lowBatteryThreshold: { type: Number, default: 20 }, // %
    autoStopLowBattery: { type: Boolean, default: true },
    powerSavingMode: { type: Boolean, default: false },
    
    // Network Settings
    wifiSsid: { type: String, default: 'RobotNet' },
    wifiPassword: { type: String, default: '' },
    backendUrl: { type: String, default: 'http://localhost:5000' },
    retryInterval: { type: Number, default: 5 }, // seconds
    
    // Notification Settings
    notificationsEnabled: { type: Boolean, default: true },
    notifyObstacle: { type: Boolean, default: true },
    notifyBattery: { type: Boolean, default: true },
    notifyDelivery: { type: Boolean, default: true },
    notifyOtp: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    
    // Control Preferences
    manualControlEnabled: { type: Boolean, default: true },
    controlSensitivity: { type: Number, default: 50 }, // 0-100
    eStopConfirmation: { type: Boolean, default: false },
    
    // Map & Tracking Settings
    mapType: { type: String, enum: ['Street', 'Satellite'], default: 'Satellite' },
    locationRefreshRate: { type: Number, default: 2 }, // seconds
    showRouteHistory: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('RobotSettings', settingsSchema);

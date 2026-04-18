const mongoose = require('mongoose');

const robotStateSchema = new mongoose.Schema({
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    battery: { type: Number, default: 100 },
    status: { type: String, default: 'Stopped' }, // Moving, Stopped, Delivering
    wifi: { type: Number, default: 100 },
    obstacle: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RobotState', robotStateSchema);

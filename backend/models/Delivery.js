const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryId: { type: String, required: true, unique: true },
  destination: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: { type: String, default: 'Pending', enum: ['Pending', 'In Progress', 'Arrived', 'Delivered', 'Failed'] },
  otp: { type: String },
  otpExpiry: { type: Date },
  
  // Analytics Fields
  startTime: { type: Date },
  endTime: { type: Date },
  batteryUsed: { type: Number },
  startBattery: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);

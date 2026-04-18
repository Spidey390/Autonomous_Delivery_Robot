const mongoose = require('mongoose');

const presetSchema = new mongoose.Schema({
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('LocationPreset', presetSchema);

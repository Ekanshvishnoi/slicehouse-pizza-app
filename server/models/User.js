const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  addresses: [addressSchema],
  themePreference: { type: String, enum: ['light', 'dark'], default: 'light' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
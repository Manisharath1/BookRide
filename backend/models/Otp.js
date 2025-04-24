const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  // number: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false }
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto delete expired

module.exports = mongoose.model('Otp', otpSchema);

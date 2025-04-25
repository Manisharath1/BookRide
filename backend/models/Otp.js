const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  number: { type: String, required: true },
  verificationId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
  verified: { type: Boolean, default: false },
  code: { type: String }
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto delete expired

module.exports = mongoose.model('Otp', otpSchema);

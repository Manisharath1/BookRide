const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, default: null },
  username: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => v.endsWith('@ils.res.in'),
      message: 'Only emails with ils.res.in domain are allowed'
    }
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // only required if not Google
    }
  },
  number: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    unique: true,
    sparse: true // allows multiple null values
  },
  role: {
    type: String,
    enum: ['user', 'manager'],
    required: function () {
      return !this.googleId;
    },
    default: 'user'
  }
});

module.exports = mongoose.model('User', userSchema);

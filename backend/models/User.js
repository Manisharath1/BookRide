const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "manager"], required: true },
  number: {type: String, required: false, unique: true  },
  email: {type:String, required: true, unique:true, validate: {
    validator: function(email) {
      return email.endsWith('@ils.res.in');
    },
    message: 'Only emails with ils.res.in domain are allowed'
  }},
  createdAt: {
    type: Date,
    default: Date.now
  },
  googleId: {
    type: String
  },
});

module.exports = mongoose.model("User", userSchema);
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "manager", "security"], required: true },
  number: {type: String, required: false, unique: true  }
});

module.exports = mongoose.model("User", userSchema);
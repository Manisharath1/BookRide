const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true, unique: true },
  status: { type: String, enum: ["available", "assigned", "in service"], default: "available" },
  vehicleID:{type:String, required:true, unique:true},
  driverName: {type:String, required: true},
  imagePath: { type: String },
  driverNumber: {type:String, required: true}
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
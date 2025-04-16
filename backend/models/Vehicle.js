const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true, unique: true },
  status: { type: String, enum: ["available", "assigned", "in service"], default: "available" },
  vehicleID:{type:String, required:true, unique:true},
  driverName: {type:String, required: true},
  imagePath: { type: String },
  driverNumber: {type:String, required: true},
  chassisNumber: { type: String, required: true, match: /^[a-zA-Z0-9-]+$/ },
  insuranceDetails: {
    // policyNumber: { type: String },
    provider: { type: String },
    validFrom: { type: Date },
    validTill: { type: Date }
  },
  mvTaxPeriod: {
    from: { type: Date },
    to: { type: Date }
  },
  pollutionClearance: {
    validFrom: { type: Date },
    validTill: { type: Date }
  },
  rcValidity: { type: Date }
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
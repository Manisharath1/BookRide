const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  // User and Guest Information
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: function() {
      // userId is required only if it's not a guest booking
      return !this.isGuestBooking;
    }
  },
  isGuestBooking: {
    type: Boolean,
    default: false
  },
  guestName: {
    type: String,
    required: function() {
      return this.isGuestBooking;
    },
    trim: true
  },
  guestPhone: {
    type: String,
    required: function() {
      return this.isGuestBooking;
    },
    trim: true,
    validate: {
      validator: function(v) {
        // Basic phone validation - can be customized based on your needs
        return !this.isGuestBooking || /^\+?[\d\s-]{10,}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  scheduledAt: { type: Date },

  // Booking Details
  location: { 
    type: String, 
    required: true,
    trim: true 
  },
  status: { 
    type: String, 
    enum: ["pending", "approved", "completed", "cancelled", "merged"], 
    default: "pending",
    index: true // Add index for faster queries on status
  },
  reason: { 
    type: String,
    trim: true
  },
  notes: { 
    type: String 
  },

  mergedFrom: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
  ],

  mergedInto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    default: null,
  },

  mergedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming you have a User model
    default: null,
  },

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false 
  },
  // Driver and Vehicle Information
  driverName: { 
    type: String,
    trim: true 
  },
  driverNumber: { 
    type: String,
    trim: true 
  },
  vehicleName: { 
    type: String,
    trim: true,
    ref: "Vehicle"
  },
  vehicleNumber: { 
    type: String,
    trim: true 
  },
  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Vehicle" 
  },

  // Timestamps
  approvedAt: Date,
  completedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});


// Add indexes for common queries
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ vehicleId: 1 });

// Add a method to check if a booking can be approved
bookingSchema.methods.canBeApproved = function() {
  return this.status === "pending";
};

// Add a method to check if a booking can be completed
bookingSchema.methods.canBeCompleted = function() {
  return this.status === "approved" || this.status === "in";
};

module.exports = mongoose.model("Booking", bookingSchema);
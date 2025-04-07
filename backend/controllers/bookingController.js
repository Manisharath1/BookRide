const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const User  = require("../models/User");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

// ✅ Create a new booking
const createBooking = async (req, res) => {
  try {
    const { location, vehicleId, reason  } = req.body;
    
    if (!location || !vehicleId) {
      return res.status(400).json({ message: 'Location and reason are required' });
    }
    
    // Find the vehicle to get its details
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // Create booking with all vehicle details
    const newBooking = new Booking({
      userId: req.userId,
      vehicleId: vehicleId,
      vehicleName: vehicle.name,
      vehicleNumber: vehicle.number,
      driverName: vehicle.driverName,
      driverNumber: vehicle.driverNumber,
      location: location,
      reason: reason,
      status: 'pending'
    });
    
    const savedBooking = await newBooking.save();
    
    // Update vehicle status
    await Vehicle.findByIdAndUpdate(vehicleId, { status: 'pending' });
    
    res.status(201).json(savedBooking);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: err.message });
  }
};

//guest booking
const guestBooking = async (req, res) => {
  if (req.role !== 'manager') {
    return res.status(403).json({ 
      error: "Access denied. Only managers can create guest bookings" 
    });
  };

  const { 
    location, 
    guestName, 
    guestPhone,
    vehicleId,
    driverName, 
    driverNumber, 
    notes
  } = req.body;
  
  // Validate required fields
  if (!location) {
    return res.status(400).json({ error: "Location is required" });
  }

  // For guest bookings, name and phone are required
  if (!guestName || !guestPhone) {
    return res.status(400).json({ 
      error: "Guest name and phone are required for guest bookings" 
    });
  }

  if(!driverName || !driverNumber) {
      return res.status(400).json({ 
        error: "Driver's name and phone are required for guest bookings" 
      });
    }

  // Validate vehicleId is provided
  if (!vehicleId) {
    return res.status(400).json({ 
      error: "Vehicle selection is required" 
    });
  }

  // Basic phone validation
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  if (!phoneRegex.test(guestPhone)) {
    return res.status(400).json({ 
      error: "Please provide a valid phone number" 
    });
  }

  try {
    // Check if vehicle is available
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.status !== 'available') {
      return res.status(400).json({ 
        error: "Selected vehicle is not available" 
      });
    }
    
    const booking = new Booking({
      location,
      status: "approved",
      isGuestBooking: true,
      guestName,
      guestPhone,
      vehicleId,
      driverName, 
      driverNumber,
      notes: notes || '', // Optional notes
      createdBy: req.userId  
    });

    // Update vehicle status
    vehicle.status = 'assigned';
    await vehicle.save();

    await booking.save();
    
    res.status(201).json({ 
      message: "Booking request created successfully", 
      booking 
    });
  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({ 
      error: "Failed to create booking",
      details: err.message 
    });
  }
};

// Get all pending bookings with optional filters
const getPendingBookings = async (req, res) => {
  try {
     // Check if user is authenticated
     if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    // Get the user to check their role
    const user = await User.findById(req.userId);

    // Check if user is a manager
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Only managers can view all bookings.' });
    }

    const bookings = await Booking.find({ status: "pending" })
      .populate('userId', 'username') 
      .sort({ createdAt: -1 }); // Most recent first
    
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching pending bookings:", err);
    res.status(500).json({ 
      error: "Failed to fetch pending bookings",
      details: err.message 
    });
  }
};

const approveBooking = async (req, res) => {
  const { 
    bookingId, 
    driverName, 
    driverNumber, 
    vehicleId
  } = req.body;

  // Validate required fields
  if (!bookingId || !driverName || !driverNumber || !vehicleId) {
    return res.status(400).json({ 
      error: "All fields are required for approval" 
    });
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(bookingId) || 
      !mongoose.Types.ObjectId.isValid(vehicleId)) {
    return res.status(400).json({ 
      error: "Invalid booking or vehicle ID format" 
    });
  }

  try {
    // Use session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        throw new Error("Booking not found");
      }

      const vehicle = await Vehicle.findById(vehicleId).session(session);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }

      if (vehicle.status === "assigned") {
        throw new Error("Vehicle is already assigned to another booking");
      }

      // Update booking
      booking.driverName = driverName;
      booking.driverNumber = driverNumber;
      booking.vehicleName = vehicle.name;
      booking.vehicleNumber = vehicle.number;
      booking.vehicleId = vehicle._id;
      booking.status = "approved";
      booking.approvedAt = new Date();

      await booking.save({ session });

      // Update vehicle
      vehicle.status = "assigned";
      await vehicle.save({ session });

      // Commit transaction
      await session.commitTransaction();
      const populatedBooking = await Booking.findById(bookingId).populate("userId", "username")

      res.json({ 
        message: "Booking approved successfully", 
        booking: populatedBooking 
      });
      await Notification.create({
        userId: booking.userId,  // the user who made the booking
        message: `Your booking for ${booking.location} has been approved.`
      });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("Error approving booking:", err);
    res.status(500).json({ 
      error: err.message || "Failed to approve booking"
    });
  }
};

// Fetch all bookings (for Manager)
const getAllBookings = async (req, res) => {
  try {

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    // Get the user to check their role
    const user = await User.findById(req.userId);

    // Check if user is a manager
    if (!user || user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Only managers can view all bookings.' });
    }

    // If user is a manager, proceed to fetch all bookings
    const bookings = await Booking.find({})
      .populate('userId', 'username')
      .populate('vehicleId', 'name number driverName status')
      .sort({ createdAt: -1 });
      
      res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching all bookings:", err);
    res.status(500).json({ error: err.message });
  }
};

//complete booking 
  const completeBooking = async (req, res) => {
    const { bookingId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID format" });
    }

    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      if (booking.status !== "approved") {
        return res.status(400).json({ error: "Only approved bookings can be marked as completed" });
      }

      booking.status = "completed";
      booking.completedAt = new Date();
      await booking.save();

      // Free up the vehicle
      const vehicle = await Vehicle.findById(booking.vehicleId);
      if (vehicle) {
        vehicle.status = "available";
        await vehicle.save();
      }
      const populatedBooking = await Booking.findById(bookingId).populate("userId", "username");
      res.json({ message: "Booking marked as completed successfully", booking: populatedBooking });
    } catch (err) {
      console.error("Error completing booking:", err);
      res.status(500).json({ error: err.message });
    }
  };

//cancel booking
const cancelBooking = async (req, res) => {
  const { bookingId, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ error: "Invalid booking ID format" });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status === "completed") {
      return res.status(400).json({ error: "Completed bookings cannot be cancelled" });
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "No reason provided";
    await booking.save();

    // Free up the vehicle if already assigned
    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (vehicle) {
      vehicle.status = "available";
      await vehicle.save();
    }

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    console.error("Error canceling booking:", err);
    res.status(500).json({ error: err.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
     // Check if user is authenticated
     if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    // Get the user to check their role
    const user = await User.findById(req.userId);

    // Check if user is a manager
    if (!user || user.role !== 'user') {
      return res.status(403).json({ message: 'Access denied. Only Users can view all bookings.' });
    }

    // console.log("User ID for booking search:", req.userId);
    const bookings = await Booking.find({ userId: req.userId })
    
    .populate('userId', 'username email')
    .populate({
      path: 'vehicleId',
      select: 'name number driverName status',
      model: 'Vehicle'
    })
    .sort({ createdAt: -1 });
    // console.log("Raw bookings before population:", bookings);

    res.json(bookings);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({error: err.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};


// ✅ Export the functions
module.exports = {
  createBooking,
  guestBooking,
  getPendingBookings,
  approveBooking,
  getAllBookings,
  completeBooking,
  cancelBooking,
  getUserBookings,
  getNotifications
};

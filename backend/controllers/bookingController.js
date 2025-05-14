const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const User  = require("../models/User");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

// ✅ Create a new booking
const createBooking = async (req, res) => {
  try {
    const { location, reason, scheduledAt, duration, members } = req.body;

    if (!location || !scheduledAt || !reason || !duration || !members) {
      return res.status(400).json({ message: 'All fields are required (location, reason, scheduledAt, duration, members).' });
    }

    const newBooking = new Booking({
      userId: req.userId,
      location,
      reason,
      status: 'pending',
      scheduledAt,
      duration,
      members
    });

    const savedBooking = await newBooking.save();
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
    vehicleId,
    scheduledAt 
  } = req.body;

  // Validate required fields
  if (!bookingId || !driverName || !driverNumber || !vehicleId || !scheduledAt) {
    return res.status(400).json({ 
      error: "All fields are required for approval, including scheduledAt." 
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) throw new Error("Booking not found");

      const vehicle = await Vehicle.findById(vehicleId).session(session);
      if (!vehicle) throw new Error("Vehicle not found");

      const newStart = new Date(scheduledAt);
      const durationMs = booking.duration * 60 * 60 * 1000; // duration in ms
      const newEnd = new Date(newStart.getTime() + durationMs);

      // Check for overlapping approved bookings
      const overlapping = await Booking.findOne({
        vehicleId,
        status: 'approved',
        _id: { $ne: bookingId },
        scheduledAt: { $lt: newEnd }
      }).where('scheduledAt').gte(new Date(newStart.getTime() - durationMs)).session(session);

      if (overlapping) {
        await session.abortTransaction();
        return res.status(400).json({ 
          error: "Vehicle is already booked during this time range." 
        });
      }

      // Assign vehicle and driver details
      booking.driverName = driverName;
      booking.driverNumber = driverNumber;
      booking.vehicleName = vehicle.name;
      booking.vehicleNumber = vehicle.number;
      booking.vehicleId = vehicle._id;
      booking.scheduledAt = newStart;
      booking.status = "approved";
      booking.approvedAt = new Date();

      await booking.save({ session });

      // Update vehicle status
      vehicle.status = "assigned";
      await vehicle.save({ session });

      await session.commitTransaction();

      const populatedBooking = await Booking.findById(bookingId).populate("userId", "username");

      res.json({ 
        message: "Booking approved successfully", 
        booking: populatedBooking 
      });

      // Send notification (not in transaction)
      await Notification.create({
        userId: booking.userId,
        message: `Your booking for ${booking.location} has been approved.`
      });

    } catch (error) {
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

    if (booking.status !== "approved" && booking.status !== "merged") {
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
  const { bookingId } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userNumber = user.number?.toString() || "";
    const username = user.username || "Unknown";
    const userIdStr = req.userId?.toString?.();

    let modified = false;

    // Allow managers to cancel anything
    if (user.role === "manager") {
      booking.status = "cancelled";
      modified = true;

      booking.cancellationHistory = booking.cancellationHistory || [];
      booking.cancellationHistory.push({
        userId: user._id,
        username,
        number: userNumber,
        cancelledAt: new Date(),
        role: "manager"
      });
    }
    // If user is the owner
    else if (booking.userId?.toString?.() === userIdStr) {
      if (booking.isSharedRide) {
        booking.userId = undefined;
        booking.ownerCancelled = true;
      } else {
        booking.status = "cancelled";
      }

      booking.cancellationHistory = booking.cancellationHistory || [];
      booking.cancellationHistory.push({
        userId: user._id,
        username,
        number: userNumber,
        cancelledAt: new Date(),
        role: "owner"
      });

      modified = true;
    }
    // If user is a passenger
    else {
      const passengerIndex = (booking.passengers || []).findIndex(
        (p) => p.number?.toString?.() === userNumber
      );

      if (passengerIndex !== -1) {
        booking.passengers.splice(passengerIndex, 1);
        booking.cancellationHistory = booking.cancellationHistory || [];

        booking.cancellationHistory.push({
          userId: user._id,
          username,
          number: userNumber,
          cancelledAt: new Date(),
          role: "passenger"
        });

        modified = true;
      } else {
        return res.status(403).json({ error: "You are not part of this booking." });
      }
    }

    if (modified) {
      await booking.save();
      return res.json({ message: "Booking cancelled successfully." });
    } else {
      return res.status(400).json({ error: "No changes were made to the booking." });
    }

  } catch (err) {
    console.error("Error cancelling booking:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getUserBookings = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.userId);
    if (!user || user.role !== 'user') {
      return res.status(403).json({ message: 'Access denied. Only users can view their bookings.' });
    }

    const userNumber = user.number.toString();
    const userNumberWithCountryCode = "+91" + user.number.toString();

    const userBookings = await Booking.find({
      $or: [
        { userId: req.userId },
        { 'passengers.number': { $in: [userNumber, userNumberWithCountryCode] } } // 👈 look here
      ]
    })
    .populate('userId', 'username number _id')
    .populate({
      path: 'vehicleId',
      select: 'name number driverName status',
      model: 'Vehicle'
    })
    .sort({ createdAt: -1 });

    res.json(userBookings);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: err.message });
  }

};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId }).sort({ scheduledAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

const reschedule = async (req, res) => {
  const { bookingId, newDate } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ error: "Invalid booking ID" });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.scheduledAt = newDate;
    await booking.save();

    res.json({ message: "Booking rescheduled", booking });
  } catch (err) {
    console.error("Reschedule error:", err);
    res.status(500).json({ error: "Failed to reschedule" });
  }
};

const mergeRide = async (req, res) => {
  const { bookingIds, primaryBookingId, newDetails = {}, managerReason } = req.body;
  
  try {
    // Fetch the bookings being merged with user data
    const bookingsToMerge = await Booking.find({ _id: { $in: bookingIds } })
      .populate("userId");
    
    if (bookingsToMerge.length < 2) {
      return res.status(400).json({ error: "Need at least two bookings to merge." });
    }
    
    // Find the primary booking (whose vehicle and user we keep)
    const primaryBooking = bookingsToMerge.find(booking => 
      booking._id.toString() === primaryBookingId
    );
    
    if (!primaryBooking) {
      return res.status(400).json({ error: "Primary booking ID not found in bookings to merge." });
    }
    
    // Get earliest booking time from all bookings
    const earliestTime = bookingsToMerge.reduce((earliest, current) => {
      return new Date(current.scheduledAt) < new Date(earliest) 
        ? current.scheduledAt 
        : earliest;
    }, primaryBooking.scheduledAt);
    
    // Calculate end time for each booking (scheduledAt + duration) and find the latest end time
    let latestEndTime = new Date(0);
    bookingsToMerge.forEach(booking => {
      if (booking.scheduledAt && booking.duration) {
        // Convert booking.duration (hours) to milliseconds
        const durationMs = booking.duration * 60 * 60 * 1000;
        const endTime = new Date(new Date(booking.scheduledAt).getTime() + durationMs);
        
        if (endTime > latestEndTime) {
          latestEndTime = endTime;
        }
      }
    });
    
    // Calculate the final duration (from earliest start to latest end) in hours
    const startTimeMs = new Date(earliestTime).getTime();
    const finalDurationHours = (latestEndTime.getTime() - startTimeMs) / (60 * 60 * 1000);
    
    // Get total number of members from the bookings being merged
    const totalMembers = bookingsToMerge.reduce((total, booking) => {
      // If members is a number, add it to the total
      if (booking.members && typeof booking.members === 'number') {
        return total + booking.members;
      }
      // If members is an array, add its length
      else if (booking.members && Array.isArray(booking.members)) {
        return total + booking.members.length;
      }
      return total;
    }, 0);
    
    // Create passengers array with info from all merged bookings
    const passengers = bookingsToMerge.map(booking => ({
      username: booking.userId ? booking.userId.username : "Unknown",
      number: booking.userId ? booking.userId.number : "N/A",
      location: booking.location || "N/A",
      reason: booking.reason || "N/A",
      bookingTime: booking.scheduledAt
    }));
    
    // Construct the merged booking
    const mergedBooking = new Booking({
      userId: primaryBooking.userId,
      location: primaryBooking.location,
      vehicleId: primaryBooking.vehicleId,
      vehicleName: primaryBooking.vehicleName,
      driverName: primaryBooking.driverName,
      driverNumber: primaryBooking.driverNumber,
      status: "shared", 
      isSharedRide: true,
      isActive: true, // Explicitly mark as active
      mergedFrom: bookingIds,
      passengers,
      // Add the missing required fields
      members: totalMembers,
      duration: newDetails.duration || finalDurationHours,
      reason: managerReason || "Bookings merged by manager",
      ...newDetails,
      scheduledAt: newDetails.scheduledAt || earliestTime,
      ...(({ status, ...rest }) => rest)(newDetails)
    });
    
    await mergedBooking.save();
    
    // Mark primary vehicle as assigned
    if (primaryBooking.vehicleId) {
      await Vehicle.findByIdAndUpdate(primaryBooking.vehicleId, { status: 'assigned' });
    }
    
    // Release vehicles from other bookings
    const secondaryBookings = bookingsToMerge.filter(
      booking => booking._id.toString() !== primaryBookingId
    );
    
    for (const booking of secondaryBookings) {
      if (booking.vehicleId) {
        await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'available' });
      }
    }
    
    // Update all original bookings as merged and inactive
    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      {
        $set: {
          status: "merged",
          isActive: false, // Mark original bookings as inactive
          mergedInto: mergedBooking._id
        }
      }
    );
    
    // Fetch the complete merged booking with populated data to return
    const completeMergedBooking = await Booking.findById(mergedBooking._id)
      .populate("userId");
    
    res.status(200).json({
      message: "Bookings successfully merged into a shared ride",
      mergedBooking: {
        _id: completeMergedBooking._id,
        status: completeMergedBooking.status,
        vehicleId: completeMergedBooking.vehicleId,
        vehicleName: completeMergedBooking.vehicleName,
        scheduledAt: completeMergedBooking.scheduledAt,
        duration: completeMergedBooking.duration,
        members: completeMergedBooking.members,
        reason: completeMergedBooking.reason,
        mergedFrom: completeMergedBooking.mergedFrom,
        passengers: completeMergedBooking.passengers,
        driverName: completeMergedBooking.driverName,
        driverNumber: completeMergedBooking.driverNumber
      }
    });
    
  } catch (err) {
    console.error("Merge failed:", err);
    res.status(500).json({ error: "Failed to merge bookings.", details: err.message });
  }
};

const getById = async(req, res)=> {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId').populate('vehicleId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBookingsByVehicles = async (req, res) => {
  try {
    // First get all vehicles
    const vehicles = await Vehicle.find({}).lean();
    
    // Get all bookings that are approved or pending
    const allBookings = await Booking.find({
      status: { $in: ['approved', 'pending', 'merged'] }
    })
      .populate('userId', 'username email number')
      .lean();
    
    // Format bookings for the view page
    const formattedBookings = allBookings.map(booking => {
      // Find the vehicle for this booking
      const vehicle = vehicles.find(v => 
        v._id.toString() === booking.vehicleId?.toString()
      );
      
      return {
        id: booking._id,
        vehicleId: vehicle?._id || 'unknown',
        vehicleName: vehicle?.name || 'Unknown Vehicle',
        vehicleNumber: vehicle?.number || 'No Registration',
        username: booking.userId?.username || 'Not specified',
        email: booking.userId?.email,
        drivername: vehicle?.driverName || 'Not assigned',
        number: booking.userId?.number || 'Not provided',
        date: new Date(booking.scheduledAt).toLocaleDateString(),
        time: new Date(booking.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: booking.location || 'Not specified',
        reason: booking.reason || 'Not provided',
        status: booking.status
      };
    });
    
    res.json(formattedBookings);
  } catch (err) {
    console.error('Get bookings for view page error:', err);
    res.status(500).json({ error: err.message });
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
  getNotifications,
  reschedule,
  mergeRide,
  getBookingsByVehicles,
  getById
};

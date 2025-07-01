const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const User  = require("../models/User");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const sendMsg91SMS = require("../service/sendMsg91SMS");


// ✅ Create a new booking
const createBooking = async (req, res) => {
  try {
    const { location, reason, scheduledAt, duration, members,pickupLocation } = req.body;

    if (!location || !scheduledAt || !reason || !duration || !members || !pickupLocation) {
      return res.status(400).json({ message: 'All fields are required (location, reason, scheduledAt, duration, members, pickupLocation).' });
    }

    const newBooking = new Booking({
      userId: req.userId,
      location,
      pickupLocation,
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
  }

  const { 
    location, 
    guestName, 
    guestPhone,
    vehicleId,
    driverName, 
    driverNumber, 
    notes,
    scheduledAt,
    duration,
    members,
    reason,
    serviceType
  } = req.body;
  
  // Validate required fields
  if (!location) {
    return res.status(400).json({ error: "Location is required" });
  }

  if (!guestName || !guestPhone) {
    return res.status(400).json({ 
      error: "Guest name and phone are required for guest bookings" 
    });
  }

  if (!driverName || !driverNumber) {
    return res.status(400).json({ 
      error: "Driver's name and phone are required for guest bookings" 
    });
  }

  if (!vehicleId) {
    return res.status(400).json({ 
      error: "Vehicle selection is required" 
    });
  }

  if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
    return res.status(400).json({ 
      error: "Valid scheduled time is required" 
    });
  }

  if (!duration || isNaN(duration)) {
    return res.status(400).json({ 
      error: "Duration is required and must be a number" 
    });
  }

  if (!members || isNaN(parseInt(members))) {
    return res.status(400).json({ 
      error: "Number of members is required and must be a number" 
    });
  }

  if (!reason) {
    return res.status(400).json({ 
      error: "Reason for booking is required" 
    });
  }

  if (!serviceType || !['pickup', 'dropoff'].includes(serviceType)) {
    return res.status(400).json({
      error: "Service type is required and must be either 'pickup' or 'dropoff'"
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
      status: "confirmed",
      isGuestBooking: true,
      guestName,
      guestPhone,
      vehicleId,
      vehicleName: vehicle.name,
      driverName, 
      driverNumber,
      notes: notes || '',
      scheduledAt: new Date(scheduledAt),
      duration,
      members: parseInt(members),
      reason,
      serviceType,
      createdBy: req.userId  
    });

    // Update vehicle status
    vehicle.status = 'assigned';
    await vehicle.save();

    await booking.save();

    res.status(201).json({ 
      message: "Guest booking created successfully", 
      booking: {
        ...booking.toObject(),
        vehicleName: vehicle.name,
        serviceTypeDisplay: serviceType === 'pickup' ? 'Pickup Service' : 'Drop-off Service'
      } 
    });
  } catch (err) {
    console.error("Error creating guest booking:", err);
    res.status(500).json({ 
      error: "Failed to create guest booking",
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

const getApproveBookings = async(req, res) =>{
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

    const bookings = await Booking.find({ status: "approved" })
      .populate('userId', 'username') 
      .sort({ createdAt: -1 }); // Most recent first
    
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching approved bookings:", err);
    res.status(500).json({ 
      error: "Failed to fetch approved bookings",
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

      const populatedBooking = await Booking.findById(bookingId).populate("userId", "username number");
      try {
        if (!populatedBooking.userId?.number) {
          console.error("❌ User mobile number is missing.");
          return res.status(400).json({ error: "User mobile number not found." });
        }

        const number = populatedBooking.userId.number.replace(/^91/, "");
        console.log("Sending to:", populatedBooking.userId.number);
        console.log("Final format:", `91${number}`);

        await sendMsg91SMS(`91${number}`, booking.driverName, booking.vehicleName);
      } catch (smsErr) {
        console.error("Failed to send user SMS:", smsErr.message);
      }

      res.json({ 
        message: "Booking approved successfully", 
        booking: populatedBooking 
      });

      // // 📢 Optional notification record
      // await Notification.create({
      //   userId: booking.userId,
      //   message: `Your booking for ${booking.location} has been approved.`
      // });

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
      .populate('vehicleId', 'vehicleName vehicleNumber driverName status')
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

    if (booking.status !== "approved" && booking.status !== "shared" && booking.status !== "confirmed") {
      return res.status(400).json({ error: "Only approved, shared, or confirmed bookings can be marked as completed" });
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
        // booking.userId = undefined;
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
        { 'passengers.number': { $in: [userNumber, userNumberWithCountryCode] } },
        { 'cancellationHistory.userId': req.userId }
      ]
    })
    .populate('userId', 'username number _id')
    .populate({
      path: 'vehicleId',
      select: 'name number driverName status',
      model: 'Vehicle'
    })
    .sort({ createdAt: -1 });

    // Process bookings to show correct status for each user
    const enhancedBookings = await Promise.all(userBookings.map(async (booking) => {
      const bookingObj = booking.toObject();
      
      // Check if THIS specific user has canceled
      const userHasCanceled = booking.cancellationHistory.some(entry => {
        // Check if userId matches directly as string or object
        if (entry.userId) {
          const entryIdStr = entry.userId.toString();
          const reqUserIdStr = req.userId.toString();
          return entryIdStr === reqUserIdStr;
        }
        
        // Also check by username if stored in the cancellation record
        if (entry.username && user.username) {
          return entry.username === user.username;
        }
        
        // Also check by phone number
        if (entry.number) {
          return entry.number === userNumber || entry.number === userNumberWithCountryCode;
        }
        
        return false;
      });

      // For THIS specific user, override the status if they've canceled
      if (userHasCanceled) {
        bookingObj.status = 'cancelled';
      }
      
      // User-specific flag for UI purposes
      bookingObj.userHasCanceled = userHasCanceled;

      // Process passengers if this is a shared ride
      if (booking.isSharedRide && booking.passengers && booking.passengers.length > 0) {
        const updatedPassengers = await Promise.all(booking.passengers.map(async (passenger) => {
          const userDoc = await User.findOne({ number: passenger.number });

          return {
            ...passenger,
            username: passenger.username || userDoc?.username || "Unknown User",
            number: passenger.number || userDoc?.number || "N/A",
            location: passenger.location || userDoc?.location || "N/A",
            pickupLocation: passenger.pickupLocation || userDoc?.pickupLocation || "N/A",
            reason: passenger.reason || "N/A",
            bookingTime: passenger.bookingTime || booking.createdAt || "N/A",
            duration: passenger.duration ?? 1,
            members: passenger.members ?? 1,
          };
        }));
        
        bookingObj.passengers = updatedPassengers;
      }
      
      return bookingObj;
    }));

    res.json(enhancedBookings);
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
    
    const finalDurationHours = Math.max(
      ...bookingsToMerge.map(booking =>
        typeof booking.duration === 'number'
          ? booking.duration
          : parseFloat(booking.duration) || 1
      )
    );
    
       
    // Create passengers array with info from all merged bookings
    let passengers = [];

    for (const booking of bookingsToMerge) {
      if (booking.status === 'shared' && Array.isArray(booking.passengers)) {
        passengers.push(...booking.passengers);
      } else {
        let duration = typeof booking.duration === 'number'
          ? booking.duration
          : parseFloat(booking.duration) || 1;

        let members = 1;
        if (typeof booking.members === 'number') {
          members = booking.members;
        } else if (Array.isArray(booking.members)) {
          members = booking.members.length;
        } else if (!isNaN(parseInt(booking.members))) {
          members = parseInt(booking.members);
        }

        passengers.push({
          username: booking.userId?.username || "Unknown",
          number: booking.userId?.number || "N/A",
          pickupLocation: booking.pickupLocation || "N/A",
          location: booking.location || booking.userId?.location || "N/A",
          reason: booking.reason || "N/A",
          members,
          duration,
          bookingTime: booking.scheduledAt
        });
      }
    }

    const totalMembers = passengers.reduce((sum, p) => sum + (p.members || 1), 0);
    
    
    const mergedBooking = new Booking({
      userId: primaryBooking.userId,
      pickupLocation: primaryBooking.pickupLocation,
      location: primaryBooking.location,
      vehicleId: primaryBooking.vehicleId,
      vehicleName: primaryBooking.vehicleName,
      driverName: primaryBooking.driverName,
      driverNumber: primaryBooking.driverNumber,
      status: "shared",
      isSharedRide: true,
      isActive: true,
      mergedFrom: bookingIds,
      passengers,
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
      status: { $in: ['approved', 'pending', 'shared', 'confirmed'] }
    })
      .populate('userId', 'username email number')
      .lean();
    
    // Format bookings for the view page
    const formattedBookings = allBookings.map(booking => {
      // Find the vehicle for this booking
      const vehicle = vehicles.find(v =>
        v._id.toString() === booking.vehicleId?.toString()
      );

      const isGuest = booking.isGuestBooking;

      return {
        id: booking._id,
        isGuestBooking: isGuest,
        vehicleId: vehicle?._id || 'unknown',
        vehicleName: vehicle?.name || 'Unknown Vehicle',
        vehicleNumber: vehicle?.number || 'No Registration',
        
        username: isGuest ? booking.guestName : booking.userId?.username || 'Not specified',
        number: isGuest ? booking.guestPhone : booking.userId?.number || 'Not provided',
        drivername: isGuest ? booking.driverName : vehicle?.driverName || 'Not assigned',
        number: isGuest ? booking.driverNumber : vehicle?.driverNumber|| 'Not provided',
        
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

const editRide = async (req, res) => {
  try {
    // Get bookingId from URL parameter OR request body
    const bookingId = req.params.bookingId || req.body.bookingId;
    const { 
      driverName, 
      driverNumber, 
      vehicleName, 
      vehicleId, 
      scheduledAt, 
      members, 
      location,
      // Guest booking specific fields
      guestName,
      guestPhone,
      pickupLocation,
      reason,
      duration
    } = req.body;

    console.log('Received edit request:', {
      bookingId,
      body: req.body,
      params: req.params
    });

    // Input validation
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Validate at least one field is provided for update - Simplest approach
    const validUpdateFields = [
      'driverName', 'driverNumber', 'vehicleName', 'vehicleId', 
      'scheduledAt', 'members', 'location', 'guestName', 
      'guestPhone', 'pickupLocation', 'reason', 'duration'
    ];
    
    // Check if any valid update field exists in the request body
    const fieldsToUpdate = Object.keys(req.body).filter(key => 
      key !== 'bookingId' && validUpdateFields.includes(key)
    );
    
    console.log('Validation check:', {
      allBodyKeys: Object.keys(req.body),
      fieldsToUpdate,
      hasFields: fieldsToUpdate.length > 0,
      requestBody: req.body
    });
    
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ 
        message: 'At least one valid update field must be provided',
        validFields: validUpdateFields,
        receivedFields: Object.keys(req.body),
        fieldsToUpdate: fieldsToUpdate
      });
    }

    // Find the booking first
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow edit for shared, approved, or confirmed bookings
    if (!['shared', 'approved', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ 
        message: 'Only shared, approved, or confirmed bookings can be edited',
        currentStatus: booking.status 
      });
    }

    // Check if this is a guest booking (confirmed status)
    const isGuestBooking = booking.status === 'confirmed';

    // Validate scheduledAt if provided
    if (scheduledAt !== undefined && scheduledAt !== null) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ message: 'Invalid scheduled date format' });
      }
      
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: 'Scheduled time must be in the future' });
      }
    }

    // Validate members if provided
    if (members !== undefined && members !== null) {
      const membersNum = parseInt(members);
      if (isNaN(membersNum) || membersNum < 1) {
        return res.status(400).json({ message: 'Members must be a valid number greater than 0' });
      }
    }

    // Validate duration if provided (only for guest bookings)
    if (duration !== undefined && duration !== null) {
      if (!isGuestBooking) {
        return res.status(400).json({ message: 'Duration field is only applicable for guest bookings' });
      }
      const durationNum = parseFloat(duration);
      if (isNaN(durationNum) || durationNum <= 0) {
        return res.status(400).json({ message: 'Duration must be a valid number greater than 0' });
      }
    }

    // Validate location if provided
    if (location !== undefined && location !== null && location.trim().length === 0) {
      return res.status(400).json({ message: 'Location cannot be empty' });
    }

    // Validate pickup location if provided (only for regular bookings)
    if (pickupLocation !== undefined && pickupLocation !== null) {
      if (isGuestBooking) {
        return res.status(400).json({ message: 'Pickup location field is not applicable for guest bookings' });
      }
      if (pickupLocation.trim().length === 0) {
        return res.status(400).json({ message: 'Pickup location cannot be empty' });
      }
    }

    // Validate driver number format if provided
    if (driverNumber !== undefined && driverNumber !== null && 
        !/^\d{10}$/.test(driverNumber.replace(/\s+/g, ''))) {
      return res.status(400).json({ message: 'Driver number must be a valid 10-digit phone number' });
    }

    // Validate guest-specific fields (only for guest bookings)
    if (guestPhone !== undefined && guestPhone !== null) {
      if (!isGuestBooking) {
        return res.status(400).json({ message: 'Guest phone field is only applicable for guest bookings' });
      }
      if (!/^\d{10}$/.test(guestPhone.replace(/\s+/g, ''))) {
        return res.status(400).json({ message: 'Guest phone must be a valid 10-digit phone number' });
      }
    }

    if (guestName !== undefined && guestName !== null) {
      if (!isGuestBooking) {
        return res.status(400).json({ message: 'Guest name field is only applicable for guest bookings' });
      }
      if (guestName.trim().length === 0) {
        return res.status(400).json({ message: 'Guest name cannot be empty' });
      }
    }

    if (reason !== undefined && reason !== null && !isGuestBooking) {
      return res.status(400).json({ message: 'Reason field is only applicable for guest bookings' });
    }

    // Store original values for logging/audit
    const originalValues = {
      driverName: booking.driverName,
      driverNumber: booking.driverNumber,
      vehicleName: booking.vehicleName,
      vehicleId: booking.vehicleId,
      scheduledAt: booking.scheduledAt,
      members: booking.members,
      location: booking.location,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      pickupLocation: booking.pickupLocation,
      reason: booking.reason,
      duration: booking.duration
    };

    // Update common fields - Allow any field to be updated
    if (driverName !== undefined && driverName !== null) booking.driverName = driverName.trim();
    if (driverNumber !== undefined && driverNumber !== null) booking.driverNumber = driverNumber.replace(/\s+/g, '');
    if (vehicleName !== undefined && vehicleName !== null) booking.vehicleName = vehicleName.trim();
    if (vehicleId !== undefined && vehicleId !== null) booking.vehicleId = vehicleId;
    if (scheduledAt !== undefined && scheduledAt !== null) booking.scheduledAt = new Date(scheduledAt);
    if (members !== undefined && members !== null) booking.members = parseInt(members);
    if (location !== undefined && location !== null) booking.location = location.trim();

    // Update fields based on booking type
    if (isGuestBooking) {
      // Guest booking: only location, no pickupLocation
      if (guestName !== undefined && guestName !== null) booking.guestName = guestName.trim();
      if (guestPhone !== undefined && guestPhone !== null) booking.guestPhone = guestPhone.replace(/\s+/g, '');
      if (reason !== undefined && reason !== null) booking.reason = reason.trim();
      if (duration !== undefined && duration !== null) booking.duration = parseFloat(duration);
    } else {
      // Regular booking: both location and pickupLocation allowed
      if (pickupLocation !== undefined && pickupLocation !== null) booking.pickupLocation = pickupLocation.trim();
    }

    // Add edit timestamp and manager info if available
    booking.lastEditedAt = new Date();
    if (req.user && req.user.id) {
      booking.lastEditedBy = req.user.id;
    }

    await booking.save();

    // Log the changes for audit trail
    console.log('Booking edited successfully:', {
      bookingId,
      bookingType: isGuestBooking ? 'guest' : 'regular',
      editedBy: req.user?.id || 'Unknown',
      originalValues,
      newValues: {
        driverName: booking.driverName,
        driverNumber: booking.driverNumber,
        vehicleName: booking.vehicleName,
        vehicleId: booking.vehicleId,
        scheduledAt: booking.scheduledAt,
        members: booking.members,
        location: booking.location,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        pickupLocation: booking.pickupLocation,
        reason: booking.reason,
        duration: booking.duration
      },
      timestamp: new Date()
    });

    // Prepare updated fields response
    const updatedFields = {};
    if (driverName !== undefined && driverName !== null) updatedFields.driverName = booking.driverName;
    if (driverNumber !== undefined && driverNumber !== null) updatedFields.driverNumber = booking.driverNumber;
    if (vehicleName !== undefined && vehicleName !== null) updatedFields.vehicleName = booking.vehicleName;
    if (vehicleId !== undefined && vehicleId !== null) updatedFields.vehicleId = booking.vehicleId;
    if (scheduledAt !== undefined && scheduledAt !== null) updatedFields.scheduledAt = booking.scheduledAt;
    if (members !== undefined && members !== null) updatedFields.members = booking.members;
    if (location !== undefined && location !== null) updatedFields.location = booking.location;
    
    // Include fields based on booking type
    if (isGuestBooking) {
      if (guestName !== undefined && guestName !== null) updatedFields.guestName = booking.guestName;
      if (guestPhone !== undefined && guestPhone !== null) updatedFields.guestPhone = booking.guestPhone;
      if (reason !== undefined && reason !== null) updatedFields.reason = booking.reason;
      if (duration !== undefined && duration !== null) updatedFields.duration = booking.duration;
    } else {
      if (pickupLocation !== undefined && pickupLocation !== null) updatedFields.pickupLocation = booking.pickupLocation;
    }

    return res.status(200).json({ 
      message: 'Booking updated successfully',
      bookingType: isGuestBooking ? 'guest' : 'regular',
      booking: {
        _id: booking._id,
        driverName: booking.driverName,
        driverNumber: booking.driverNumber,
        vehicleName: booking.vehicleName,
        vehicleId: booking.vehicleId,
        scheduledAt: booking.scheduledAt,
        members: booking.members,
        location: booking.location,
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        pickupLocation: booking.pickupLocation,
        reason: booking.reason,
        duration: booking.duration,
        status: booking.status,
        lastEditedAt: booking.lastEditedAt
      },
      updatedFields
    });
  } catch (err) {
    console.error('Error in editRide:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: err.message 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid booking ID format' });
    }
    
    return res.status(500).json({ message: 'Server error while editing booking' });
  }
};

const removePassenger = async (req, res) => {
  const { bookingId, passengerIndex } = req.body;
  
  try {
    const sharedBooking = await Booking.findById(bookingId).populate("userId");
    
    if (!sharedBooking || sharedBooking.status !== 'shared') {
      return res.status(400).json({ error: "Shared booking not found." });
    }

    if (!sharedBooking.passengers || passengerIndex >= sharedBooking.passengers.length) {
      return res.status(400).json({ error: "Invalid passenger index." });
    }

    const passengerToRemove = sharedBooking.passengers[passengerIndex];
    
    // Create individual booking for removed passenger
    const individualBooking = new Booking({
      userId: sharedBooking.userId, // You might want to find the actual userId for this passenger
      pickupLocation: passengerToRemove.pickupLocation,
      location: passengerToRemove.location,
      reason: passengerToRemove.reason,
      members: passengerToRemove.members,
      duration: passengerToRemove.duration,
      scheduledAt: passengerToRemove.bookingTime,
      status: "approved", // Set as approved since it was part of shared ride
      isActive: true,
      restoredFrom: bookingId
    });

    await individualBooking.save();

    // Remove passenger from shared booking
    sharedBooking.passengers.splice(passengerIndex, 1);
    
    // Update total members
    const newTotalMembers = sharedBooking.passengers.reduce((sum, p) => sum + (p.members || 1), 0);
    sharedBooking.members = newTotalMembers;

    // If only one passenger left, convert back to individual booking
    if (sharedBooking.passengers.length === 1) {
      const lastPassenger = sharedBooking.passengers[0];
      
      // Update the shared booking to individual
      sharedBooking.status = "approved";
      sharedBooking.isSharedRide = false;
      sharedBooking.pickupLocation = lastPassenger.pickupLocation;
      sharedBooking.location = lastPassenger.location;
      sharedBooking.reason = lastPassenger.reason;
      sharedBooking.members = lastPassenger.members;
      sharedBooking.duration = lastPassenger.duration;
      sharedBooking.scheduledAt = lastPassenger.bookingTime;
      sharedBooking.passengers = [];
    }

    await sharedBooking.save();

    res.status(200).json({
      message: "Passenger removed successfully",
      individualBooking,
      updatedSharedBooking: sharedBooking
    });

  } catch (err) {
    console.error("Remove passenger failed:", err);
    res.status(500).json({ error: "Failed to remove passenger.", details: err.message });
  }
};

const unmergeRide = async (req, res) => {
  const { bookingId } = req.body;
  
  try {
    const sharedBooking = await Booking.findById(bookingId).populate("userId");
    
    if (!sharedBooking || sharedBooking.status !== 'shared') {
      return res.status(400).json({ error: "Shared booking not found." });
    }

    const restoredBookings = [];

    // Create individual bookings for each passenger
    for (const passenger of sharedBooking.passengers) {
      const individualBooking = new Booking({
        userId: sharedBooking.userId, // You might want to find actual userIds
        pickupLocation: passenger.pickupLocation,
        location: passenger.location,
        reason: passenger.reason,
        members: passenger.members,
        duration: passenger.duration,
        scheduledAt: passenger.bookingTime,
        status: "approved",
        isActive: true,
        restoredFrom: bookingId
      });

      await individualBooking.save();
      restoredBookings.push(individualBooking);
    }

    // Mark shared booking as inactive
    sharedBooking.status = "unmerged";
    sharedBooking.isActive = false;
    await sharedBooking.save();

    // Release the vehicle
    if (sharedBooking.vehicleId) {
      await Vehicle.findByIdAndUpdate(sharedBooking.vehicleId, { status: 'available' });
    }

    res.status(200).json({
      message: "Shared ride unmerged successfully",
      restoredBookings,
      unmergedBooking: sharedBooking
    });

  } catch (err) {
    console.error("Unmerge failed:", err);
    res.status(500).json({ error: "Failed to unmerge ride.", details: err.message });
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
  getById,
  editRide,
  getApproveBookings,
  removePassenger,
  unmergeRide
};

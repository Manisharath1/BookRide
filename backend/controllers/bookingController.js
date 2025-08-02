const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const User  = require("../models/User");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const sendMsg91SMS = require("../service/sendMsg91SMS");
const sendRideCancelledUserSMS = require("../service/sendRideCancelledUserSMS");
const sendNewRideRequestManagerSMS = require("../service/sendNewRideRequestManagerSMS");
const sendDriverRideAssignmentSMS = require("../service/sendDriverRideAssignmentSMS");
const sendRideMergeNotificationSMS = require("../service/sendRideMergeNotificationSMS");
const sendRide_UpdateNotificationSMS = require("../service/sendRide_UpdateNotificationSMS");
const sendDriverRide_CancelSMS = require("../service/sendDriverRide_CancelSMS");
const sendPassenger_RemovedSMS = require("../service/sendPassenger_RemovedSMS");
const sendDriver_RideUpdateSMS = require("../service/sendDriver_RideUpdateSMS");
const RideCompletionManager_SMS = require("../service/SendRideCompletionManager");
const RideCompletionUser_SMS = require("../service/RideCompletionUser_SMS");


// ✅ Create a new booking
const createBooking = async (req, res) => {
  try {
    const { location, reason, scheduledAt, duration, members, pickupLocation } = req.body;
    
    if (!location || !scheduledAt || !reason || !duration || !members || !pickupLocation) {
      return res.status(400).json({ 
        message: 'All fields are required (location, reason, scheduledAt, duration, members, pickupLocation).' 
      });
    }

    // Get the user who is creating the booking
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
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

    // Send SMS notification to all managers
    try {
      // Find all users with manager role
      const managers = await User.find({ role: 'manager' });
      
      if (managers && managers.length > 0) {
        const userName = user.username || user.name || "Unknown User";
        const destination = location;
        const time = new Date(scheduledAt).toLocaleString("en-IN", { 
          timeZone: "Asia/Kolkata" 
        });

        console.log("Sending new ride request SMS to managers:", {
          userName,
          destination,
          time,
          managersCount: managers.length
        });

        // Send SMS to each manager
        for (const manager of managers) {
          if (manager.number) {
            try {
              // Clean and format manager's mobile number
              let managerMobile = manager.number.toString().replace(/\D/g, '');
              
              if (managerMobile.startsWith('91')) {
                managerMobile = managerMobile;
              } else if (managerMobile.length === 10) {
                managerMobile = `91${managerMobile}`;
              } else {
                managerMobile = `91${managerMobile.replace(/^91/, "")}`;
              }

              // console.log(`Sending SMS to manager: ${manager.username} (${managerMobile})`);
              
              await sendNewRideRequestManagerSMS(managerMobile, userName, destination, time);
              
              // console.log(`✅ SMS sent successfully to manager: ${manager.username}`);
            } catch (smsError) {
              console.error(`❌ Failed to send SMS to manager ${manager.username}:`, smsError.message);
              // Continue with other managers even if one fails
            }
          } else {
            console.warn(`Manager ${manager.username} has no phone number`);
          }
        }
      } else {
        console.log("No managers found to notify");
      }
    } catch (managerNotificationError) {
      console.error("Error sending manager notifications:", managerNotificationError.message);
      // Don't fail the booking creation if SMS fails
    }

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
      // Send SMS to user (existing functionality)
      try {
        if (!populatedBooking.userId?.number) {
          console.error("❌ User mobile number is missing.");
          return res.status(400).json({ error: "User mobile number not found." });
        }

        const number = populatedBooking.userId.number.replace(/^91/, "");
        // console.log("Sending to:", populatedBooking.userId.number);
        // console.log("Final format:", `91${number}`);

        await sendMsg91SMS(`91${number}`, booking.driverName, booking.driverNumber, booking.vehicleName);
      } catch (smsErr) {
        console.error("Failed to send user SMS:", smsErr.message);
      }
      // Send SMS to driver (new functionality)
      try {
        if (!driverNumber) {
          console.error("❌ Driver mobile number is missing.");
        } else {
          // Clean and format driver's mobile number
          let cleanDriverNumber = driverNumber.toString().replace(/\D/g, '');
          
          if (cleanDriverNumber.startsWith('91')) {
            cleanDriverNumber = cleanDriverNumber;
          } else if (cleanDriverNumber.length === 10) {
            cleanDriverNumber = `91${cleanDriverNumber}`;
          } else {
            cleanDriverNumber = `91${cleanDriverNumber.replace(/^91/, "")}`;
          }

          const destination = booking.location || "Destination";
          const pickupLocation = booking.pickupLocation || "Pickup Location";
          const time = new Date(scheduledAt).toLocaleString("en-IN", { 
            timeZone: "Asia/Kolkata" 
          });
          const customerName = populatedBooking.userId?.username || "Customer";
          const customerContact = populatedBooking.userId?.number || "Not available";
          const vehicleName = vehicle.name + " (" + vehicle.number + ")";

          console.log("Sending ride assignment SMS to driver:", {
            driverNumber: cleanDriverNumber,
            driverName,
            destination,
            pickupLocation,
            time,
            customerName,
            customerContact,
            vehicleName
          });

          await sendDriverRideAssignmentSMS(
            cleanDriverNumber, 
            destination,
            pickupLocation, 
            time, 
            customerName, 
            customerContact, 
            vehicleName
          );
          
          // console.log("✅ Driver SMS sent successfully");
        }
      } catch (driverSmsErr) {
        console.error("❌ Failed to send driver SMS:", driverSmsErr.message);
        // Don't fail the approval if driver SMS fails
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

    // Update booking status
    booking.status = "completed";
    booking.completedAt = new Date();
    await booking.save();

    // Free up the vehicle
    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (vehicle) {
      vehicle.status = "available";
      await vehicle.save();
    }

    // Get populated booking data for response and SMS
    const populatedBooking = await Booking.findById(bookingId).populate("userId", "username number");
    
    // Prepare SMS notification data
    const isGuestBooking = booking.status === "completed" && booking.guestName; // Check if it was a guest booking
    let userName, userMobile;
    
    if (isGuestBooking) {
      userName = booking.guestName || "Guest User";
      userMobile = booking.guestPhone;
    } else {
      userName = populatedBooking.userId?.username || "User";
      userMobile = populatedBooking.userId?.number;
    }

    const scheduledTime = new Date(booking.scheduledAt).toLocaleString("en-IN", { 
      timeZone: "Asia/Kolkata" 
    });

    // Send SMS notification to all managers
    try {
      // Find all users with manager role
      const managers = await User.find({ role: 'manager' }).select('number username');
      
      console.log("Found managers for SMS notification:", {
        managersCount: managers.length,
        managers: managers.map(m => ({ username: m.username, number: m.number }))
      });

      if (managers.length > 0) {
        // Send SMS to each manager
        const managerSMSPromises = managers.map(async (manager) => {
          if (manager.number) {
            try {
              let cleanManagerMobile = manager.number.toString().replace(/\D/g, '');
              
              if (cleanManagerMobile.startsWith('91')) {
                cleanManagerMobile = cleanManagerMobile;
              } else if (cleanManagerMobile.length === 10) {
                cleanManagerMobile = `91${cleanManagerMobile}`;
              } else {
                cleanManagerMobile = `91${cleanManagerMobile.replace(/^91/, "")}`;
              }

              console.log(`Sending ride completion SMS to manager ${manager.username}:`, {
                managerMobile: cleanManagerMobile,
                userName,
                scheduledTime,
                bookingId: booking._id
              });

              await RideCompletionManager_SMS(
                cleanManagerMobile,
                userName,
                scheduledTime
              );

              console.log(`✅ Ride completion SMS sent successfully to manager ${manager.username}`);
            } catch (managerSmsError) {
              console.error(`❌ Failed to send SMS to manager ${manager.username}:`, managerSmsError.message);
            }
          } else {
            console.warn(`⚠️ Manager ${manager.username} has no phone number`);
          }
        });

        // Wait for all manager SMS to complete
        await Promise.allSettled(managerSMSPromises);
        console.log("✅ All manager SMS notifications processed");
      } else {
        console.warn("⚠️ No managers found in the system");
      }
    } catch (smsError) {
      console.error("❌ Failed to send ride completion SMS to managers:", smsError.message);
      // Don't fail the completion if SMS fails - just log the error
    }

    // Send completion confirmation to customer/user
    if (userMobile) {
      try {
        let cleanUserMobile = userMobile.toString().replace(/\D/g, '');
        
        if (cleanUserMobile.startsWith('91')) {
          cleanUserMobile = cleanUserMobile;
        } else if (cleanUserMobile.length === 10) {
          cleanUserMobile = `91${cleanUserMobile}`;
        } else {
          cleanUserMobile = `91${cleanUserMobile.replace(/^91/, "")}`;
        }

        console.log("Sending ride completion SMS to user:", {
          customerMobile: cleanUserMobile,
          userName,
          scheduledTime,
          bookingType: isGuestBooking ? 'guest' : 'regular'
        });

        await RideCompletionUser_SMS(cleanUserMobile, userName, scheduledTime);
        
        console.log("✅ Ride completion user SMS sent successfully");
        
      } catch (customerSmsError) {
        console.error("❌ Failed to send completion SMS to customer:", customerSmsError.message);
      }
    }

    res.json({ 
      message: "Booking marked as completed successfully", 
      booking: populatedBooking 
    });

  } catch (err) {
    console.error("Error completing booking:", err);
    res.status(500).json({ error: err.message });
  }
};

//cancel booking
const cancelBooking = async (req, res) => {
  const { bookingId } = req.body;

  try {
    
    const booking = await Booking.findById(bookingId)
      .populate("vehicleId");
    
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
    let shouldSendSMS = false;
    let shouldNotifyDriver = false;
    let bookingOwner = null;

    // Get the booking owner details for SMS
    if (booking.userId) {
      bookingOwner = await User.findById(booking.userId);
    }

    // Check if booking has a driver assigned (for driver notification)
    // Since driverId might be a simple field, check if it exists
    if (booking.driverId && booking.status === "approved") {
      shouldNotifyDriver = true;
    }

    // Allow managers to cancel anything
    if (user.role === "manager") {
      booking.status = "cancelled";
      modified = true;
      shouldSendSMS = true;

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
        booking.ownerCancelled = true;
        // For shared rides, if owner cancels, still send SMS to owner
        shouldSendSMS = true;
      } else {
        booking.status = "cancelled";
        shouldSendSMS = true;
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
        // When passenger cancels, send SMS to booking owner
        shouldSendSMS = true;
        // Don't notify driver for individual passenger cancellation unless it's the last passenger
        if (booking.passengers.length === 0) {
          shouldNotifyDriver = true;
        } else {
          shouldNotifyDriver = false;
        }
      } else {
        return res.status(403).json({ error: "You are not part of this booking." });
      }
    }

    if (modified) {
      await booking.save();

      // Release vehicle if booking is fully cancelled
      if (booking.status === "cancelled" && booking.vehicleId) {
        await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'available' });
      }

      // Send SMS to the booking owner (the person who created the booking)
      if (shouldSendSMS && bookingOwner && bookingOwner.number) {
        try {
          // Clean and format the mobile number
          let ownerMobile = bookingOwner.number.toString().replace(/\D/g, ''); // Remove non-digits
          
          // Ensure it starts with country code
          if (ownerMobile.startsWith('91')) {
            ownerMobile = ownerMobile;
          } else if (ownerMobile.length === 10) {
            ownerMobile = `91${ownerMobile}`;
          } else {
            console.warn(`Invalid mobile number format: ${bookingOwner.number}`);
            ownerMobile = `91${ownerMobile.replace(/^91/, "")}`;
          }

          const ownerName = bookingOwner.username || "User";
          const destination = booking.location || "your destination";
          const time = booking.scheduledAt
            ? new Date(booking.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "N/A";

          // console.log("Sending Ride Cancelled SMS to booking owner:", { 
          //   mobile: ownerMobile, 
          //   ownerName, 
          //   destination, 
          //   time,
          //   cancelledBy: username,
          //   cancelledByRole: user.role === "manager" ? "manager" : (booking.userId?.toString?.() === userIdStr ? "owner" : "passenger")
          // });

          await sendRideCancelledUserSMS(ownerMobile, ownerName, destination, time);
          // console.log("✅ Ride Cancelled SMS sent to owner successfully");
        } catch (smsErr) {
          console.error("❌ Failed to send Ride Cancelled SMS to owner:", smsErr.message);
          // Don't fail the entire operation if SMS fails
        }
      } else {
        // console.log("Owner SMS not sent - conditions not met:", {
        //   shouldSendSMS,
        //   hasBookingOwner: !!bookingOwner,
        //   hasOwnerNumber: !!(bookingOwner?.number)
        // });
      }

      // Send SMS to driver if ride is cancelled and driver was assigned
      // Since we can't populate driverId, we need to get driver info from the vehicle
      if (shouldNotifyDriver && booking.vehicleId) {
        try {
          // Get driver mobile from the vehicle record
          const driverMobile = booking.vehicleId.driverNumber;
          
          if (driverMobile) {
            // Clean and format driver mobile number
            let cleanDriverMobile = driverMobile.toString().replace(/\D/g, '');
            
            if (cleanDriverMobile.startsWith('91')) {
              cleanDriverMobile = cleanDriverMobile;
            } else if (cleanDriverMobile.length === 10) {
              cleanDriverMobile = `91${cleanDriverMobile}`;
            } else {
              console.warn(`Invalid driver mobile number format: ${driverMobile}`);
              cleanDriverMobile = `91${cleanDriverMobile.replace(/^91/, "")}`;
            }

            const destination = booking.location || "Destination";
            const time = booking.scheduledAt
              ? new Date(booking.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
              : "N/A";
            
            // For shared rides, get all customer names; for individual rides, get the owner name
            let customerName;
            if (booking.isSharedRide && booking.passengers && booking.passengers.length > 0) {
              customerName = booking.passengers
                .map(p => p.name || p.passengerName || "Passenger")
                .join(", ");
            } else {
              customerName = bookingOwner?.username || "Customer";
            }

            const vehicleName = booking.vehicleId?.number || 
                               booking.vehicleId?.name || 
                               "Vehicle";

            console.log("Sending Driver Ride Cancel SMS:", {
              mobile: cleanDriverMobile,
              destination,
              time,
              customerName,
              vehicleName,
              bookingId: booking._id
            });

            await sendDriverRide_CancelSMS(
              cleanDriverMobile,
              destination,
              time,
              customerName,
              vehicleName
            );
            console.log("✅ Driver Ride Cancel SMS sent successfully");
          } else {
            console.log("Driver mobile number not found in vehicle record");
          }
        } catch (driverSmsErr) {
          console.error("❌ Failed to send Driver Ride Cancel SMS:", driverSmsErr.message);
          // Don't fail the entire operation if SMS fails
        }
      } else {
        console.log("Driver SMS not sent - conditions not met:", {
          shouldNotifyDriver,
          hasVehicle: !!booking.vehicleId,
          bookingStatus: booking.status
        });
      }

      return res.json({ 
        message: "Booking cancelled successfully.",
        notificationsSent: {
          ownerNotified: shouldSendSMS && !!bookingOwner?.number,
          driverNotified: shouldNotifyDriver && !!booking.vehicleId?.driverNumber
        }
      });
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

    // Validate that primary booking has driver details for SMS notification
    if (!primaryBooking.driverName || !primaryBooking.driverNumber || !primaryBooking.vehicleName) {
      console.warn("Primary booking missing driver details:", {
        driverName: primaryBooking.driverName,
        driverNumber: primaryBooking.driverNumber,
        vehicleName: primaryBooking.vehicleName,
        status: primaryBooking.status
      });
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

    // Send SMS notifications to all users whose rides are being merged
    try {
      // Use the complete merged booking details (freshly fetched from database)
      const destination = completeMergedBooking.location || "destination";
      const scheduledTime = new Date(completeMergedBooking.scheduledAt).toLocaleString("en-IN", { 
        timeZone: "Asia/Kolkata" 
      });
      
      const driverName = completeMergedBooking.driverName || "Driver not assigned";
      const driverContact = completeMergedBooking.driverNumber || "Contact not available";
      const vehicleName = completeMergedBooking.vehicleName || "Vehicle not assigned";

      // console.log("SMS notification details from completed merge:", {
      //   destination,
      //   scheduledTime,
      //   driverName,
      //   driverContact,
      //   vehicleName,
      //   mergedBookingId: completeMergedBooking._id
      // });

      // console.log("Sending ride merge SMS notifications:", {
      //   destination,
      //   scheduledTime,
      //   driverName,
      //   driverContact,
      //   vehicleName,
      //   usersToNotify: bookingsToMerge.length
      // });

      // Send SMS to all users whose rides are being merged
      for (const booking of bookingsToMerge) {
        if (booking.userId && booking.userId.number) {
          try {
            // Clean and format user's mobile number
            let userMobile = booking.userId.number.toString().replace(/\D/g, '');
            
            if (userMobile.startsWith('91')) {
              userMobile = userMobile;
            } else if (userMobile.length === 10) {
              userMobile = `91${userMobile}`;
            } else {
              userMobile = `91${userMobile.replace(/^91/, "")}`;
            }

            // console.log(`Sending merge notification to user: ${booking.userId.username} (${userMobile})`);

            await sendRideMergeNotificationSMS(
              userMobile,
              destination,
              scheduledTime,
              driverName,
              driverContact,
              vehicleName
            );

            // console.log(`✅ Merge SMS sent successfully to: ${booking.userId.username}`);
          } catch (userSmsError) {
            console.error(`❌ Failed to send merge SMS to user ${booking.userId.username}:`, userSmsError.message);
            // Continue with other users even if one fails
          }
        } else {
          console.warn(`User or phone number missing for booking: ${booking._id}`);
        }
      }
    } catch (mergeNotificationError) {
      console.error("Error sending merge notifications:", mergeNotificationError.message);
      // Don't fail the merge operation if SMS fails
    }

    try {
      if (completeMergedBooking.driverNumber) {
        // Clean and format driver's mobile number
        let driverMobile = completeMergedBooking.driverNumber.toString().replace(/\D/g, '');
        
        if (driverMobile.startsWith('91')) {
          driverMobile = driverMobile;
        } else if (driverMobile.length === 10) {
          driverMobile = `91${driverMobile}`;
        } else {
          driverMobile = `91${driverMobile.replace(/^91/, "")}`;
        }

        const destination = completeMergedBooking.location || "Destination";
        const time = new Date(completeMergedBooking.scheduledAt).toLocaleString("en-IN", { 
          timeZone: "Asia/Kolkata" 
        });
        const vehicleName = completeMergedBooking.vehicleName || "Vehicle";
        
        // Get primary customer details (the booking owner)
        const primaryCustomerName = completeMergedBooking.userId?.username || "Customer";
        const primaryCustomerContact = completeMergedBooking.userId?.number || "Contact not available";

        // console.log("Sending merged ride assignment SMS to driver:", {
        //   driverNumber: driverMobile,
        //   destination,
        //   time,
        //   primaryCustomerName,
        //   primaryCustomerContact,
        //   vehicleName
        // });

        // Use existing driver SMS template with primary customer info
        await sendDriverRideAssignmentSMS(
          driverMobile, 
          destination, 
          time, 
          primaryCustomerName,
          primaryCustomerContact,
          vehicleName
        );
        
        // console.log("✅ Driver merged ride assignment SMS sent successfully");
      } else {
        console.warn("Driver mobile number not available for merged ride notification");
      }
    } catch (driverSmsErr) {
      console.error("❌ Failed to send driver merged ride assignment SMS:", driverSmsErr.message);
      // Don't fail the merge operation if driver SMS fails
    }
    
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
      
    try {
      // Check if vehicle/driver was changed
      const vehicleChanged = (
        vehicleId !== undefined && 
        vehicleId !== originalValues.vehicleId?.toString()
      );

      const driverChanged = (
        driverName !== undefined && 
        driverName !== originalValues.driverName
      ) || (
        driverNumber !== undefined && 
        driverNumber !== originalValues.driverNumber
      );

      // Prepare common ride details
      const destination = booking.location || "destination";
      const time = new Date(booking.scheduledAt).toLocaleString("en-IN", { 
        timeZone: "Asia/Kolkata" 
      });

      // Get customer details based on booking type
      let customerName, customerContact;
      
      if (isGuestBooking) {
        customerName = booking.guestName || "Guest Customer";
        customerContact = booking.guestPhone || "Contact not available";
      } else {
        // For regular bookings, populate userId if needed
        const populatedBooking = await Booking.findById(bookingId).populate("userId", "username number");
        customerName = populatedBooking.userId?.username || "Customer";
        customerContact = populatedBooking.userId?.number || "Contact not available";
      }

      // 1. Handle vehicle/driver change scenario
      if (vehicleChanged || driverChanged) {
        
        // Send "NEW ASSIGNMENT" message to old driver (reusing existing template)
        // This effectively cancels their previous assignment
        if (originalValues.driverNumber) {
          try {
            let oldDriverMobile = originalValues.driverNumber.toString().replace(/\D/g, '');
            
            if (oldDriverMobile.startsWith('91')) {
              oldDriverMobile = oldDriverMobile;
            } else if (oldDriverMobile.length === 10) {
              oldDriverMobile = `91${oldDriverMobile}`;
            } else {
              oldDriverMobile = `91${oldDriverMobile.replace(/^91/, "")}`;
            }

            console.log("Sending cancellation SMS to old driver:", {
              oldDriverNumber: oldDriverMobile,
              oldDriverName: originalValues.driverName,
              destination,
              time,
              customerName,
              oldVehicleName: originalValues.vehicleName
            });

            // Use your new driver cancel template
            await sendDriverRide_CancelSMS(
              oldDriverMobile,
              destination,
              time,
              customerName,
              originalValues.vehicleName || "Vehicle"
            );

            // console.log("✅ Old driver cancellation SMS sent successfully");
          } catch (oldDriverSmsErr) {
            console.error("❌ Failed to send cancellation SMS to old driver:", oldDriverSmsErr.message);
          }
        }

      // 1. When sending to NEW driver 
      if (booking.driverNumber) {
        try {
          let newDriverMobile = booking.driverNumber.toString().replace(/\D/g, '');
          
          if (newDriverMobile.startsWith('91')) {
            newDriverMobile = newDriverMobile;
          } else if (newDriverMobile.length === 10) {
            newDriverMobile = `91${newDriverMobile}`;
          } else {
            newDriverMobile = `91${newDriverMobile.replace(/^91/, "")}`;
          }

          const newVehicleName = booking.vehicleName || "Vehicle";
          
          // 🔥 FIX: Handle pickupLocation properly based on booking type
          let effectivePickupLocation;
          if (isGuestBooking) {
            effectivePickupLocation = null; // Guest bookings don't have pickup location
          } else {
            effectivePickupLocation = booking.pickupLocation || "To be confirmed";
          }

          console.log("Sending new assignment SMS to new driver:", {
            newDriverNumber: newDriverMobile,
            newDriverName: booking.driverName,
            destination,
            pickupLocation: effectivePickupLocation,
            time,
            customerName,
            customerContact,
            newVehicleName
          });

          await sendDriverRideAssignmentSMS(
            newDriverMobile,
            destination,
            effectivePickupLocation, // 🔥 FIX: Pass proper pickup location
            time,
            customerName,
            customerContact,
            newVehicleName
          );

          console.log("✅ New driver assignment SMS sent successfully");
        } catch (newDriverSmsErr) {
          console.error("❌ Failed to send assignment SMS to new driver:", newDriverSmsErr.message);
        }
      }

      } else {
        // 2. Handle other updates (time, location, etc.) - send assignment message to same driver
        const criticalDetailsChanged = (
          scheduledAt !== undefined || 
          location !== undefined ||
          (isGuestBooking && (guestName !== undefined || guestPhone !== undefined))
        );

        // 2. When sending UPDATE to current driver (around line 280):
        if (criticalDetailsChanged && booking.driverNumber) {
          try {
            let driverMobile = booking.driverNumber.toString().replace(/\D/g, '');
            
            if (driverMobile.startsWith('91')) {
              driverMobile = driverMobile;
            } else if (driverMobile.length === 10) {
              driverMobile = `91${driverMobile}`;
            } else {
              driverMobile = `91${driverMobile.replace(/^91/, "")}`;
            }

            const vehicleName = booking.vehicleName || "Vehicle";
            
            // 🔥 FIX: Handle pickupLocation properly based on booking type
            let effectivePickupLocation;
            if (isGuestBooking) {
              effectivePickupLocation = null; // Guest bookings don't have pickup location
            } else {
              effectivePickupLocation = booking.pickupLocation || "To be confirmed";
            }

            console.log("Sending updated assignment SMS to current driver:", {
              driverNumber: driverMobile,
              destination,
              pickupLocation: effectivePickupLocation,
              time,
              customerName,
              customerContact,
              vehicleName,
              reason: "Booking details updated"
            });

            await sendDriver_RideUpdateSMS(
              driverMobile,
              destination,
              effectivePickupLocation,
              time,
              customerName,
              customerContact,
              vehicleName
            );

            console.log("✅ Driver update SMS sent successfully");
          } catch (updateSmsErr) {
            console.error("❌ Failed to send update SMS to driver:", updateSmsErr.message);
          }
        }
      }

      // 3. Notify customer if critical details changed
      const customerCriticalDetailsChanged = (
        scheduledAt !== undefined || 
        location !== undefined || 
        driverName !== undefined || 
        driverNumber !== undefined ||
        vehicleChanged
      );
      if (customerCriticalDetailsChanged) {
        let customerMobile;

        if (isGuestBooking) {
          customerMobile = booking.guestPhone;
        } else {
          const populatedBooking = await Booking.findById(bookingId).populate("userId", "username number");
          customerMobile = populatedBooking.userId?.number;
        }

        if (customerMobile) {
          try {
            let cleanCustomerMobile = customerMobile.toString().replace(/\D/g, '');
            
            if (cleanCustomerMobile.startsWith('91')) {
              cleanCustomerMobile = cleanCustomerMobile;
            } else if (cleanCustomerMobile.length === 10) {
              cleanCustomerMobile = `91${cleanCustomerMobile}`;
            } else {
              cleanCustomerMobile = `91${cleanCustomerMobile.replace(/^91/, "")}`;
            }

            const driverName = booking.driverName || "Driver";
            const driverContact = booking.driverNumber || "Contact not available"; // 🔥 FIX: Use booking.driverNumber, not undefined driverContact
            const vehicleName = booking.vehicleName || "Vehicle";
            const pickupLocation = booking.pickupLocation || "Pickup location"; // 🔥 FIX: Define pickupLocation

            console.log("Sending booking update SMS to customer:", {
              customerMobile: cleanCustomerMobile,
              customerName,
              driverName,
              driverContact, // Now properly defined
              vehicleName,
              pickupLocation, // Now properly defined
              reason: "Booking details updated"
            });

            // 🔥 FIX: Pass all required parameters in correct order
            await sendRide_UpdateNotificationSMS(
              cleanCustomerMobile,
              destination,
              time,
              driverName,
              driverContact, // Now properly defined
              vehicleName,
              pickupLocation // Now properly defined
            );
            
            console.log("✅ Customer update notification SMS sent successfully");
          } catch (customerSmsErr) {
            console.error("❌ Failed to send customer update SMS:", customerSmsErr.message);
          }
        }
      }
    } catch (smsError) {
      console.error("❌ Failed to send SMS notifications:", smsError.message);
      // Don't fail the edit operation if SMS fails - just log the error
    }

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
    
    // Format scheduled time for SMS
    const scheduledTime = new Date(sharedBooking.scheduledAt || passengerToRemove.bookingTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'short',
      timeStyle: 'short'
    });
    
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

    // Send SMS notification to removed passenger
    let smsNotificationSent = false;
    try {
      if (passengerToRemove.mobile) {
        await sendPassenger_RemovedSMS(
          passengerToRemove.mobile,
          passengerToRemove.name || passengerToRemove.passengerName || "Passenger",
          scheduledTime
        );
        console.log(`Passenger removed SMS sent to: ${passengerToRemove.mobile}`);
        smsNotificationSent = true;
      } else {
        console.warn("No mobile number found for removed passenger");
      }
    } catch (smsError) {
      console.error(`Failed to send passenger removed SMS to ${passengerToRemove.mobile}:`, smsError);
      // Continue processing even if SMS fails
    }

    // Remove passenger from shared booking
    sharedBooking.passengers.splice(passengerIndex, 1);
    
    // Update total members
    const newTotalMembers = sharedBooking.passengers.reduce((sum, p) => sum + (p.members || 1), 0);
    sharedBooking.members = newTotalMembers;

    // If only one passenger left, convert back to individual booking
    let convertedToIndividual = false;
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
      convertedToIndividual = true;
      
      console.log("Shared ride converted to individual booking as only one passenger remains");
    }

    await sharedBooking.save();

    res.status(200).json({
      message: "Passenger removed successfully",
      individualBooking,
      updatedSharedBooking: sharedBooking,
      removedPassenger: {
        name: passengerToRemove.name || passengerToRemove.passengerName,
        mobile: passengerToRemove.mobile,
        smsNotificationSent
      },
      convertedToIndividual,
      remainingPassengers: sharedBooking.passengers.length
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

      try {
        if (passenger.mobile) {
          await sendSharedRide_UnmergedSMS(
            passenger.mobile,
            passenger.name || passenger.passengerName || "Passenger",
            scheduledTime
          );
          console.log(`Unmerged SMS sent to passenger: ${passenger.mobile}`);
        }
      } catch (smsError) {
        console.error(`Failed to send unmerged SMS to passenger ${passenger.mobile}:`, smsError);
        // Continue processing even if SMS fails
      }
    }

    // Mark shared booking as inactive
    sharedBooking.status = "cancelled";
    sharedBooking.isActive = false;
    await sharedBooking.save();

    // Release the vehicle
    if (sharedBooking.vehicleId) {
      await Vehicle.findByIdAndUpdate(sharedBooking.vehicleId, { status: 'available' });
    }

    if (sharedBooking.driverId && sharedBooking.driverId.mobile) {
      try {
        const customerNames = sharedBooking.passengers
          .map(p => p.name || p.passengerName || "Passenger")
          .join(", ");
        
        await sendDriverRide_CancelSMS(
          sharedBooking.driverId.mobile,
          sharedBooking.location || "Destination", // Use actual destination
          scheduledTime,
          customerNames,
          sharedBooking.vehicleId?.vehicleNumber || sharedBooking.vehicleId?.name || "Vehicle"
        );
        console.log(`Driver cancellation SMS sent to: ${sharedBooking.driverId.mobile}`);
      } catch (smsError) {
        console.error(`Failed to send driver cancellation SMS:`, smsError);
        // Continue processing even if SMS fails
      }
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

const getBookingStatistics = async (req, res) => {
  // console.log('=== BOOKING STATS DEBUG START ===');
  // console.log('Timestamp:', new Date().toISOString());
  // console.log('Request method:', req.method);
  // console.log('Request URL:', req.originalUrl);
  // console.log('User from auth middleware:', {
  //   userId: req.userId,
  //   userRole: req.userRole || req.role
  // });
  
  try {
    // console.log('Step 1: Checking Booking model...');
    if (!Booking) {
      throw new Error('Booking model is not imported or undefined');
    }
    // console.log('✓ Booking model exists');
    
    // console.log('Step 2: Attempting database query...');
    const startTime = Date.now();
    const allBookings = await Booking.find({});
    const queryTime = Date.now() - startTime;
    // console.log(`✓ Database query completed in ${queryTime}ms`);
    // console.log(`✓ Found ${allBookings.length} total bookings`);
    
    if (allBookings.length > 0) {
      // console.log('Step 3: Analyzing booking structure...');
      const sampleBooking = allBookings[0];
      // console.log('Sample booking keys:', Object.keys(sampleBooking.toObject ? sampleBooking.toObject() : sampleBooking));
      // console.log('Sample booking status:', sampleBooking.status);
      // console.log('Sample booking isSharedRide:', sampleBooking.isSharedRide);
      
      // Check all unique statuses in the database
      const uniqueStatuses = [...new Set(allBookings.map(b => b.status))];
      // console.log('Unique statuses found:', uniqueStatuses);
    }
    
    // console.log('Step 4: Calculating statistics...');
    
    // Calculate with detailed logging
    const pending = allBookings.filter(booking => {
      const isPending = booking.status === 'pending';
      return isPending;
    });
    // console.log(`Pending bookings: ${pending.length}`);
    
    const approved = allBookings.filter(booking => booking.status === 'approved');
    // console.log(`Approved bookings: ${approved.length}`);
    
    const confirmed = allBookings.filter(booking => booking.status === 'confirmed');
    // console.log(`Confirmed bookings: ${confirmed.length}`);
    
    const cancelled = allBookings.filter(booking => booking.status === 'cancelled');
    // console.log(`Cancelled bookings: ${cancelled.length}`);
    
    const completed = allBookings.filter(booking => booking.status === 'completed');
    // console.log(`Completed bookings: ${completed.length}`);
    
    const shared = allBookings.filter(booking => booking.isSharedRide === true);
    // console.log(`Shared bookings: ${shared.length}`);
    
    const stats = {
      total: allBookings.length,
      pending: pending.length,
      approved: approved.length,
      confirmed: confirmed.length,
      cancelled: cancelled.length,
      completed: completed.length,
      shared: shared.length
    };
    
    // console.log('Step 5: Final statistics calculated:', stats);
    // console.log('=== SENDING SUCCESSFUL RESPONSE ===');
    
    res.status(200).json(stats);
    
  } catch (err) {
    // console.log('=== ERROR OCCURRED IN STATS ENDPOINT ===');
    // console.error('Error type:', err.constructor.name);
    // console.error('Error message:', err.message);
    // console.error('Error code:', err.code);
    
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
      // console.error('Database Error Details:', {
      //   name: err.name,
      //   code: err.code,
      //   codeName: err.codeName
      // });
    }
    
    // console.error('Full error stack:', err.stack);
    // console.log('=== ERROR END ===');
    
    res.status(500).json({ 
      error: 'Failed to fetch booking statistics',
      message: err.message,
      type: err.constructor.name
    });
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
  unmergeRide,
  getBookingStatistics
};

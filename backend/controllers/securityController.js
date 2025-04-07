const Booking = require("../models/Booking");

// Mark a vehicle as in or out
const markInOut = async (req, res) => {
  const { bookingId, status } = req.body;
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = status === "in" ? "in" : "out";
    await booking.save();

    // Update vehicle status if marked as "out"
    if (status === "out") {
      const vehicle = await Vehicle.findById(booking.vehicleId);
      if (vehicle) {
        vehicle.status = "available";
        await vehicle.save();
      }
    }

    res.json({ message: `Vehicle marked as ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  markInOut,
};
const mongoose = require("mongoose");
const Booking = require("../models/bookingModel");
const Vehicle = require("../models/vehicleModel");

const autoCompleteBookings = async () => {
    try {
        const now = new Date();

        const bookings = await Booking.find({
            status: { $in: ["approved", "shared", "confirmed"] }
        });

        for (const booking of bookings) {
            const durationHours = booking.duration || 1;
            const scheduledEnd = new Date(booking.scheduledAt.getTime() + durationHours * 60 * 60 * 1000);
            const autoCompleteTime = new Date(scheduledEnd.getTime() + 12 * 60 * 60 * 1000);

            if (now >= autoCompleteTime) {
                booking.status = "completed";
                booking.completedAt = now;
                await booking.save();

                const vehicle = await Vehicle.findById(booking.vehicleId);
                if (vehicle) {
                    vehicle.status = "available";
                    await vehicle.save();
                }

                console.log(`✅ Auto-completed booking ${booking._id}`);
            }
        }
    } catch (err) {
        console.error("Error during auto-complete:", err);
    }
};

module.exports = autoCompleteBookings;

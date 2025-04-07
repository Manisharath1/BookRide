const express = require("express");
const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

// Create a booking
router.post("/create", authMiddleware, bookingController.createBooking);
router.post("/bookGuest", authMiddleware, bookingController.guestBooking);

// Get pending bookings
router.get("/pending", authMiddleware, bookingController.getPendingBookings);

// Approve a booking
router.post("/approve", authMiddleware, bookingController.approveBooking);

router.get("/all", authMiddleware, bookingController.getAllBookings);

router.get("/user", authMiddleware, bookingController.getUserBookings);
router.post("/complete", authMiddleware, bookingController.completeBooking);
router.post("/cancel", authMiddleware, bookingController.cancelBooking);

router.get("/notifications", authMiddleware, bookingController.getNotifications);


module.exports = router;
const express = require("express");
const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

// Create a booking
router.post("/create", authMiddleware, bookingController.createBooking);
router.post("/bookGuest", authMiddleware, bookingController.guestBooking);

// Get pending bookings
router.get("/pending", authMiddleware, bookingController.getPendingBookings);
router.get("/approvedBooking", authMiddleware, bookingController.getApproveBookings);

// Approve a booking
router.post("/approve", authMiddleware, bookingController.approveBooking);

router.get("/all", authMiddleware, bookingController.getAllBookings);

router.get("/user", authMiddleware, bookingController.getUserBookings);
router.post("/complete", authMiddleware, bookingController.completeBooking);
router.post("/cancel", authMiddleware, bookingController.cancelBooking);

router.get("/notifications", authMiddleware, bookingController.getNotifications);
router.put("/reschedule", authMiddleware, bookingController.reschedule);
router.post("/merge", authMiddleware, bookingController.mergeRide);
router.put("/editRide", authMiddleware, bookingController.editRide);

router.get('/view', bookingController.getBookingsByVehicles);
router.get('/stats', authMiddleware, bookingController.getBookingStatistics);
router.get('/:id',  bookingController.getById);

// Add to your booking routes file
router.post('/removePassenger', authMiddleware, bookingController.removePassenger);
router.post('/unmerge', authMiddleware, bookingController.unmergeRide);




// Route to get bookings for a specific vehicle
// router.get('/vehicle/:vehicleNumber', bookingController.getVehicleBookings);



module.exports = router;
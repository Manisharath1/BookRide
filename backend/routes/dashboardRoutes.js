// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
// const { requireAuth, checkRole } = require('../middleware/authMiddleware'); // Adjust based on your auth middleware

// // All dashboard routes should be protected
// router.use(requireAuth);

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get bookings by day
router.get('/bookings-by-day', dashboardController.getBookingsByDay);

// Get driver activity
router.get('/driver-activity', dashboardController.getDriverActivity);

// Get vehicle utilization
router.get('/vehicle-utilization', dashboardController.getVehicleUtilization);

// Get booking status distribution
router.get('/booking-status', dashboardController.getBookingStatusDistribution);

// Get recent bookings
router.get('/recent-bookings', dashboardController.getRecentBookings);

module.exports = router;
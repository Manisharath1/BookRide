// controllers/dashboardController.js
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const User = require('../models/User');

/**
 * Get dashboard statistics
 * @route GET /api/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get available vehicles count
    const availableVehicles = await Vehicle.countDocuments({ 
      status: 'available'
    });

    // Get active bookings count (bookings with status 'approved')
    const activeBookings = await Booking.countDocuments({
      status: { $in: ['approved', 'confirmed', 'shared'] }
    });

    // Get total drivers count (based on vehicles with drivers)
    const totalDrivers = await Vehicle.countDocuments({
      driverName: { $exists: true, $ne: '' }
    });

    // Get completed trips count
    const completedTrips = await Booking.countDocuments({
      status: 'completed'
    });

    // Get pending bookings count
    const pendingBookings = await Booking.countDocuments({
      status: 'pending'
    });

    const confirmedBookings = await Booking.countDocuments({
      status: 'confirmed'
    });

    res.status(200).json({
      availableVehicles,
      activeBookings,
      totalDrivers,
      completedTrips,
      pendingBookings,
      confirmedBookings
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics', error: error.message });
  }
};

/**
 * Get bookings per day for the current week
 * @route GET /api/dashboard/bookings-by-day
 */
exports.getBookingsByDay = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'weekly'; // Get time range from query params
    let results, groupBy, dateFormat, labels;
    
    switch(timeRange) {
      case 'monthly':
        // Get start of current year
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        
        // Month names
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        results = await Booking.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfYear }
            }
          },
          {
            $group: {
              _id: { $month: '$createdAt' }, // 1-12 for Jan-Dec
              bookings: { $sum: 1 }
            }
          },
          {
            $sort: { '_id': 1 }
          }
        ]);
        
        // Initialize counts for all months
        const bookingsByMonth = monthNames.map((month, index) => ({
          timeUnit: month,
          bookings: 0
        }));
        
        // Fill in actual booking counts
        results.forEach(result => {
          const monthIndex = result._id - 1; // Convert 1-12 to 0-11 index
          if (monthIndex >= 0 && monthIndex < 12) {
            bookingsByMonth[monthIndex].bookings = result.bookings;
          }
        });
        
        return res.status(200).json(bookingsByMonth);
        
      case 'yearly':
        // Get current year and 4 years before
        const currentYear = new Date().getFullYear();
        const fiveYearsAgo = new Date(currentYear - 4, 0, 1);
        
        results = await Booking.aggregate([
          {
            $match: {
              createdAt: { $gte: fiveYearsAgo }
            }
          },
          {
            $group: {
              _id: { $year: '$createdAt' },
              bookings: { $sum: 1 }
            }
          },
          {
            $sort: { '_id': 1 }
          }
        ]);
        
        // Initialize counts for the last 5 years
        const bookingsByYear = [];
        for (let i = 0; i < 5; i++) {
          bookingsByYear.push({
            timeUnit: (currentYear - 4 + i).toString(),
            bookings: 0
          });
        }
        
        // Fill in actual booking counts
        results.forEach(result => {
          const yearIndex = result._id - (currentYear - 4);
          if (yearIndex >= 0 && yearIndex < 5) {
            bookingsByYear[yearIndex].bookings = result.bookings;
          }
        });
        
        return res.status(200).json(bookingsByYear);
        
      case 'weekly':
      default:
        // Get start of current week (Sunday)
        const today = new Date();
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay());
        firstDay.setHours(0, 0, 0, 0);
        
        // Day names
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        results = await Booking.aggregate([
          {
            $match: {
              createdAt: { 
                $gte: firstDay,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // until tomorrow
              }
            }
          },
          {
            $group: {
              _id: { $dayOfWeek: '$createdAt' }, // 1 for Sunday, 2 for Monday, etc.
              bookings: { $sum: 1 }
            }
          },
          {
            $sort: { '_id': 1 }
          }
        ]);
        
        // Initialize counts for all days of the week
        const bookingsByDay = dayNames.map((day, index) => ({
          timeUnit: day,  // Changed from 'day' to 'timeUnit'
          bookings: 0
        }));
        
        // Fill in actual booking counts
        results.forEach(result => {
          const dayIndex = result._id - 1; // Convert 1-7 to 0-6 index
          if (dayIndex >= 0 && dayIndex < 7) {
            bookingsByDay[dayIndex].bookings = result.bookings;
          }
        });
        
        return res.status(200).json(bookingsByDay);
    }
    
  } catch (error) {
    console.error('Error fetching bookings by time period:', error);
    res.status(500).json({ message: 'Failed to fetch booking data', error: error.message });
  }
};

/**
 * Get driver activity stats
 * @route GET /api/dashboard/driver-activity
 */
exports.getDriverActivity = async (req, res) => {
  try {
    // Get all bookings that have been assigned a driver
    const bookings = await Booking.find({
      driverName: { $exists: true, $ne: '' },
      status: { $in: ['approved', 'confirmed'] }
    }).select('driverName');

    // Count bookings per driver
    const driverCounts = {};
    bookings.forEach(booking => {
      if (booking.driverName) {
        if (!driverCounts[booking.driverName]) {
          driverCounts[booking.driverName] = 0;
        }
        driverCounts[booking.driverName]++;
      }
    });

    // Convert to array format needed for frontend
    const driverActivity = Object.keys(driverCounts).map(driver => ({
      driver,
      bookings: driverCounts[driver]
    }));

    // Sort by booking count (highest first) and limit to top 5
    driverActivity.sort((a, b) => b.bookings - a.bookings);
    const topDrivers = driverActivity.slice(0, 5);

    res.status(200).json(topDrivers);
  } catch (error) {
    console.error('Error fetching driver activity:', error);
    res.status(500).json({ message: 'Failed to fetch driver activity', error: error.message });
  }
};

/**
 * Get vehicle utilization data
 * @route GET /api/dashboard/vehicle-utilization
 */
exports.getVehicleUtilization = async (req, res) => {
  try {
    // Count vehicles by status
    const vehicleStats = await Vehicle.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format the data for the frontend
    const vehicleUtilization = vehicleStats.map(stat => ({
      status: stat._id,
      count: stat.count
    }));

    res.status(200).json(vehicleUtilization);
  } catch (error) {
    console.error('Error fetching vehicle utilization:', error);
    res.status(500).json({ message: 'Failed to fetch vehicle utilization', error: error.message });
  }
};

/**
 * Get booking status distribution
 * @route GET /api/dashboard/booking-status
 */
exports.getBookingStatusDistribution = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'weekly';
    let timeFilter = {};
    
    // Determine the time range filter
    switch(timeRange) {
      case 'yearly':
        // Last 5 years
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        timeFilter = { createdAt: { $gte: fiveYearsAgo } };
        break;
        
      case 'monthly':
        // Current year
        const startOfYear = new Date();
        startOfYear.setMonth(0, 1); // January 1st of current year
        startOfYear.setHours(0, 0, 0, 0);
        timeFilter = { createdAt: { $gte: startOfYear } };
        break;
        
      case 'weekly':
      default:
        // Current week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // First day of current week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        timeFilter = { createdAt: { $gte: startOfWeek } };
        break;
    }
    
    // Get counts of bookings by status with the appropriate time filter
    const bookingStats = await Booking.aggregate([
      {
        $match: timeFilter
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 } // Sort by count in descending order
      }
    ]);
    
    // Format the data for the frontend
    const bookingStatus = bookingStats.map(stat => ({
      status: stat._id,
      count: stat.count
    }));
    
    res.status(200).json(bookingStatus);
  } catch (error) {
    console.error('Error fetching booking status distribution:', error);
    res.status(500).json({ message: 'Failed to fetch booking status distribution', error: error.message });
  }
};
/**
 * Get recent bookings
 * @route GET /api/dashboard/recent-bookings
 */
exports.getRecentBookings = async (req, res) => {
  try {
    // Get the 5 most recent pending bookings
    const recentBookings = await Booking.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('location status scheduledAt vehicleName driverName isGuestBooking guestName userId')
      .populate('userId', 'username');

    // Format the data for the frontend
    const formattedBookings = recentBookings.map(booking => ({
      id: booking._id,
      location: booking.location,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      vehicle: booking.vehicleName || 'Not assigned',
      driver: booking.driverName || 'Not assigned',
      user: booking.isGuestBooking ? booking.guestName : (booking.userId ? booking.userId.username : 'Unknown')
    }));

    res.status(200).json(formattedBookings);
  } catch (error) {
    console.error('Error fetching recent pending bookings:', error);
    res.status(500).json({ message: 'Failed to fetch recent pending bookings', error: error.message });
  }
};
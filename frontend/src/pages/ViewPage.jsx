import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Calendar, Clock, MapPin, AlertCircle, CheckCircle, User, Truck, ViewIcon, LayoutDashboardIcon } from 'lucide-react';
import axios from 'axios';

const ViewPage = () => {
  const [vehicleBookings, setVehicleBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openVehicleId, setOpenVehicleId] = useState(null);
  const [openBookingIds, setOpenBookingIds] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch bookings from public endpoint
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/dashboard/recent-bookings`)
      .then(response => {
        // console.log("API Response:", response.data);
        
        if (!response.data || !Array.isArray(response.data)) {
          setError('Invalid data format received from server');
          setLoading(false);
          return;
        }
        
        // Transform and group bookings by vehicle
        const bookingsByVehicle = {};
        
        response.data.forEach(booking => {
          // Create a vehicle ID from the vehicle name or use 'unknown'
          const vehicleId = booking.vehicle && booking.vehicle !== 'Not assigned' 
            ? booking.vehicle.replace(/\s+/g, '_').toLowerCase() 
            : 'unknown';
          
          if (!bookingsByVehicle[vehicleId]) {
            bookingsByVehicle[vehicleId] = {
              vehicleId: vehicleId,
              vehicleName: booking.vehicle && booking.vehicle !== 'Not assigned' 
                ? booking.vehicle 
                : 'Unknown Vehicle',
              bookings: []
            };
          }
          
          // Format the booking data to match frontend expectations
          const formattedBooking = {
            id: booking.id,
            vehicleId: vehicleId,
            vehicleName: booking.vehicle || 'Unknown Vehicle',
            vehicleNumber: 'No Registration',
            
            // Format date and time from scheduledAt
            date: booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : 'Not specified',
            
            time: booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Not specified',
            
            // Map backend fields to frontend expected fields
            username: booking.user || 'Unknown Guest',
            drivername: booking.driver && booking.driver !== 'Not assigned' 
              ? booking.driver 
              : 'Not Assigned',
            number: 'Not Provided', // Backend doesn't provide contact number
            location: booking.location || 'Not specified',
            reason: 'Not provided', // Backend doesn't provide reason
            status: booking.status || 'Unknown'
          };
          
          bookingsByVehicle[vehicleId].bookings.push(formattedBooking);
        });
        
        // Convert to array and sort by vehicle name
        const groupedBookings = Object.values(bookingsByVehicle).sort((a, b) => 
          a.vehicleName.localeCompare(b.vehicleName)
        );
        
        setVehicleBookings(groupedBookings);
        setLoading(false);
      })
      .catch(err => {
        console.error("API Error:", err);
        setError(`Failed to fetch bookings: ${err.response?.data?.message || err.message}`);
        setLoading(false);
      });
  }, []);

  const toggleVehicleAccordion = (vehicleId) => {
    setOpenVehicleId(openVehicleId === vehicleId ? null : vehicleId);
  };

  const toggleBookingAccordion = (bookingId) => {
    setOpenBookingIds(prev => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> {status}</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {status}</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {status}</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">{status || 'Unknown'}</span>;
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboardIcon size={20} /> },
    { name: "View Bookings", path: "/view", icon: <ViewIcon size={20} /> },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <div className="relative w-full z-10">
        <div className="h-20 bg-customBlue ">
          <div className="mx-auto flex justify-between items-center h-full px-4">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-semibold text-2xl">Vehicle Booking System</h2>
            </div>
            <div className="space-x-4">
              <Link to="/login" className="bg-white text-blue-700 px-4 py-2 rounded-md hover:bg-gray-100 font-medium transition-colors">Login</Link>
              <Link to="/register" className="bg-white text-red-700 px-4 py-2 rounded-md hover:bg-gray-100 font-medium transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-col w-64 bg-customBlue text-white flex-shrink-0 overflow-y-auto">
          <nav className="py-2">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="flex items-center py-2 px-4 mx-2 rounded-md text-gray-300 hover:bg-blue-900 transition-colors"
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 max-w-8xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Vehicle Bookings</h2>
            <div className="text-sm text-gray-600">
              Total: {vehicleBookings.reduce((sum, vehicle) => sum + vehicle.bookings.length, 0)} bookings
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p className="font-medium">Error Loading Bookings</p>
              </div>
              <p className="mt-2 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : vehicleBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-gray-600">No vehicle bookings are currently available. Check back later or contact support if this seems incorrect.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {vehicleBookings.map((vehicleGroup) => (
                <div key={vehicleGroup.vehicleId} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                  {/* Vehicle Header */}
                  <button 
                    className="w-full flex justify-between items-center p-4 text-left bg-blue-50 hover:bg-blue-100 transition-colors"
                    onClick={() => toggleVehicleAccordion(vehicleGroup.vehicleId)}
                  >
                    <div className="flex items-center">
                      <Truck className="h-6 w-6 text-blue-600 mr-3" />
                      <div>
                        <div className="font-medium text-lg text-blue-900">{vehicleGroup.vehicleName}</div>
                        <div className="text-sm text-blue-700">{vehicleGroup.vehicleNumber}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {vehicleGroup.bookings.length} {vehicleGroup.bookings.length === 1 ? 'Booking' : 'Bookings'}
                      </span>
                      {openVehicleId === vehicleGroup.vehicleId ? 
                        <ChevronUp className="h-5 w-5 text-blue-500" /> : 
                        <ChevronDown className="h-5 w-5 text-blue-500" />
                      }
                    </div>
                  </button>
                  
                  {/* Bookings List */}
                  {openVehicleId === vehicleGroup.vehicleId && (
                    <div className="p-4">
                      <div className="space-y-3">
                        {vehicleGroup.bookings.map((booking) => (
                          <div key={booking.id} className="border border-gray-100 rounded-lg overflow-hidden">
                            <button 
                              className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 transition-colors"
                              onClick={() => toggleBookingAccordion(booking.id)}
                            >
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                                  <span className="font-medium text-gray-700">{booking.date}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                                  <span className="text-gray-700">{booking.time}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                {getStatusBadge(booking.status)}
                                {openBookingIds[booking.id] ? 
                                  <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                }
                              </div>
                            </button>
                            
                            {/* Enhanced Booking Details */}
                            {openBookingIds[booking.id] && (
                              <div className="px-4 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                                {/* Header Section */}
                                <div className="mb-4 pb-3 border-b border-gray-200">
                                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                                    Booking Details
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-1">Complete information about this booking</p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                  {/* Left Column - Personnel Information */}
                                    
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                      <div className="flex items-start">
                                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                                          <User className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Booked By</p>
                                          <p className="text-sm font-semibold text-gray-900 mt-1">{booking.username}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                      <div className="flex items-start">
                                        <div className="bg-green-100 p-2 rounded-full mr-3">
                                          <User className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Assigned Driver</p>
                                          <p className="text-sm font-semibold text-gray-900 mt-1">{booking.drivername}</p>
                                        </div>
                                        {booking.drivername === 'Not Assigned' ? (
                                          <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ Driver assignment pending</p>
                                        ) : (
                                          <p className="text-xs text-green-600 mt-1 font-medium">✓ Driver assigned</p>
                                        )}
                                      </div>
                                    </div>

                                  {/* Right Column - Trip Information */}

                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                      <div className="flex items-start">
                                        <div className="bg-red-100 p-2 rounded-full mr-3">
                                          <MapPin className="h-4 w-4 text-red-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Destination</p>
                                          <p className="text-sm font-semibold text-gray-900 mt-1">{booking.location}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                      <div className="flex items-start">
                                        <div className="bg-indigo-100 p-2 rounded-full mr-3">
                                          <Clock className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Scheduled Time</p>
                                          <p className="text-sm font-semibold text-gray-900 mt-1">{booking.date} at {booking.time}</p>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">Departure time</p>
                                      </div>
                                    </div>
                                  </div>

                                {/* Status Summary Footer
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                  <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center">
                                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                                        <Truck className="h-5 w-5 text-gray-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700">Booking Status</p>
                                        <p className="text-xs text-gray-500">Current booking state</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      {getStatusBadge(booking.status)}
                                      <p className="text-xs text-gray-500 mt-1">
                                        {booking.status === 'pending' && 'Awaiting approval'}
                                        {booking.status === 'approved' && 'Ready for trip'}
                                        {booking.status === 'completed' && 'Trip finished'}
                                        {booking.status === 'cancelled' && 'Booking canceled'}
                                      </p>
                                    </div>
                                  </div>
                                </div> */}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed z-50 bottom-20 right-4 p-3 rounded-full bg-blue-600 text-white shadow-lg md:hidden"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 md:hidden" onClick={toggleSidebar}>
          <div 
            className="absolute top-0 left-0 w-64 h-full bg-customBlue shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="mt-6">
              <h2 className="text-2xl text-white text-center mb-10 font-bold">Dashboard</h2>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center py-3 px-4 rounded-md hover:bg-blue-100 text-white hover:text-blue-600 transition-colors"
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ViewPage;
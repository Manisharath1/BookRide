import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Calendar, Clock, MapPin, AlertCircle, CheckCircle, User, Phone, Truck, ViewIcon, LayoutDashboardIcon } from 'lucide-react';
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
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/view`)
      .then(response => {
        console.log("API Response:", response.data);
        
        // Group bookings by vehicle
        const bookingsByVehicle = {};
        
        response.data.forEach(booking => {
          const vehicleId = booking.vehicleId || 'unknown';
          
          if (!bookingsByVehicle[vehicleId]) {
            bookingsByVehicle[vehicleId] = {
              vehicleId: vehicleId,
              vehicleName: booking.vehicleName,
              vehicleNumber: booking.vehicleNumber,
              bookings: []
            };
          }
          
          bookingsByVehicle[vehicleId].bookings.push(booking);
        });
        
        // Convert to array
        const groupedBookings = Object.values(bookingsByVehicle);
        setVehicleBookings(groupedBookings);
        setLoading(false);
      })
      .catch(err => {
        console.error("API Error:", err);
        setError(`Failed to fetch bookings: ${err.message}`);
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
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> {status}</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> {status}</span>;
      case 'rejected':
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
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-20">
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
        <div className="hidden md:flex flex-col w-64 bg-blue-950 text-white flex-shrink-0 overflow-y-auto">
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
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <p>{error}</p>
            </div>
          ) : vehicleBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-600">No vehicle bookings found. Please check back later.</p>
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
                        <div className="font-medium text-lg text-blue-900">{vehicleGroup.vehicleName || 'Unknown Vehicle'}</div>
                        <div className="text-sm text-blue-700">{vehicleGroup.vehicleNumber || 'No Registration'}</div>
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
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="font-medium text-gray-700">{booking.date}</span>

                                <Clock className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="text-gray-700">{booking.time}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                {getStatusBadge(booking.status)}
                                {openBookingIds[booking.id] ? 
                                  <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                }
                              </div>
                            </button>
                            
                            {/* Booking Details */}
                            {openBookingIds[booking.id] && (
                              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start">
                                      <User className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                                      <div>
                                        <p className="text-xs text-gray-500">Booked By</p>
                                       <p className="text-sm font-medium">{booking.username || 'Unknown Guest'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start">
                                      <User className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                                      <div>
                                        <p className="text-xs text-gray-500">Driver</p>
                                        <p className="text-sm font-medium">{booking.drivername || 'Not Assigned'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start">
                                      <Phone className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                                      <div>
                                        <p className="text-xs text-gray-500">Contact</p>
                                        <p className="text-sm font-medium">{booking.number || 'Not Provided'}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-start">
                                      <MapPin className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                                      <div>
                                        <p className="text-xs text-gray-500">Location</p>
                                        <p className="text-sm font-medium">{booking.location || 'Not specified'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start">
                                      <AlertCircle className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                                      <div>
                                        <p className="text-xs text-gray-500">Reason</p>
                                        <p className="text-sm font-medium">{booking.reason || 'Not provided'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
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

      <button
        onClick={() => setSidebarOpen(prev => !prev)}
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
            className="absolute top-0 left-0 w-64 h-full bg-blue-950 shadow-lg p-4"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <nav className="mt-6">
              <h2 className="text-2xl text-white text-center mb-10 font-bold">Dashboard</h2>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)} // Close sidebar on link click
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
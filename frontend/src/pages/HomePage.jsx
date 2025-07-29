/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Alert, AlertDescription } from "../../src/components/ui/alert";
import axios from "axios";
import {  
  Car, 
  Home, 
  Calendar,
  LogOut,
  LayoutDashboard,
  User,
  Menu,
  X
} from "lucide-react";
import FullCalendarScheduler from "../components/FullCalendarSelector"; 
import "react-toastify/dist/ReactToastify.css";

const useAPI = () => {
    const navigate = useNavigate();
    const baseURL = import.meta.env.VITE_API_BASE_URL;
    const [isLoading, setIsLoading] = useState(false);
    
    const getAuthHeaders = useCallback(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      return { Authorization: `Bearer ${token}` };
    }, []);
  
    const apiCall = useCallback(async (method, endpoint, data = null, showLoader = true) => {
      if (showLoader) setIsLoading(true);
      
      try {
        const headers = getAuthHeaders();
        let response;
        
        if (method === 'get') {
          response = await axios.get(`${baseURL}${endpoint}`, { headers });
        } else {
          response = await axios[method](`${baseURL}${endpoint}`, data, { headers });
        }
        
        return response.data;
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/", { state: { message: "Your session has expired. Please login again." } });
        }
        throw error;
      } finally {
        if (showLoader) setIsLoading(false);
      }
    }, [baseURL, getAuthHeaders, navigate]);
  
    return { apiCall, isLoading };
};

const HomePage = () => {
  const [successMessage] = useState("");
  const [error] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [selectedTime, setSelectedTime] = useState(null);
  const [existingEvents, setExistingEvents] = useState([]);
  const [bookingList, setBookingList] = useState([]);
  const [booking, setBooking] = useState(null);


  const navigate = useNavigate();

  const { apiCall } = useAPI();

  useEffect(() => {
      const token = localStorage.getItem("token");

      if (!token) {
      console.error("No token found");
      navigate("/"); 
      return;
      }

      axios
      .get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/user`, {
          headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
          setUsername(response.data.username);
      })
      .catch((error) => {
          console.error("Failed to fetch user data:", error);
          localStorage.removeItem("token");
          navigate("/");
      });
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("token");
        navigate("/dashboard");
    }
  };
    
  const navItems = [
    { name: "Home", path: "/home", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
    { name: "Guest Booking", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
    { name: "Profile", path: "/profile", icon: <User size={20} /> }
  ];

  useEffect(() => {
    const fetchApprovedBookings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/bookings/all`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const approved = res.data.filter(b => 
          b.status === 'approved' || b.status === 'shared' || b.status === 'confirmed'
        );

        // Group shared rides by time and create consolidated events
        const events = [];
        const processedSharedRides = new Set();
        
        approved.forEach(booking => {
          const startDate = new Date(booking.scheduledAt);
          const endDate = new Date(startDate.getTime() + (booking.duration || 1) * 60 * 60 * 1000);
          
          const pad = (n) => (n < 10 ? '0' + n : n);
          const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes() >= 30 ? 30 : 0)}`;
          
          if (booking.status === 'shared') {
            // Create a unique key for this time slot
            const timeKey = `${startDate.getTime()}-${booking.duration || 1}`;
            
            if (!processedSharedRides.has(timeKey)) {
              // Find all shared rides for this time slot
              const sharedRidesAtSameTime = approved.filter(b => 
                b.status === 'shared' && 
                new Date(b.scheduledAt).getTime() === startDate.getTime() &&
                (b.duration || 1) === (booking.duration || 1)
              );
              
              // Create consolidated shared ride event
              const destinations = sharedRidesAtSameTime
                .map(ride => ride.location || ride.pickupLocation)
                .filter(loc => loc)
                .join(', ');
              
              const participantCount = sharedRidesAtSameTime.length;
              
              events.push({
                id: `shared-${timeKey}`,
                title: `🚐 Shared Ride (${participantCount} passengers)`,
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                color: '#8B5CF6', // Purple for shared rides
                borderColor: '#7C3AED',
                textColor: '#FFFFFF',
                extendedProps: {
                  type: 'shared',
                  destinations: destinations,
                  participantCount: participantCount,
                  bookingIds: sharedRidesAtSameTime.map(r => r._id),
                  bookings: sharedRidesAtSameTime
                },
                display: 'block', // Ensure it takes full width
                classNames: ['shared-ride-event']
              });
              
              processedSharedRides.add(timeKey);
            }
          } else {
            // Individual approved/confirmed bookings
            const title = booking.pickupLocation && booking.location 
              ? `${booking.pickupLocation} → ${booking.location}`
              : `${booking.location || booking.pickupLocation || 'Booking'}`;
              
            events.push({
              id: `individual-${booking._id}`,
              title: title,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              color: booking.status === 'confirmed' ? '#10B981' : '#3B82F6', // Green for confirmed, blue for approved
              borderColor: booking.status === 'confirmed' ? '#059669' : '#2563EB',
              textColor: '#FFFFFF',
              extendedProps: {
                type: 'individual',
                booking: booking,
                pickupLocation: booking.pickupLocation,
                dropLocation: booking.location,
                status: booking.status
              },
              display: 'block',
              classNames: ['individual-ride-event']
            });
          }
        });

        setExistingEvents(events);
        setBookingList(approved);
        
        // console.log("Enhanced calendar events loaded:", events);
      } catch (err) {
        console.error("Failed to load approved bookings", err);
      }
    };

    fetchApprovedBookings();
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
        navigate("/");
    }
  }, [navigate]);

  const showSharedRideDetails = (sharedRideData) => {
    const details = sharedRideData.bookings.map((booking, index) => 
      `${index + 1}. ${booking.pickupLocation || 'Unknown pickup'} → ${booking.location || 'Unknown destination'}`
    ).join('\n');
    
    alert(`🚐 Shared Ride Details\n\nPassengers: ${sharedRideData.participantCount}\nDestinations: ${sharedRideData.destinations}\n\nDetailed Routes:\n${details}`);
  };

  const calendarConfig = {
    // Allow events to overlap and display side by side
    eventOverlap: true,
    
    // Handle multiple events at the same time
    eventOrder: 'start,title',
    
    // Custom event rendering for better shared ride display
    eventDidMount: function(info) {
      const { event } = info;
      
      if (event.extendedProps.type === 'shared') {
        // Add tooltip for shared rides
        info.el.title = `Shared Ride\nDestinations: ${event.extendedProps.destinations}\nPassengers: ${event.extendedProps.participantCount}`;
        
        // Add special styling
        info.el.style.borderLeft = '4px solid #7C3AED';
        info.el.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.3)';
      } else {
        // Individual ride tooltip
        const booking = event.extendedProps.booking;
        info.el.title = `Individual Ride\nPickup: ${booking.pickupLocation || 'N/A'}\nDestination: ${booking.location || 'N/A'}\nStatus: ${booking.status}`;
        
        // Different styling for individual rides
        info.el.style.borderLeft = event.extendedProps.status === 'confirmed' 
          ? '4px solid #059669' 
          : '4px solid #2563EB';
      }
    },
    
    // Handle click events differently for shared vs individual rides
    eventClick: function(info) {
      const { event } = info;

      if (event.extendedProps.type === 'shared') {
          showSharedRideDetails(event.extendedProps);
      } else {
          // Regular individual ride handling
          setSelectedTime(new Date(event.start));

          // 🩹 ADD:
          setBooking(event.extendedProps.booking); 
      }
    },

    
    // Limit events per day to avoid overcrowding
    dayMaxEvents: 6,
    moreLinkClick: 'popover',
    
    // Better time formatting
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
  };

  // Close sidebar when clicking outside (mobile)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && !event.target.closest('.mobile-sidebar') && !event.target.closest('.menu-toggle')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);
    
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      
      {/* Header - Improved mobile spacing */}
      <header className="sticky top-0 w-full z-30 backdrop-blur-md bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl border-b border-white/20">
        <div className="px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors menu-toggle"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
              </button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                Welcome, {username || 'User'}!
              </h1>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-3 py-2 sm:px-4 rounded-lg flex items-center space-x-2 transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Logout</span>
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 relative">
        
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-blue-950 text-white shadow-lg">
          <div className="p-4 space-y-2">
           
            {navItems.map((item) => (
              <Link 
                key={item.name}
                to={item.path}
                className="flex items-center py-3 px-4 rounded-lg text-gray-300 hover:bg-blue-900 hover:text-white transition-all duration-200 group"
              >
                <span className="mr-3 group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile Sidebar Drawer */}
        <aside className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:hidden transition-transform duration-300 ease-in-out z-50 w-72 bg-blue-950 shadow-2xl mobile-sidebar`}>
          <div className="p-4 h-full overflow-y-auto">
            <div className="flex justify-between items-center text-white border-b border-blue-800 pb-4 mb-6">
              <h2 className="text-xl font-bold">Navigation</h2>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-blue-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center py-3 px-4 text-white hover:bg-blue-800 rounded-lg transition-colors group"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3 group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Area - Improved responsive layout */}
        <main className="flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0">
          
          {/* Calendar Section - Better mobile handling */}
          <div className="flex-1 xl:flex-[2] overflow-hidden">
            <div className="h-full p-2 sm:p-4">
              <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <FullCalendarScheduler 
                  selectedTime={selectedTime} 
                  setSelectedTime={setSelectedTime} 
                  existingEvents={existingEvents} 
                  calendarConfig={calendarConfig}
                  booking={booking}
                />
              </div>
            </div>
          </div>

          {/* Bookings List Section - Improved mobile layout */}
          <div className="xl:flex-1 xl:min-w-[400px] flex flex-col">
            <div className="flex-1 bg-white border border-gray-200 rounded-lg m-2 sm:m-4 shadow-sm overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  Approved Bookings
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {bookingList.length}
                  </span>
                </h2>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {bookingList.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No approved bookings found</p>
                    <p className="text-gray-400 text-sm mt-1">Your upcoming bookings will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookingList.map((b) => {
                      const startDate = new Date(b.scheduledAt);
                      const pad = (n) => (n < 10 ? "0" + n : n);
                      const time = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
                      
                      return (
                        <div 
                          key={b._id} 
                          onClick={() => setSelectedTime(new Date(b.scheduledAt))}
                          className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              {b.status === 'shared' ? (
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Multiple Destinations</h3>
                              ) : b.status === 'approved' ? (
                                <div className="space-y-1">
                                  {b.pickupLocation && b.location ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs sm:text-sm">
                                      <span className="text-blue-600 font-medium">📍 {b.pickupLocation}</span>
                                      <span className="hidden sm:inline text-gray-400">→</span>
                                      <span className="text-green-600 font-medium">🏁 {b.location}</span>
                                    </div>
                                  ) : (
                                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                                      {b.location || b.pickupLocation}
                                    </h3>
                                  )}
                                </div>
                              ) : (
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{b.location}</h3>
                              )}
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium capitalize ml-2 flex-shrink-0">
                              {b.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-500 w-16 flex-shrink-0">Date:</span>
                              <span className="truncate">{startDate.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-500 w-16 flex-shrink-0">Time:</span>
                              <span>{time}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-500 w-16 flex-shrink-0">Duration:</span>
                              <span>{b.duration || 1} hr(s)</span>
                            </div>
                          </div>
                          
                          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600">
                            Click to view on calendar
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Alerts */}
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {successMessage && (
                  <Alert className="mt-4 bg-green-100 border-green-500">
                    <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer - Better mobile spacing */}
      <footer className="bg-gray-900 text-white p-3 sm:p-4 text-center text-xs sm:text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
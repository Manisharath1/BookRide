import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Calendar, Car, Home, LayoutDashboard, LogOut, User2Icon } from "lucide-react";
import FullCalendarSelector from "../components/FullCalendarSelector";

const ApprovalPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [driverDetails, setDriverDetails] = useState({
    driverName: "",
    driverPhone: "",
    vehicleId: "",
    override: false
  });
  const [selectedTime, setSelectedTime] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [existingEvents, setExistingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add this state to trigger calendar highlighting
  const [highlightTrigger, setHighlightTrigger] = useState(0);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBooking(res.data);
        
        // Set default time immediately when booking is loaded
        if (res.data && res.data.scheduledAt) {
          const defaultTime = new Date(res.data.scheduledAt);
          setSelectedTime(defaultTime);
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        toast.error("Booking not found");
        navigate("/manager");
      }
    };

    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/vehicles/getVehicles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(res.data);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        toast.error("Failed to load vehicles");
      }
    };

    const fetchApprovedBookings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/bookings/all`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
  
        const approved = res.data.filter(b => b.status === 'approved');
        // console.log('Approved bookings found:', approved.length);
  
        // Map to calendar-friendly format with better error handling
        const events = approved.map(b => {
          try {
            const startDate = new Date(b.scheduledAt);
            
            // Validate date
            if (isNaN(startDate.getTime())) {
              console.warn('Invalid date for booking:', b._id, b.scheduledAt);
              return null;
            }
            
            const duration = b.duration || 1;
            const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
            
            const pad = (n) => (n < 10 ? '0' + n : n);
            const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
            
            return {
              id: `approved-${b._id}`,
              title: `${b.reason || 'Booked'} - ${b.userId?.username || 'Unknown'}`,
              date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
              startTime: formatTime(startDate),
              endTime: formatTime(endDate),
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              backgroundColor: '#ef4444', // red-500
              borderColor: '#dc2626', // red-600
              textColor: '#ffffff',
              extendedProps: {
                type: 'approved',
                bookingId: b._id,
                vehicleId: b.vehicleId,
                driverName: b.driverName
              }
            };
          } catch (error) {
            console.error('Error processing booking event:', b._id, error);
            return null;
          }
        }).filter(event => event !== null); // Remove null entries
        
        setExistingEvents(events);
        // console.log("Processed calendar events:", events);
      } catch (err) {
        console.error("Failed to load approved bookings", err);
        toast.error("Failed to load existing bookings");
      }
    };

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchBooking(),
        fetchVehicles(),
        fetchApprovedBookings()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [bookingId, navigate]);

  useEffect(() => {
    if (selectedTime && booking?.duration) {
      setHighlightTrigger(prev => prev + 1);
    }
  }, [selectedTime, booking?.duration]);

  // Function to trigger calendar highlighting
  const triggerCalendarHighlight = () => {
    if (selectedTime && booking?.duration) {
      // Increment trigger to force calendar to re-highlight
      setHighlightTrigger(prev => prev + 1);
      
      // Scroll to the calendar section
      setTimeout(() => {
        const calendarSection = document.querySelector('[data-calendar-section]');
        if (calendarSection) {
          calendarSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
  };

  const handleApprove = async () => {
    if (!selectedTime) {
      toast.error("Please select a time slot");
      // Trigger calendar highlighting to show the user where to select
      triggerCalendarHighlight();
      return;
    }

    if (!driverDetails.vehicleId || !driverDetails.driverName || !driverDetails.driverPhone) {
      toast.error("Please fill in all driver and vehicle details");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/approve`, {
        bookingId,
        scheduledAt: selectedTime.toISOString(),
        driverName: driverDetails.driverName,
        driverNumber: driverDetails.driverPhone,
        vehicleId: driverDetails.vehicleId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      toast.success("Booking approved successfully!");
      navigate("/manager");
  
    } catch (err) {
      console.error('Approval error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "Failed to approve booking";
      toast.error(errorMessage);
    }
  };

  const formatDate = (booking) => {
    const dateString = booking.scheduledAt || booking.dateTime || booking.date;
    
    if (!dateString) return "No date available";
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString);
        return "Invalid date format";
      }
      
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      };
      
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Date formatting error:", error, dateString);
      return "Error formatting date";
    }
  };

  const navItems = [
    { name: "Home", path: "/home", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
    { name: "Guest Booking", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
    { name: "Profile", path: "/profile", icon: <User2Icon size={20} /> }
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
    }
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicleId) => {
    const selectedVehicle = vehicles.find(v => v._id === vehicleId);
    if (selectedVehicle) {
      setDriverDetails({
        vehicleId: selectedVehicle._id,
        driverName: selectedVehicle.driverName || '',
        driverPhone: selectedVehicle.driverNumber || '',
        override: false
      });
    } else {
      setDriverDetails({
        vehicleId: '',
        driverName: '',
        driverPhone: '',
        override: false
      });
    }
  };

  // Handle driver selection when in override mode
  const handleDriverSelect = (driverName) => {
    const selectedDriver = vehicles.find(v => v.driverName === driverName);
    if (selectedDriver) {
      setDriverDetails({
        ...driverDetails,
        driverName: selectedDriver.driverName,
        driverPhone: selectedDriver.driverNumber || ''
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Booking not found</p>
      </div>
    );
  }

  

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Responsive Header */}
      <div className="sticky top-0 w-full z-30">
        <div className="absolute inset-0 bg-backBlue">
          <svg 
            className="absolute bottom-0 w-full"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
          >
          </svg>
        </div>
        
        <div className="relative flex justify-between items-center p-2 sm:p-4">
          <h2 className="text-2xl text-white text-center font-bold">Approve Booking</h2>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-col w-64 bg-customBlue text-white flex-shrink-0 overflow-y-auto z-20">
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
          <div className="mt-auto pt-4 border-t border-blue-800">
            <button 
              className="w-full flex items-center gap-2 py-2 px-4 rounded transition-colors hover:bg-blue-900"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-full mx-auto p-3 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">Approve Booking</h1>


            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Booking Info Section */}
              <div className="bg-white rounded-xl shadow-lg border border-blue-200 lg:w-1/2 w-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Booking Information
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">User</span>
                      </div>
                      <p className="font-medium text-gray-800">{booking?.userId?.username || "N/A"}</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Reason</span>
                      </div>
                      <p className="font-medium text-gray-800">{booking.reason || "N/A"}</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Pickup Location</span>
                      </div>
                      <p className="font-medium text-gray-800">{booking.pickupLocation || "N/A"}</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Drop Location</span>
                      </div>
                      <p className="font-medium text-gray-800">{booking.location || "N/A"}</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Requested Date & Time</span>
                      </div>
                      <p className="font-medium text-gray-800">{formatDate(booking)}</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Duration</span>
                      </div>
                      <p className="font-medium text-gray-800">{booking.duration || 1} hrs</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Members</span>
                      </div>
                      <p className="font-medium text-gray-800">{booking.members || 'N/A'}</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Status</span>
                      </div>
                      <p className="font-medium text-gray-800 capitalize">{booking.status || 'Pending'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle Section */}
              <div className="bg-white rounded-xl shadow-lg border border-blue-200 w-full md:w-1/2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    Driver & Vehicle Assignment
                  </h2>
                </div>
                
                <div className="p-6 space-y-5">
                  {/* Vehicle Selector */}
                  <div>
                    <div className="flex items-center mb-2">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                      </svg>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Select Vehicle</label>
                    </div>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                      value={driverDetails.vehicleId || ''}
                      onChange={(e) => handleVehicleSelect(e.target.value)}
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map(v => (
                        <option key={v._id} value={v._id}>
                          {v.name} ({v.number}) - {v.driverName || 'No Driver'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle for manual override */}
                  <div className="flex items-center space-x-2 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                    <input
                      type="checkbox"
                      id="override"
                      checked={driverDetails.override || false}
                      onChange={(e) => setDriverDetails({ ...driverDetails, override: e.target.checked })}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <label htmlFor="override" className="text-sm text-gray-700 flex items-center">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                      </svg>
                      Manually assign different driver
                    </label>
                  </div>

                  {/* Driver Name */}
                  <div>
                    <div className="flex items-center mb-2">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Driver Name</label>
                    </div>
                    {driverDetails.override ? (
                      <select
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                        value={driverDetails.driverName || ''}
                        onChange={(e) => handleDriverSelect(e.target.value)}
                      >
                        <option value="">Select a driver</option>
                        {vehicles.map(v => (
                          <option key={v._id} value={v.driverName}>
                            {v.driverName} ({v.number})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={driverDetails.driverName || ''}
                          disabled
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-not-allowed"
                          placeholder="Driver name auto-filled from vehicle"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver Phone */}
                  <div>
                    <div className="flex items-center mb-2">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Driver Phone</label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={driverDetails.driverPhone || ''}
                        onChange={(e) => setDriverDetails({ ...driverDetails, driverPhone: e.target.value })}
                        disabled={!driverDetails.override}
                        className={`w-full px-4 py-2 border border-gray-200 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                          driverDetails.override ? '' : 'bg-gray-50 cursor-not-allowed'
                        }`}
                        placeholder="Enter driver phone"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className={`w-4 h-4 ${driverDetails.override ? 'text-gray-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Current Selection Summary */}
                  {(driverDetails.vehicleId || selectedTime) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Current Selection:</h4>
                      <div className="space-y-1 text-sm text-blue-700">
                        {selectedTime && (
                          <p>• Time: {selectedTime.toLocaleString()}</p>
                        )}
                        {driverDetails.vehicleId && (
                          <p>• Vehicle: {vehicles.find(v => v._id === driverDetails.vehicleId)?.name}</p>
                        )}
                        {driverDetails.driverName && (
                          <p>• Driver: {driverDetails.driverName}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Time Slot Section with data attribute for scrolling */}
            <div className=" shadow rounded-lg p-3 sm:p-4 border border-blue-100 mb-3" data-calendar-section>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Time Slot</h3>
              <FullCalendarSelector 
                selectedTime={selectedTime} 
                setSelectedTime={setSelectedTime} 
                existingEvents={existingEvents}
                defaultTime={booking?.scheduledAt ? new Date(booking.scheduledAt) : null}
                booking={booking}
                scrollToTime={selectedTime}
                highlightTrigger={highlightTrigger} // Pass the trigger to force re-highlighting
              />
            </div>

            
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-2 sm:gap-3 mt-6">
              <Button 
                size="sm" 
                className="text-xs sm:text-sm px-4 py-2" 
                variant="outline" 
                onClick={() => navigate("/manager")}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={`
                  text-sm font-semibold px-6 py-2 
                  bg-blue-600 text-white rounded-lg 
                  hover:bg-blue-700 active:bg-blue-800
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
                  disabled:opacity-50 disabled:cursor-not-allowed 
                  transition-all duration-150 ease-in-out
                  ${(!driverDetails.vehicleId || !driverDetails.driverName || !driverDetails.driverPhone || !selectedTime) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-lg transform hover:-translate-y-0.5'
                  }
                `}
                onClick={handleApprove}
                disabled={!driverDetails.vehicleId || !driverDetails.driverName || !driverDetails.driverPhone || !selectedTime}
              >
                Approve Booking
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setSidebarOpen(prev => !prev)}
        className="fixed z-50 bottom-4 right-4 p-2 sm:p-3 rounded-full bg-blue-600 text-white shadow-lg md:hidden hover:bg-blue-700 transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      
      {/* Mobile Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden transition duration-200 ease-in-out z-40 w-64 bg-customBlue shadow-md`}
      >
        <div className="p-4">
          <div className="flex items-center mb-4 border-b pb-2">
            <h2 className="text-lg sm:text-xl text-white font-bold">Dashboard</h2>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 rounded-full hover:bg-blue-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="mt-4 sm:mt-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="flex items-center py-2 px-3 sm:py-3 sm:px-4 rounded-md hover:bg-blue-900 text-white transition-colors text-sm sm:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-2 sm:mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="mt-auto pt-4 border-t border-blue-800">
            <button 
              className="w-full flex items-center gap-2 py-2 px-4 rounded transition-colors hover:bg-blue-900 text-white"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Responsive Footer */}
      <footer className="bg-backBlue text-white p-2 sm:p-4 text-center text-xs sm:text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ApprovalPage;
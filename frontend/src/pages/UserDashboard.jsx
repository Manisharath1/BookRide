import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Bell, CheckCircle, ChevronDown, ChevronRight, Clock, Home, LogOut, User, X, XCircle } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



const UserDashboard = () => {
  const [username, setUsername] = useState("");
  const [number, setNumber] = useState("");
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [bookings, setBookings] = useState({ pending: [], approved: [], cancelled: [], shared: [], completed: [], all: [] });
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("bookings");
  const [notifications, setNotifications] = useState("[]");
  const [selectedDate, setSelectedDate] = useState(null); // date + time
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [duration, setDuration] = useState('');
  const [members, setMembers] = useState('');
  const [expandedSharedRows, setExpandedSharedRows] = useState({});
  



  const navigate = useNavigate();

  useEffect(() => {
    const initializeDashboard = async () => {
      const token = localStorage.getItem("token");
  
      if (!token) {
        console.error("No token found");
        navigate("/");
        return;
      }
  
      try {
        const userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = userResponse.data;
        setUsername(userData.username);
        setNumber(userData.number);
  
        
        await Promise.all([
          fetchBookings(token, userData.number),
          fetchNotifications(token),
        ]);
  
      } catch (error) {
        console.error("Initialization error:", error);
        localStorage.removeItem("token");
        navigate("/");
      }
    };
  
    initializeDashboard();
  }, [navigate]);

  const fetchBookings = async (token, userNumber) => {

    if (!token) {
      console.error("No authentication token available");
      setLoadingBookings(false);
      return;
    }
    try {
      setLoadingBookings(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/user`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { userNumber },
        timeout: 10000
      });

      const processedBookings = response.data.map(booking => {
        // Find if current user is a passenger in this booking
        const userAsPassenger = booking.passengers?.find(p => p.number === userNumber);
        const isCurrentUserPassenger = !!userAsPassenger;
        
        return {
          ...booking,
          isCurrentUserPassenger,
          // by making these fields available from their passenger record
          displayMembers: isCurrentUserPassenger ? userAsPassenger.members : booking.members,
          displayDuration: isCurrentUserPassenger ? userAsPassenger.duration : booking.duration,
          displayLocation: isCurrentUserPassenger ? userAsPassenger.location : booking.location,
          displayReason: isCurrentUserPassenger ? userAsPassenger.reason : booking.reason,
          isVisibleToCurrentUser: booking.status === "shared" ? 
            (isCurrentUserPassenger || booking.userId?.number === userNumber) : true
        };
      });

      // Categorize properly
      const bookingsByStatus = {
        pending: [],
        approved: [],
        cancelled: [],
        shared: [], 
        completed: [],
        all: processedBookings
      };

      processedBookings.forEach(b => {
        if (b.isVisibleToCurrentUser) {
          if (b.status === "shared") {
            bookingsByStatus.shared.push(b);
          } else if (bookingsByStatus[b.status]) {
            bookingsByStatus[b.status].push(b);
          }
        }
      });

      setBookings(bookingsByStatus);
      setLoadingBookings(false);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      setLoadingBookings(false);
    }
  };

  const fetchNotifications = async (token) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
    } 
  };

  const handleCloseModal = () => {
    setLocation("");
    setReason("");
    setShowModal(false);
  };

   const toggleSharedDetails = (bookingId) => {
    setExpandedSharedRows(prev => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  const handleBookingSubmit = async (e) => 
    {
    e.preventDefault();

    // Validate all required fields
    if (!location) {
      toast.error('Please enter a location.');
      return;
    }
    if (!reason) {
      toast.error('Please enter a reason for booking.');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date and time.');
      return;
    }
    if (!duration) {
      toast.error('Please select a duration.');
      return;
    }
    if (!members) {
      toast.error('Please enter the number of members.');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        navigate("/");
        return;
      }
      const formattedDate = new Date(selectedDate).toISOString();

      
      const bookingData = {
        location: String(location),
        reason: String(reason),
        scheduledAt: formattedDate,
        duration: Number(duration),
        members: Number(members)
      };

     
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/bookings/create`,
        bookingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
         signal: controller.signal
        }
      );
      if (response.status === 201) {
        // ✅ First, fetch updated bookings
        await fetchBookings(token, number);

        // ✅ Then show success
        toast.success('Ride requested successfully!');

        // ✅ Then optionally reload or redirect
        setTimeout(() => window.location.reload(), 2000);
      }

      // console.log(response);
      clearTimeout(timeoutId);
      // window.location.reload();

      // Reset form fields
      setLocation("");
      setReason("");
      setDuration("");
      setMembers("");
      setSelectedDate(null);
      setShowModal(false);

      fetchBookings(token, number);

    } catch (err) {
      console.error("Booking error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });

      if (err.response) {
        if (err.response.status === 400) {
          const errorText = err.response.data?.message || 'Invalid booking data. Please check all fields.';
          
          toast.error(errorText);
        } else if (err.response.status === 401) {
          toast.error('Authentication failed. Please log in again.');
          localStorage.removeItem("token");
          setTimeout(() => navigate("/"), 2000);
        } else {
          const errorText = err.response.data?.message || 'Server error. Please try again later.';
          
          toast.error(errorText);
        }
      } else if (err.request) {
        toast.error('No response from server. Please check your connection.');
      } else {
        toast.error(`Error: ${err.message}`);
      }
    }
  };

  const unreadCount = Array.isArray(notifications)
  ? notifications.filter(n => !n.read).length
  : 0;
  
  const subscribeUserToPush = async () => {
    if (!("serviceWorker" in navigator)) {
      alert("Service worker is not supported by your browser.");
      return;
    }
  
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
  
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BOV7U-0pnV13WuYwbNI7TGcKbdAU3s3AbRbiKYa-gChbMYI8XkF6gs-e9XvTSxjlo28rFnp7E1CRC2ursbjAstQ" // ← From backend
      });
  
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/subscribe`, {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json"
        }
      });
  
      alert("You are now subscribed to push notifications!");
    } catch (err) {
      console.error("Failed to subscribe:", err);
      alert("Something went wrong while subscribing.");
    }
  };
  

  const handleCompleteBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/bookings/complete`,
        { bookingId: bookingId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Ride completed successfully!");
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert("Failed to complete ride");
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/bookings/cancel`,
          { bookingId: bookingId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Ride cancelled successfully!");
        fetchBookings();
        window.location.reload();
        // fetchVehicles();
      } catch (err) {
        console.error(err);
        if (err.response && err.response.data && err.response.data.error) {
          alert(`Failed to cancel ride: ${err.response.data.error}`);
        } else {
          alert("Failed to cancel ride");
        }
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
        minute: '2-digit'
      };
      
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Date formatting error:", error, dateString);
      return "Error formatting date";
    }
  };

  const nonPendingBookings = Array.isArray(bookings.approved)
  ? [
      ...bookings.approved,
      ...bookings.completed,
      ...bookings.cancelled,
      ...bookings.shared,
    ]
  : [];



return (
  <div className="flex flex-col min-h-screen bg-gray-100">
    <div className="sticky top-0 w-full h-20 overflow-hidden z-30">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
          <svg 
            className="absolute bottom-0 w-full"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
          >
          </svg>
        </div>
        <div className="relative flex justify-between items-center p-4">
          <button
            onClick={toggleSidebar}
            className="text-2xl mr-3 md:hidden focus:outline-none"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h2 className="text-2xl font-bold text-white ">Welcome, {username}!</h2>
          <button 
            onClick={handleLogout}
            className="bg-transparent hover:bg-white/10 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-all"
          >
            <span>Logout</span>
            <LogOut className="ml-2 h-5 w-5" />
          </button>
        </div>
    </div>
        
    {/* Main Content */}
    <main className="flex flex-1 relative overflow-hidden">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - always visible on md screens and larger, toggle on smaller screens */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-100  z-40 w-64 bg-blue-950 text-white transition-transform duration-300 ease-in-out overflow-y-auto flex-shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Close button for mobile */}
        <button 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute right-4 top-4 text-white hover:text-blue-300"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col h-full py-6 px-4">
          <div className="mb-8 border-b border-blue-800 pb-4 flex items-center gap-2">
            <Home size={24} />
            <h2 className="text-xl font-bold">Dashboard</h2>
          </div>

          <nav className="flex-1">
            <ul className="space-y-2">
              {["bookings", "profile", "notifications"].map((tab) => {
                const isActive = activeTab === tab;
                const label = tab.charAt(0).toUpperCase() + tab.slice(1);

                return (
                  <li key={tab}>
                    <button
                      onClick={() => {
                        setActiveTab(tab);
                        setSidebarOpen(false);
                        if (tab === "notifications") {
                          setNotifications((prev) =>
                            prev.map((n) => ({ ...n, read: true }))
                          );
                        }
                      }}
                      className={`w-full flex items-center justify-between py-2 px-4 rounded transition-colors duration-200 ${
                        isActive ? "hover:bg-blue-900" : "hover:bg-blue-900"
                      }`}
                    >
                      <span>{label}</span>
                      {tab === "notifications" && (
                        <span className="relative">
                          <Bell className="w-5 h-5" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                              {unreadCount}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Add logout or user info at bottom
          <div className="mt-auto pt-4 border-t border-blue-800">
            <button 
              className="w-full flex items-center gap-2 py-2 px-4 rounded hover:bg-blue-600 transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div> */}
        </div>
      </aside>


      <section className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">

      {activeTab === "bookings" && (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-semibold">My Bookings</h2>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
            >
              + Book a Ride
            </button>
          </div>  
          
          {/* Pending Bookings Card - Improved table responsiveness */}
          <Card>
            <CardHeader className="bg-blue-50 px-4 py-3">
              <CardTitle className="text-xl flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-600" />
                Pending Bookings ({bookings.pending.length})
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {loadingBookings ? (
                  <p className="p-6 text-center">Loading bookings...</p>
                ) : bookings.pending.length === 0 ? (
                  <p className="p-6 text-center text-gray-500">No pending bookings found</p>
                ) : (
                  <div className="min-w-full">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 uppercase text-xs">
                        <tr>
                          <th className="p-3 text-center font-medium text-gray-500">Location</th>
                          <th className="p-3 text-center font-medium text-gray-500">Reason</th>
                          <th className="p-3 text-center font-medium text-gray-500">Date</th>
                          <th className="p-3 text-center font-medium text-gray-500 hidden sm:table-cell">Duration</th>
                          <th className="p-3 text-center font-medium text-gray-500 hidden sm:table-cell">Members</th>
                          <th className="p-3 text-center font-medium text-gray-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.pending.map((booking) => {
                          const isBookingOwner = booking.userId?._id === username;
                          const currentUserAsPassenger = booking.passengers?.find(p => p.number === number);
                          const isPassenger = !isBookingOwner && currentUserAsPassenger;
                          return (
                            <tr key={booking._id} className="hover:bg-gray-50">
                              <td className="p-3 text-center whitespace-nowrap">{isPassenger ? currentUserAsPassenger.location : booking.location || "-"}</td>
                              <td className="p-3 text-center whitespace-nowrap">{isPassenger ? currentUserAsPassenger.reason : booking.reason || "-"}</td>
                              <td className="p-3 text-center whitespace-nowrap">{formatDate(booking)}</td>
                              <td className="p-3 text-center whitespace-nowrap hidden sm:table-cell">{isPassenger ? currentUserAsPassenger.reason : booking.duration || "-"}</td>
                              <td className="p-3 text-center whitespace-nowrap hidden sm:table-cell">{isPassenger ? currentUserAsPassenger.reason : booking.members || "-"}</td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <button 
                                  onClick={() => handleCancelBooking(booking._id)}
                                  className="bg-red-100 text-red-800 px-2 py-1 text-xs sm:text-sm font-medium rounded hover:bg-red-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Bookings Card - Improved mobile view with collapsible panels */}
          <Card>
            <CardHeader className="bg-blue-50 px-4 py-3">
              <CardTitle className="text-xl flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                All Bookings ({nonPendingBookings.length})
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {loadingBookings ? (
                  <p className="p-6 text-center">Loading bookings...</p>
                ) : nonPendingBookings.length === 0 ? (
                  <p className="p-6 text-center text-gray-500">No bookings found</p>
                ) : (
                  <>
                    {/* Desktop view - Full table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                          <tr>
                            {["Vehicle", "Driver Name", "Driver Number", "Location", "Reason", "Duration", "Members", "Date", "Status", "Actions"].map((head, i) => (
                              <th key={i} className="p-3 text-center font-medium">{head}</th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                          {nonPendingBookings.map((booking) => {
                            const isBookingOwner = booking.userId?._id === username;
                            const currentUserAsPassenger = booking.passengers?.find(p => p.number === number);
                            const isPassenger = !isBookingOwner && currentUserAsPassenger;
                            const expanded = expandedSharedRows[booking._id];

                            return (
                              <React.Fragment key={booking._id}>
                                {/* MAIN ROW */}
                                <tr className="hover:bg-gray-50">
                                  <td className="p-3 text-center">{booking.vehicleName || "N/A"}</td>
                                  <td className="p-3 text-center">{booking.driverName || "-"}</td>
                                  <td className="p-3 text-center">{booking.driverNumber || "-"}</td>
                                  <td className="p-3 text-center">
                                    {isPassenger ? (currentUserAsPassenger?.location || "-") : (booking.location || "-")}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isPassenger ? (currentUserAsPassenger?.reason || "-") : (booking.reason || "-")}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isPassenger ? (currentUserAsPassenger?.duration || "-") : (booking.duration || "-")}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isPassenger ? (currentUserAsPassenger?.members || "-") : (booking.members || "-")}
                                  </td>
                                  <td className="p-3 text-center">{formatDate(booking)}</td>

                                  {/* STATUS BADGE */}
                                  <td className="p-3 text-center">
                                    <span
                                      className={`px-2 py-1 text-xs font-medium rounded ${
                                        booking.status === "completed"
                                          ? "bg-green-100 text-green-800"
                                          : booking.status === "cancelled"
                                          ? "bg-red-100 text-red-800"
                                          : booking.status === "shared"
                                          ? "bg-purple-100 text-purple-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {booking.status}
                                    </span>
                                  </td>

                                  {/* ACTIONS */}
                                  <td className="p-3 text-sm text-center">
                                    <div className="flex flex-col items-center gap-2">
                                      
                                      {/* Complete + Cancel Buttons */}
                                      {(booking.status === "approved" || booking.status === "shared") && (
                                        <div className="flex flex-wrap justify-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleCompleteBooking(booking._id)}
                                          >
                                            <CheckCircle className="w-4 h-4 mr-1.5" />
                                            Complete
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleCancelBooking(booking._id)}
                                          >
                                            <XCircle className="w-4 h-4 mr-1.5" />
                                            Cancel
                                          </Button>
                                        </div>
                                      )}

                                      {/* Expand Toggle */}
                                      {(["shared", "completed", "cancelled"].includes(booking.status) && booking.passengers?.length > 0) && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => toggleSharedDetails(booking._id)}
                                          className="rounded-full h-8 w-8 p-0"
                                        >
                                          {expanded ? (
                                            <ChevronDown className="w-5 h-5 text-primary" />
                                          ) : (
                                            <ChevronRight className="w-5 h-5 text-primary" />
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* PASSENGERS EXPANDED ROW */}
                                {expanded && booking.passengers?.length > 0 && (
                                  <tr className="bg-gray-50/50 border-b border-gray-200">
                                    <td colSpan={11} className="px-6 py-4">
                                      <div className="mb-2">
                                        <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                                          <User className="w-4 h-4 mr-2" />
                                          Passengers ({booking.passengers.length})
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                          {booking.passengers.map((p, idx) => (
                                            <Card key={idx} className="overflow-hidden border-blue-200 shadow-sm hover:shadow transition-shadow">
                                              <CardContent className="p-0">
                                                <div className="bg-primary/5 px-4 py-2.5 border-b border-blue-200 flex items-center justify-between">
                                                  <span className="font-medium text-sm">{p.username || "Unknown User"}</span>
                                                  {/* <Badge variant="outline" className="text-xs">#{idx + 1}</Badge> */}
                                                </div>
                                                <div className="p-4 space-y-2 text-sm">
                                                  {[
                                                    ["Contact", p.number],
                                                    ["Location", p.location],
                                                    ["Reason", p.reason],
                                                    ["Members", p.members],
                                                    ["Duration", p.duration],
                                                    ["Time", p.bookingTime ? new Date(p.bookingTime).toLocaleString() : "N/A"]
                                                  ].map(([label, value], i) => (
                                                    <div key={i} className="flex gap-2">
                                                      <span className="text-gray-500 w-20 flex-shrink-0">{label}:</span>
                                                      <span className="font-medium">{value || "N/A"}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile view - Card-based layout */}
                    <div className="md:hidden">
                      {nonPendingBookings.map((booking) => {
                        const isBookingOwner = booking.userId?._id === username;
                        const currentUserAsPassenger = booking.passengers?.find(p => p.number === number);
                        const isPassenger = !isBookingOwner && currentUserAsPassenger;
                        
                        return (
                          <div key={booking._id} className="border-b border-gray-200 p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {booking.vehicleName || "N/A"}
                                </h3>
                                <div className="text-sm text-gray-600 mt-1">
                                  {formatDate(booking)}
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                booking.status === "completed" ? "bg-green-100 text-green-800" :
                                booking.status === "cancelled" ? "bg-red-100 text-red-800" :
                                booking.status === "shared" ? "bg-purple-100 text-purple-800" :
                                "bg-blue-100 text-blue-800"
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            
                            <div className="space-y-3 text-sm mb-4">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                  <div className="text-gray-500 text-xs">Driver</div>
                                  <div className="font-medium">{booking.driverName || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500 text-xs">Contact</div>
                                  <div className="font-medium">{booking.driverNumber || "-"}</div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-gray-500 text-xs">Location</div>
                                <div className="font-medium">{isPassenger ? currentUserAsPassenger.location : booking.location || "-"}</div>
                              </div>
                              
                              <div>
                                <div className="text-gray-500 text-xs">Reason</div>
                                <div className="font-medium">{isPassenger ? currentUserAsPassenger.reason : booking.reason || "-"}</div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                  <div className="text-gray-500 text-xs">Duration</div>
                                  <div className="font-medium">{isPassenger ? currentUserAsPassenger.duration : booking.duration || "-"}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500 text-xs">Members</div>
                                  <div className="font-medium">{isPassenger ? currentUserAsPassenger.members : booking.members || "-"}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons for approved or shared bookings */}
                            {(booking.status === 'approved' || booking.status === 'shared') && (
                              <div className="flex gap-2 mt-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleCompleteBooking(booking._id)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1.5" />
                                    Complete
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleCancelBooking(booking._id)}
                                  >
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                    Cancel
                                  </Button>
                              </div>
                            )}
                            
                            {/* Shared ride passengers section */}
                            {booking.status === "shared" && booking.passengers?.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => toggleSharedDetails(booking._id)}
                                  className="flex items-center justify-between w-full bg-blue-50 p-2.5 rounded-md text-blue-600 text-sm font-medium"
                                >
                                  <span>View {booking.passengers.length} Passengers</span>
                                  {expandedSharedRows[booking._id] ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                
                                {expandedSharedRows[booking._id] && (
                                  <div className="mt-3 space-y-3">
                                    {booking.passengers.map((passenger, idx) => (
                                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="font-medium text-sm mb-1">{passenger.username || "Unknown"}</div>
                                        <div className="grid grid-cols-1 gap-2 text-xs">
                                          <div className="flex items-center">
                                            <span className="text-gray-500 w-16">Contact:</span>
                                            <span className="font-medium">{passenger.number || "N/A"}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-gray-500 w-16">Location:</span>
                                            <span className="font-medium">{passenger.location || "N/A"}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-gray-500 w-16">Reason:</span>
                                            <span className="font-medium">{passenger.reason || "N/A"}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-gray-500 w-16">Members:</span>
                                            <span className="font-medium">{passenger.members || 1}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-gray-500 w-16">Duration:</span>
                                            <span className="font-medium">{passenger.duration || "-"}</span>
                                          </div>
                                          <div className="flex items-center">
                                            <span className="text-gray-500 w-16">Time:</span>
                                            <span className="font-medium">
                                              {passenger.bookingTime ? 
                                                new Date(passenger.bookingTime).toLocaleString(undefined, {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                }) : 
                                                "N/A"
                                              }
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {activeTab === "profile" && (
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Profile</h2>
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Username</label>
                  <p className="py-2 px-3 bg-gray-100 rounded-md">{username}</p>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Phone Number</label>
                  <p className="py-2 px-3 bg-gray-100 rounded-md">{number}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "notifications" && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-2xl sm:text-3xl font-semibold">Notifications</h2>
            <Button onClick={subscribeUserToPush} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition w-full sm:w-auto">
              Enable Notifications 🔔
            </Button>
          </div>
          
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                You have no notifications.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((note) => (
                <Card key={note._id} className={note.read ? "bg-gray-50" : "bg-white"}>
                  <CardContent className="p-4">
                    <p className="text-gray-800">{note.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )} 
      </section>
    </main>
    
    
    {/* Booking Modal */}
    {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Book a Ride</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
          
          <form onSubmit={handleBookingSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Select Date & Time *</label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    date.setSeconds(0);
                    date.setMilliseconds(0);
                    setSelectedDate(date);
                  }}
                  showTimeSelect
                  dateFormat="Pp"
                  className="w-full p-2 border rounded"
                  minDate={new Date()}
                  placeholderText="Pick a date and time"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Location *</label>
                <input
                  type="text"
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Reason *</label>
                <input
                  type="text"
                  placeholder="Reason for booking"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Duration *</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select duration</option>
                  <option value="0.5">0.5 Hour</option>
                  <option value="1">1 Hour</option>
                  <option value="1.5">1.5 Hours</option>
                  <option value="2">2 Hours</option>
                  <option value="2.5">2.5 Hours</option>
                  <option value="3">3 Hours</option>
                  {/* Add more if needed */}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Number of Members *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Number of members traveling"
                  value={members}
                  onChange={(e) => setMembers(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition flex-1"
              >
                Book Ride
              </button>
              
              <button
                type="button"
                onClick={handleCloseModal}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    
    
    <footer className="bg-gray-800 text-white p-3 text-center text-xs sm:text-sm">
      <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
    </footer>
  </div>
);
};

export default UserDashboard;
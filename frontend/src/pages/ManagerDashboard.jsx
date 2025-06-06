import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import {  
  Car, 
  Home, 
  Calendar,
  LogOut,
  Clock,
  CheckCircle,
  Search,
  LayoutDashboard,
  User,
  ChevronDown,
  ChevronRight,
  XCircle,
  EditIcon,
  MergeIcon,
 
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Enhanced API hook with better error handling and caching
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

// Main Dashboard Component
const ManagerDashboard = () => {
  const [bookings, setBookings] = useState({ pending: [], approved: [], cancelled: [], merged: [], completed: [], confirmed: [], shared:[], all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [successMessage] = useState("");
  const [expandedSharedRows, setExpandedSharedRows] = useState({});
  const [editModal, setEditModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatedData, setUpdatedData] = useState({});
  const [vehicles, setVehicles] = useState([]);
  // const [guestBookings, setGuestBookings] = useState([]);
  
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

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/vehicles/getVehicles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(res.data);
      // eslint-disable-next-line no-unused-vars
      } catch (err) {
        toast.error("Failed to load vehicles");
      }
    };
    fetchVehicles();
  }, []);
  
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingBookings, allBookings] = await Promise.all([
        apiCall("get","/api/bookings/pending"),
        apiCall("get", "/api/bookings/all")
      ]);
      
      // Filter out the original bookings that were merged into other bookings
      const filteredBookings = allBookings.filter(b => b.status !== 'merged');
      
      const approved = filteredBookings.filter(b => b.status === 'approved');
      const shared = filteredBookings.filter(b => b.status === 'shared');
      const cancelled = filteredBookings.filter(b => b.status === 'cancelled');
      const completed = filteredBookings.filter(b => b.status === 'completed');
      const confirmed = filteredBookings.filter(b => b.status === 'confirmed');
      
      // For the merged category, show the new merged bookings (they have status 'approved' and isSharedRide=true)
      // const merged = filteredBookings.filter(
      //   b => b.status === 'shared' && b.isSharedRide && b.mergedFrom?.length
      // );
      
       setBookings({ 
        pending: pendingBookings, 
        approved,
        shared,
        cancelled,
        completed,
        confirmed,
        all: filteredBookings 
      });
      setError("");
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      setError("Failed to load bookings. Please try again.");
      if (error.response?.status === 401) {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall, navigate])

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/");
      return;
    }
    
    fetchBookings();
    
    const interval = setInterval(() => {
      fetchBookings();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [fetchBookings, navigate]);
  
  const handleCompleteBooking = async (bookingId) => {
    try {
      // Make API call to update the booking status on the server
      await apiCall("post", "/api/bookings/complete", { bookingId });
      
      toast.success("Booking completed successfully!");
      await fetchBookings();
    } catch (err) {
      console.error("Error in handleCompleteBooking:", err);
      toast.error("Failed to update booking status");
    }
  };

  // useEffect(() => {
  //   const fetchGuestBookings = async () => {
  //     try {
  //       const token = localStorage.getItem("token");
  //       const response = await axios.get(
  //         `${import.meta.env.VITE_API_BASE_URL}/api/bookings`,
  //         { headers: { Authorization: `Bearer ${token}` } }
  //       );

  //       const onlyGuestBookings = response.data.filter(b => b.isGuestBooking);
  //       setGuestBookings(onlyGuestBookings);
  //     } catch (err) {
  //       console.error("Error fetching guest bookings:", err);
  //       setError("Failed to load bookings.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchGuestBookings();
  // }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
    }
  };

  const handleEditBooking = async (bookingId, updatedData) => {
    try {
      const token = localStorage.getItem("token");

      console.log("🛠 Sending update to backend for booking:", bookingId);
      console.log("📦 Payload:", updatedData);

      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/bookings/editRide`,
        {
          bookingId,
          driverName: updatedData.driverName,
          driverNumber: updatedData.driverNumber,
          vehicleName: updatedData.vehicleName,
          scheduledAt: updatedData.scheduledAt
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log("✅ Backend response:", response.data);

      // Update local state to reflect the change
      setBookings(prev => {
        const updateBooking = (arr) =>
          Array.isArray(arr)
            ? arr.map(b =>
                b._id === bookingId
                  ? {
                      ...b,
                      ...response.data.updatedFields
                    }
                  : b
              )
            : arr;

        return {
          ...prev,
          pending: updateBooking(prev.pending),
          approved: updateBooking(prev.approved),
          shared: updateBooking(prev.shared),
          cancelled: updateBooking(prev.cancelled),
          completed: updateBooking(prev.completed),
          confirmed: updateBooking(prev.confirmed),
          all: updateBooking(prev.all)
        };
      });

      toast.success("Booking updated successfully");

    } catch (err) {
      console.error("❌ Failed to update booking:", err);
      toast.error(err.response?.data?.message || "Update failed. Try again.");
    }
  };

  const toggleSharedDetails = (bookingId) => {
    setExpandedSharedRows(prev => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/bookings/cancel`,
          { bookingId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Booking cancelled successfully.");
        fetchBookings(); // Or whatever your refresh method is
      } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.error || "Failed to cancel booking.";
        toast.error(errorMsg);
      }
    }
  };

  const formatDate = (booking) => {
    // Check for scheduledAt field first (as shown in your data sample)
    const dateString = booking.scheduledAt || booking.dateTime || booking.date;
    
    if (!dateString) return "No date available";
    
    try {
      // Parse the ISO string date
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString);
        return "Invalid date format";
      }
      
      // Format the date in a user-friendly way
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
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'shared':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Shared</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const filterBookings = (bookingsList) => {
    if (!searchTerm) return bookingsList;
    
    return bookingsList.filter(booking => 
      booking.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.userId?.username && booking.userId.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.driverName && booking.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.vehicleId?.name && booking.vehicleId.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  if (!localStorage.getItem("token")) {
    navigate("/");
    return null;
  }

  const navItems = [
    { name: "Home", path: "/home", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
    { name: "Bookings", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
  ];

  const nonPendingBookings = [
    ...bookings.approved,
    ...bookings.completed,
    ...bookings.cancelled,
    ...bookings.shared
  ];

  const confirmedBookings = [
    ...bookings.confirmed
  ]
  
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
          <h2 className="text-2xl font-bold text-white">Welcome, {username}!</h2>
          <button 
            onClick={handleLogout}
            className="bg-transparent hover:bg-white/10 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-all"
          >
            <span>Logout</span>
            <LogOut className="ml-2 h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - now below navbar */}
        <div className="hidden md:flex flex-col w-64 bg-blue-950 text-white flex-shrink-0 overflow-y-auto z-20">
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
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {successMessage && (
              <Alert className="mb-4 bg-green-100 border-green-500">
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Booking Management</h1>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Pending Bookings Table */}
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-xl flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-blue-600" />
                    Pending Bookings ({bookings.pending.length})
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="p-6 text-center">Loading bookings...</div>
                    ) : bookings.pending.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">No pending bookings found</div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">User</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Date & Time</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Location</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Reason</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filterBookings(bookings.pending).map((booking) => (
                            <tr key={booking._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-center text-sm">{booking.userId?.username || 'Unknown User'}</td>
                              <td className="px-4 py-3 text-center text-sm">
                                {formatDate(booking)}
                              </td>
                              <td className="px-4 py-3 text-center text-sm">{booking.location}</td>
                              <td className="px-4 py-3 text-center text-sm">{booking.reason}</td>
                              <td className="px-6 py-4 text-center whitespace-nowrap">{booking.duration || "-"}</td>
                              <td className="px-6 py-4 text-center whitespace-nowrap">{ booking.members || "-"}</td>
                              <td className="px-4 py-3 text-center text-sm">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  onClick={() => navigate(`/manager/approve/${booking._id}`)}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="ml-2 bg-red-50 text-red-600 hover:bg-red-100"
                                  onClick={() => handleCancelBooking(booking._id)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="ml-2 bg-purple-50 text-purple-600 hover:bg-purple-100"
                                  onClick={() => navigate(`/manager/merge/${booking._id}`)}
                                >
                                  Merge
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* All Other Bookings Table */}
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-xl flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                    All Bookings ({nonPendingBookings.length})
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="p-6 text-center">Loading bookings...</div>
                    ) : nonPendingBookings.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">No bookings found</div>
                    ) : (
                      <table className="min-w-[640px] w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden text-xs sm:text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {[
                              "User", "Date", "Location", "Reason", "Duration", "Members",
                              "Driver", "Vehicle", "Status", "Actions", "Edit"
                            ].map((header, index) => (
                              <th
                                key={index}
                                scope="col"
                                className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[11px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                          {filterBookings(nonPendingBookings).map((booking) => (
                            <React.Fragment key={booking._id}>
                              <tr className="group hover:bg-gray-50 transition-colors">
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.userId?.username || "Unknown User"}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>{formatDate(booking).split(",")[0]}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{formatDate(booking)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center break-words">{booking.location}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center break-words" title={booking.reason}>
                                  <span className="max-w-[150px] truncate inline-block">{booking.reason}</span>
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.displayDuration || booking.duration || "-"}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.members ? (booking.displayMembers || booking.members) : "-"}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.driverName || <span className="text-gray-500 italic">Not assigned</span>}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.vehicleName}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{getStatusBadge(booking.status)}</td>

                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                  {(booking.status === "approved" || booking.status === "shared") && (
                                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                                      <div className="flex justify-center flex-wrap gap-1 sm:gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleCompleteBooking(booking._id)}>
                                          <CheckCircle className="w-4 h-4 mr-1.5" />
                                          Complete
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleCancelBooking(booking._id)}>
                                          <XCircle className="w-4 h-4 mr-1.5" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div className="flex justify-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedBooking(booking); setEditModal(true); }}>
                                      <EditIcon className="w-4 h-4 mr-1.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50" onClick={() => navigate(`/manager/merge/${booking._id}`)}>
                                      <MergeIcon className="w-4 h-4 mr-1.5" />
                                      Merge
                                    </Button>
                                  </div>
                                  {(["shared", "completed", "cancelled"].includes(booking.status)) && (
                                    <div className="mt-2 flex justify-center">
                                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 p-0" onClick={() => toggleSharedDetails(booking._id)}>
                                        {expandedSharedRows[booking._id] ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-primary" />}
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>

                              {/* Expandable Passengers */}
                              {expandedSharedRows[booking._id] && booking.passengers?.length > 0 && (
                                <tr className="bg-gray-50/50 border-b border-gray-200">
                                  <td colSpan={11} className="px-4 py-4">
                                    <div className="text-center mb-3">
                                      <h4 className="font-medium text-sm text-gray-700">
                                        <User className="inline-block w-4 h-4 mr-1.5" />
                                        Passengers ({booking.passengers.length})
                                      </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                      {booking.passengers.map((passenger, index) => (
                                        <Card key={index} className="h-full flex flex-col overflow-hidden border-blue-200 shadow-sm hover:shadow transition-shadow">
                                          <CardContent className="p-0">
                                            <div className="bg-primary/5 px-4 py-2.5 border-b border-blue-200 text-center">
                                              <span className="font-medium text-sm">{passenger.username}</span>
                                              <Badge variant="outline" className="bg-white text-xs ml-2">
                                                Passenger {index + 1}
                                              </Badge>
                                            </div>
                                            <div className="p-4 space-y-2 text-xs sm:text-sm text-left">
                                              {[
                                                { label: "Contact", value: passenger.number },
                                                { label: "Location", value: passenger.location },
                                                { label: "Reason", value: passenger.reason },
                                                { label: "Members", value: passenger.members },
                                                { label: "Duration", value: passenger.duration },
                                                { label: "Time", value: new Date(passenger.bookingTime).toLocaleString() },
                                              ].map((item, idx) => (
                                                <div className="flex gap-2" key={idx}>
                                                  <span className="text-gray-500 w-20 flex-shrink-0">{item.label}:</span>
                                                  <span className="font-medium break-words">{item.value}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-xl flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                    Guest Bookings ({confirmedBookings.length})
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="p-6 text-center">Loading bookings...</div>
                    ) : confirmedBookings.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">No bookings found</div>
                    ) : (
                      <table className="min-w-[640px] w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden text-xs sm:text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {[
                              "Guest Name", "Guest Number","Date", "Location", "Reason", "Duration", "Members",
                              "Driver", "Vehicle", "Status", "Actions", "Edit"
                            ].map((header, index) => (
                              <th
                                key={index}
                                scope="col"
                                className="px-2 sm:px-4 py-2 sm:py-3 text-center text-[11px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                          {filterBookings(confirmedBookings).map((booking) => (
                            <React.Fragment key={booking._id}>
                              <tr className="group hover:bg-gray-50 transition-colors">
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.guestName || "Unknown User"}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.guestPhone || "Unknown User"}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>{formatDate(booking).split(",")[0]}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{formatDate(booking)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center break-words">{booking.location}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center break-words" title={booking.reason}>
                                  <span className="max-w-[150px] truncate inline-block">{booking.reason}</span>
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.displayDuration || booking.duration || "-"}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.members ? (booking.displayMembers || booking.members) : "-"}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.driverName || <span className="text-gray-500 italic">Not assigned</span>}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{booking.vehicleName}</td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">{getStatusBadge(booking.status)}</td>

                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                  {(booking.status === "confirmed" || booking.status === "shared") && (
                                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                                      <div className="flex justify-center flex-wrap gap-1 sm:gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleCompleteBooking(booking._id)}>
                                          <CheckCircle className="w-4 h-4 mr-1.5" />
                                          Complete
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleCancelBooking(booking._id)}>
                                          <XCircle className="w-4 h-4 mr-1.5" />
                                          Cancel
                                        </Button>
                                      </div>
                                      {/* <div className="flex justify-center gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedBooking(booking); setEditModal(true); }}>
                                          <EditIcon className="w-4 h-4 mr-1.5" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="bg-purple-50 text-purple-600 hover:bg-purple-100" onClick={() => navigate(`/manager/merge/${booking._id}`)}>
                                          Merge
                                        </Button>
                                      </div> */}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  {(["confirmed"].includes(booking.status)) && (
                                    <div className="flex justify-center gap-2">
                                      <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setSelectedBooking(booking); setEditModal(true); }}>
                                        <EditIcon className="w-4 h-4 mr-1.5" />
                                      </Button>
                                      {/* <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 p-0" onClick={() => toggleSharedDetails(booking._id)}>
                                        {expandedSharedRows[booking._id] ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-primary" />}
                                      </Button> */}
                                    </div>
                                  )}
                                </td>
                              </tr>

                              {/* Expandable Passengers */}
                              {expandedSharedRows[booking._id] && booking.passengers?.length > 0 && (
                                <tr className="bg-gray-50/50 border-b border-gray-200">
                                  <td colSpan={11} className="px-4 py-4">
                                    <div className="text-center mb-3">
                                      <h4 className="font-medium text-sm text-gray-700">
                                        <User className="inline-block w-4 h-4 mr-1.5" />
                                        Passengers ({booking.passengers.length})
                                      </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                      {booking.passengers.map((passenger, index) => (
                                        <Card key={index} className="h-full flex flex-col overflow-hidden border-blue-200 shadow-sm hover:shadow transition-shadow">
                                          <CardContent className="p-0">
                                            <div className="bg-primary/5 px-4 py-2.5 border-b border-blue-200 text-center">
                                              <span className="font-medium text-sm">{passenger.username}</span>
                                              <Badge variant="outline" className="bg-white text-xs ml-2">
                                                Passenger {index + 1}
                                              </Badge>
                                            </div>
                                            <div className="p-4 space-y-2 text-xs sm:text-sm text-left">
                                              {[
                                                { label: "Contact", value: passenger.number },
                                                { label: "Location", value: passenger.location },
                                                { label: "Reason", value: passenger.reason },
                                                { label: "Members", value: passenger.members },
                                                { label: "Duration", value: passenger.duration },
                                                { label: "Time", value: new Date(passenger.bookingTime).toLocaleString() },
                                              ].map((item, idx) => (
                                                <div className="flex gap-2" key={idx}>
                                                  <span className="text-gray-500 w-20 flex-shrink-0">{item.label}:</span>
                                                  <span className="font-medium break-words">{item.value}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
      
      {editModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <h2 className="text-lg font-bold mb-4">Edit Booking</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditBooking(selectedBooking._id, updatedData);
                setEditModal(false);
                setUpdatedData({}); // Reset after submission
              }}
              className="space-y-4"
            >
              {/* Vehicle Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">Select Vehicle</label>
                <select
                  value={updatedData.vehicleId || selectedBooking?.vehicleId?._id || ""}
                  onChange={(e) => {
                    const selected = vehicles.find(v => v._id === e.target.value);
                    if (selected) {
                      setUpdatedData(prev => ({
                        ...prev,
                        vehicleId: selected._id,
                        vehicleName: selected.name,
                        driverName: selected.driverName,
                        driverNumber: selected.driverNumber
                      }));
                    }
                  }}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>Select Vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle._id} value={vehicle._id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>

              

              {/* Driver Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Driver Name</label>
                <input
                  type="text"
                  placeholder="Driver Name"
                  value={updatedData.driverName || selectedBooking?.driverName || ""}
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
              </div>

              {/* Driver Number */}
              <div>
                <label className="block text-sm font-medium mb-1">Driver Number</label>
                <input
                  type="text"
                  placeholder="Driver Number"
                  value={updatedData.driverNumber || selectedBooking?.driverNumber || ""}
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
              </div>

              {/* Editable Scheduled Time - FIXED */}
              <div>
                <label className="block text-sm font-medium mb-1">Scheduled Time</label>
                <DatePicker
                  selected={
                    updatedData.scheduledAt
                      ? new Date(updatedData.scheduledAt)
                      : selectedBooking?.scheduledAt
                      ? new Date(selectedBooking.scheduledAt)
                      : null
                  }
                  onChange={(date) => {
                    console.log("Time changed to:", date); // Debug log
                    setUpdatedData((prev) => ({
                      ...prev,
                      scheduledAt: date.toISOString(),
                    }));
                  }}
                  showTimeSelect
                  dateFormat="Pp"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholderText="Select date and time"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setEditModal(false);
                    setUpdatedData({}); // Reset updated data
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}


      <button
        onClick={() => setSidebarOpen(prev => !prev)}
        className="fixed z-50 bottom-4 right-4 p-3 rounded-full bg-blue-600 text-white shadow-lg md:hidden"
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
      
      <div 
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden transition duration-200 ease-in-out z-40 w-64 bg-blue-950 shadow-md`}
      >
        <div className="p-4">
          <div className="text-center mb-6 border-b pb-2">
            <h2 className="text-xl text-white font-bold">Dashboard</h2>
            {/* <button 
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button> */}
          </div>
          
          <nav className="mt-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="flex items-center py-3 px-4 rounded-md hover:bg-blue-900 text-white transition-colors"
                    onClick={() => setSidebarOpen(false)}
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
      
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ManagerDashboard;
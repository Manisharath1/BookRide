import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


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
  const [bookings, setBookings] = useState({ pending: [], approved: [], cancelled: [], merged: [], completed: [], shared:[], all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [successMessage] = useState("");
  const [expandedSharedRows, setExpandedSharedRows] = useState({});

  
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

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
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
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'shared':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Shared</Badge>;
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
  
  return (
    <div className="flex flex-col min-h-screen">
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
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date & Time</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Location</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filterBookings(bookings.pending).map((booking) => (
                            <tr key={booking._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">{booking.userId?.username || 'Unknown User'}</td>
                              <td className="px-4 py-3 text-sm">
                                {formatDate(booking)}
                              </td>
                              <td className="px-4 py-3 text-sm">{booking.location}</td>
                              <td className="px-4 py-3 text-sm">{booking.reason}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{booking.duration || "-"}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{ booking.members || "-"}</td>
                              <td className="px-4 py-3 text-sm">
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
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reason
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Members
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Driver
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vehicle
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            ></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filterBookings(nonPendingBookings).map((booking) => (
                            <React.Fragment key={booking._id}>
                              <tr className="group hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3.5 text-sm font-medium">
                                  <div className="flex items-center gap-2">
                                    <span>{booking.userId?.username || "Unknown User"}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5">
                                          <span>{formatDate(booking).split(",")[0]}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{formatDate(booking)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </td>
                                <td className="px-4 py-3.5 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <span>{booking.location}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <span className="max-w-[150px] truncate" title={booking.reason}>
                                      {booking.reason}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm font-medium ">
                                  <div className="flex items-center gap-1.5">
                                    {booking.duration || "-"}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-sm font-medium">
                                  {booking.members ? (
                                    <div className="flex items-center gap-1.5">
                                      <span>{booking.members}</span>
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-sm">
                                  {booking.driverName ? (
                                    <div className="flex items-center gap-1.5">
                                      <span>{booking.driverName}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 italic">Not assigned</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-sm">
                                  {booking.vehicleId.name}
                                </td>
                                <td className="px-4 py-3.5 text-sm">{getStatusBadge(booking.status)}</td>
                                <td className="px-4 py-3.5 text-sm">
                                  {(booking.status === "approved" || booking.status === "shared") && (
                                    <div className="flex flex-wrap gap-2 ">
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
                                </td>
                                <td className="px-4 py-3.5">
                                  {booking.status === "shared" && booking.passengers?.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => toggleSharedDetails(booking._id)}
                                      className="rounded-full h-8 w-8 p-0"
                                    >
                                      {expandedSharedRows[booking._id] ? (
                                        <ChevronDown className="w-5 h-5 text-primary" />
                                      ) : (
                                        <ChevronRight className="w-5 h-5 text-primary" />
                                      )}
                                    </Button>
                                  )}
                                </td>
                              </tr>
                              {expandedSharedRows[booking._id] && booking.passengers?.length > 0 && (
                                <tr className="bg-gray-50/50 border-b border-gray-200">
                                  <td colSpan={11} className="px-6 py-4">
                                    <div className="mb-2">
                                      <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                                        <User className="w-4 h-4 mr-2" />
                                        Passengers ({booking.passengers.length})
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                        {booking.passengers.map((passenger, index) => (
                                          <Card
                                            key={index}
                                            className="overflow-hidden border-blue-200 shadow-sm hover:shadow transition-shadow"
                                          >
                                            <CardContent className="p-0">
                                              <div className="bg-primary/5 px-4 py-2.5 border-b border-blue-200">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{passenger.username}</span>
                                                  </div>
                                                  <Badge variant="outline" className="bg-white text-xs">
                                                    Passenger {index + 1}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div className="p-4 space-y-2 text-sm">
                                                <div className="flex items-start gap-2">
                                                  <span className="text-gray-500 w-20 flex-shrink-0">Contact:</span>
                                                  <span className="font-medium">{passenger.number}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                  <span className="text-gray-500 w-20 flex-shrink-0">Location:</span>
                                                  <span className="font-medium">{passenger.location}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                  <span className="text-gray-500 w-20 flex-shrink-0">Reason:</span>
                                                  <span className="font-medium">{passenger.reason}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                  <span className="text-gray-500 w-20 flex-shrink-0">Time:</span>
                                                  <span className="font-medium text-xs">
                                                    {new Date(passenger.bookingTime).toLocaleString()}
                                                  </span>
                                                </div>
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
          <div className="flex items-center mb-6 border-b pb-2">
            <h2 className="text-xl text-white font-bold">Dashboard</h2>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
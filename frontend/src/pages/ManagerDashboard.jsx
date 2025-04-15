/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Search } from "lucide-react";
import axios from "axios";
import {  
  Car, 
  Home, 
  Calendar,
  Merge,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import Modal from "./Modal";


// Enhanced API hook with better error handling and caching
const useAPI = () => {
  const navigate = useNavigate();
  const baseURL = "http://localhost:5000/api";
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
  }, [getAuthHeaders, navigate]);

  return { apiCall, isLoading };
};

// Enhanced Pending Booking Item Component
const PendingBookingItem = ({ booking, fetchBookings }) => {
  const navigate = useNavigate();
  const [driverDetails, setDriverDetails] = useState({
    driverName: "",
    driverNumber: "",
    vehicleId: "",
    vehicleName: ""
  });
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableBookings, setAvailableBookings] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [primaryBookingId, setPrimaryBookingId] = useState(null);
 
  
  useEffect(() => {
    if (booking) {
      // Auto-populate fields with data from the booking if available
      setDriverDetails({
        driverName: booking.driverName || "",
        driverNumber: booking.driverNumber || "",
        vehicleId: booking.vehicleId || "",
        vehicleName: booking.vehicleName || ""
      });
    }
  }, [booking]);

   const handleChange = (e) => {
    setDriverDetails(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Clear error when user starts typing
    if (error) setError("");
    if (message) setMessage("");
  };

  const handleApproveClick = async () => {
    const { driverName, driverNumber, vehicleName } = driverDetails;
    
    if (!driverName || !driverNumber || !vehicleName) {
      setError("Please enter driver and vehicle details before approving.");
      return;
    }
    
    setIsSubmitting(true);
      
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("No token found");
        navigate("/");
        return;
      }

      // Get reason for assignment, prefilled with location if available
      const defaultReason = ` ${booking.reason}`;
      let reason = null;
      
      // Use a custom prompt that forces user to enter reason or click cancel
      const promptReason = () => {
        const userInput = window.prompt("Reason for assignment (optional):", defaultReason);
        // If user clicks OK (even with empty input) or provides text, process the approval
        return userInput !== null ? userInput : null;
      };
      
      reason = promptReason();
      
      // If user clicked Cancel on the prompt, abort the approval process
      if (reason === null) {
        setIsSubmitting(false);
        return;
      }
      
      const response = await axios.post(
        "http://localhost:5000/api/bookings/approve",
        {
          bookingId: booking._id,
          driverName: driverName,
          driverNumber: driverNumber,
          vehicleId: driverDetails.vehicleId,
          reason: reason || defaultReason
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // console.log("API Response:", response.data)
      toast.success(response.data.message || "Booking approved successfully!");

      // ✅ Refresh bookings after a delay
      setTimeout(() => {
        fetchBookings();
      }, 500);
  
    } catch (err) {
      console.error("Approval error:", err.response || err);

      if (err.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      setError(err.response?.data?.error || "Failed to approve booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    setMessage("");
    
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("No token found");
        navigate("/");
        return;
      }
  
      // Ask user for cancellation reason
      const reason = window.prompt("Please provide a reason for cancellation (optional):");
      
      // If user clicked Cancel on the prompt, abort the cancellation process
      if (reason === null) {
        setIsSubmitting(false);
        return;
      }
  
      const response = await axios.post(
        "http://localhost:5000/api/bookings/cancel",
        {
          bookingId: booking._id,
          reason: reason || "No reason provided"
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      if (response.data) {
        setMessage("Booking cancelled successfully!");
        // Refresh the bookings list
        setTimeout(() => {
          fetchBookings();
        }, 1000);
      }
    } catch (err) {
      console.error("Cancel error:", err.response || err);
      
      if (err.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }
      
      setError(err.response?.data?.error || "Failed to cancel booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset fields to original booking data
  // const handleResetFields = () => {
  //   setDriverDetails({
  //     driverName: booking.guestName || "",
  //     driverNumber: booking.guestPhone || "",
  //     vehicleId: booking.vehicleInfo || "",
  //     vehicleName: booking.vehicleName || ""
  //   });
  //   setError("");
  //   setMessage("");
  // };

  // // Format the booking date for display
  // const formatDate = (dateString) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleString();
  // };

  const handleReschedule = async (bookingId, newDate) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        "http://localhost:5000/api/bookings/reschedule",
        {
          bookingId,
          newDate
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
  
      window.alert(response.data.message || "Rescheduled successfully");
      fetchBookings(); // reload updated data
    } catch (err) {
      console.error("Failed to reschedule:", err);
      toast.error("Error rescheduling booking");
    }
  };

  useEffect(() => {
    async function fetchDrivers() {
      try {
        const res = await fetch("http://localhost:5000/api/vehicles/drivers"); // change this to your actual endpoint
        const data = await res.json();
        setDrivers(data); // assuming data is an array of driver objects
      } catch (error) {
        console.error("Failed to fetch drivers:", error);
      }
    }
    fetchDrivers();
  },[]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/vehicles/getVehicles",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVehicles(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      setError("Failed to load vehicles. Please try again.");
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("No token found");
        navigate("/");
        return;
      }
      
      const response = await axios.get(
        "http://localhost:5000/api/bookings/all",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data) {

        const eligibleBookings = response.data.filter(b => 
          b.status === 'pending' || b.status === 'approved'
        );
        
        // Pre-select the current booking
        setSelectedBookings([booking._id]);
        setPrimaryBookingId(booking._id);
        setAvailableBookings(eligibleBookings);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Error fetching bookings for merge:", err);
      toast.error("Failed to load bookings for merging");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitMerge = async () => {
    if (selectedBookings.length < 2) {
      toast.error('Please select at least two bookings to merge');
      return;
    }
  
    if (!primaryBookingId) {
      toast.error('Please select a primary booking');
      return;
    }
  
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.post(
        "http://localhost:5000/api/bookings/merge",
        {
          bookingIds: selectedBookings,
          primaryBookingId,
          newDetails: { isSharedRide: true }
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success(response.data.message || "Bookings successfully merged into a shared ride");
      setIsModalOpen(false);
      setSelectedBookings([]);
      setPrimaryBookingId(null);
      
      // Refresh the bookings list
      setTimeout(() => {
        fetchBookings();
      }, 500);
    } catch (err) {
      console.error("Merge error:", err.response || err);
      toast.error(err.response?.data?.error || "Failed to merge bookings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBookingSelection = (bookingId) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId));
      if (primaryBookingId === bookingId) {
        setPrimaryBookingId(null);
      }
    } else {
      setSelectedBookings([...selectedBookings, bookingId]);
    }
  };
  
  const setPrimary = (bookingId) => {
    setPrimaryBookingId(bookingId);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBookings([]);
    setPrimaryBookingId(null);
  };


  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <div className="bg-gray-50 p-4 rounded shadow-md mb-4 border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-lg">Name: {booking.userId?.username || "Unknown"}</p>
          <p className="font-semibold text-lg">Location: {booking.location}</p>
          <p className="font-semibold text-lg">Reason: {booking.reason}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 whitespace-nowrap">
              Scheduled:
            </p>
            <DatePicker
              selected={booking.scheduledAt ? new Date(booking.scheduledAt) : null}
              onChange={(date) => handleReschedule(booking._id, date)}
              showTimeSelect
              dateFormat="Pp"
              placeholderText="Pick date & time"
              className="border px-2 py-1 rounded w-full"
            />
          </div>


        </div>
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      </div>
      
      <div className="space-y-2 mt-4 bg-white p-3 rounded border border-gray-200">
        <h4 className="text-sm font-medium mb-2">Driver Assignment</h4>
        <select
          name="vehicleName"
          value={driverDetails.vehicleName}
          onChange={(e) => {
            const selected = vehicles.find(v => v.name === e.target.value);
            setDriverDetails((prev) => ({
              ...prev,
              vehicleName: selected?.name || "",
              driverName: selected?.driverName || "",
              driverNumber: selected?.driverNumber || ""
            }));
          }}
          disabled={isSubmitting || loading}
          required
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select a vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.vehicleID} value={vehicle.name}>
              {vehicle.name}
            </option>
          ))}
        </select>
        <select
          name="driverName"
          value={driverDetails.driverName}
          onChange={(e) => {
            const selectedDriver = drivers.find(d => d.name === e.target.value);
            setDriverDetails(prev => ({
              ...prev,
              driverName: selectedDriver?.name || "",
              driverNumber: selectedDriver?.number || ""
            }));
          }}
          disabled={isSubmitting}
          required
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select a driver</option>
          {Array.isArray(drivers) &&
            drivers.map((driver, index) => (
              <option key={index} value={driver.name}>
                {driver.name}
              </option>
          ))}
        </select>
        <Input
          name="driverNumber"
          placeholder="Driver Number *"
          value={driverDetails.driverNumber}
          onChange={handleChange}
          disabled={isSubmitting}
          required
        />
        
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        <Button 
          onClick={handleApproveClick} 
          className="flex-1 sm:flex-none"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Approve Booking"}
        </Button>
        <Button 
          onClick={handleCancel} 
          variant="outline" 
          className="flex-1 sm:flex-none border-red-300 text-red-600 hover:bg-red-50"
          disabled={isSubmitting}
        >
          Cancel Booking
        </Button>
        <Button
          onClick={handleMerge}
          variant="outline" 
          className="flex-1 sm:flex-none border-green-300 text-green-600 hover:bg-green-50"
          disabled={isSubmitting}
        >
          Merge Booking
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {message && (
        <Alert variant="success" className="mt-2 bg-green-50 text-green-800 border border-green-200">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* At the end of your JSX, just before the final closing div */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal}
        title="Merge Bookings"
      >
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Select bookings to merge into a shared ride</h2>
          
          {availableBookings.length === 0 ? (
            <p className="text-gray-500">No eligible bookings found for merging.</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availableBookings.map(booking => (
                <div 
                  key={booking._id} 
                  className={`p-3 border rounded-md ${
                    selectedBookings.includes(booking._id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`booking-${booking._id}`}
                        checked={selectedBookings.includes(booking._id)}
                        onChange={() => toggleBookingSelection(booking._id)}
                        className="mr-3"
                      />
                      <label htmlFor={`booking-${booking._id}`} className="flex-1">
                        <span className="font-medium">{booking.userId?.username || "Unknown"}</span>
                        <div className="text-sm text-gray-600">
                          Location: {booking.location}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(booking.scheduledAt).toLocaleString()} • 
                          Status: <span className="capitalize">{booking.status}</span>
                        </div>
                      </label>
                    </div>
                    
                    {selectedBookings.includes(booking._id) && (
                      <div>
                        <input
                          type="radio"
                          id={`primary-${booking._id}`}
                          name="primaryBooking"
                          checked={primaryBookingId === booking._id}
                          onChange={() => setPrimary(booking._id)}
                          className="mr-1"
                        />
                        <label htmlFor={`primary-${booking._id}`} className="text-sm">
                          Primary
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-between mt-6">
            <Button
              onClick={closeModal}
              variant="outline"
              className="border border-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <Button
              onClick={submitMerge}
              className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
              disabled={selectedBookings.length < 2 || !primaryBookingId || isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Create Shared Ride'}
            </Button>
          </div>
        </div>
      </Modal>
      
    </div>
  );
};

// Booking List Item for History View
const BookingHistoryItem = ({ booking, onCompleteBooking,  }) => {

  const navigate = useNavigate();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

    // Get appropriate status badge styling
  const getStatusBadge = (status) => {
    switch(status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-white hover:text-green-800">Approved</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-white hover:text-red-800" >Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-white hover:text-blue-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-white hover:text-yellow-800">Pending</Badge>;
      case 'merged':
        return <Badge className="bg-fuchsia-100 text-fuchsia-800 hover:bg-white hover:text-fuchsia-800">Shared</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{typeof status === 'string' ? status : 'Unknown'}</Badge>;
    }
  };

  // Format the booking date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleComplete = async () => {
    // console.log("handleComplete triggered");
    if (!window.confirm("Are you sure you want to mark this ride as completed?")) return;
  
    setIsCompleting(true);
    setError(null);
    setSuccessMessage(null); // ← in case you re-click and want to reset
  
    try {
      const token = localStorage.getItem("token");
  
      if (!token) {
        console.error("No token found");
        navigate("/");
        return;
      }
  
      const response = await axios.post(
        "http://localhost:5000/api/bookings/complete",
        { bookingId: booking._id },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      // console.log("Response received:", response.data);
  
     
      if (response.data.message) {
        toast.success(response.data.message || "Ride completed!");
        setSuccessMessage(response.data.message); // ← NOW this will render the green alert
  
        if (onCompleteBooking) {
          onCompleteBooking(booking._id);
        } else {
          console.warn("onCompleteBooking is not defined");
        }
      } else {
        console.warn("Response did not include a success message.");
      }
    } catch (err) {
      console.error("Completion error:", err.response || err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }
      toast.error(err.response?.data?.error || "Failed to complete booking");
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded shadow-sm mb-4 border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-lg">Name: {booking.userId?.username || "Unknown"}</p>
          <p className="font-medium">Location: {booking.location}</p>
          <p className="font-semibold text-lg">Reason: {booking.reason}</p>
          <p className="text-sm text-gray-600">
            {booking.scheduledAt && `Booked: ${formatDate(booking.scheduledAt)}`}
          </p>
          
        </div>

        <div className="flex flex-col gap-2 items-end">
          {getStatusBadge(typeof booking.status === 'object' ? 'unknown' : booking.status)}

          {(booking.status === 'approved' || booking.status === 'merged') && (
            <Button 
              onClick={handleComplete}
              disabled={isCompleting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-8"
            >
              {isCompleting ? "Processing..." : "Complete"}
            </Button>
          )}
        </div>
      </div>

      
      <div className="mt-2 text-sm">
      
      {booking.guestName && <p><span className="font-medium">Guest:</span> {booking.guestName}</p>}
      {booking.guestPhone && <p><span className="font-medium">Phone:</span> {booking.guestPhone}</p>}
  
  
          
        {/* Check if driver information is an object or string and handle accordingly */}
        {booking.driverName && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p><span className="font-medium">Driver:</span> {
              typeof booking.driverName === 'object' 
                ? booking.driverName.name || 'Unknown'  
                : booking.driverName
            }</p>
            {booking.driverNumber && <p><span className="font-medium">Contact:</span> {
              typeof booking.driverNumber === 'object'
                ? booking.driverNumber.number || 'Unknown'
                : booking.driverNumber
            }</p>}
            {booking.vehicleName && <p><span className="font-medium">Vehicle:</span> {
              typeof booking.vehicleName === 'object'
                ? booking.vehicleName || 'Unknown'
                : booking.vehicleName
            }</p>}
          </div>
        )}
      </div>
      {/* Error and success messages go here, nicely rendered and not forgotten */}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="mt-2 bg-green-50 border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};


// Main Dashboard Component
const ManagerDashboard = () => {
  const [bookings, setBookings] = useState({ pending: [], approved: [], cancelled: [],merged: [], all: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  
  // const [bookGuestModalOpen, setBookGuestModalOpen] = useState(false);
  const navigate = useNavigate();
  const { apiCall, isLoading } = useAPI();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No token found");
      navigate("/"); 
      return;
    }

    axios
      .get("http://localhost:5000/api/auth/user", {
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
        apiCall("get", "/bookings/pending"),
        apiCall("get", "/bookings/all")
      ]);
      
    
      const approved = allBookings.filter(b => b.status === 'approved');
      const cancelled = allBookings.filter(b => b.status === 'cancelled');
      const completed = allBookings.filter(b => b.status === 'completed');
      const merged = allBookings.filter(
        b => b.status === 'merged' && b.isSharedRide
      );
      
      
      setBookings({ 
        pending: pendingBookings, 
        approved:approved.filter(b => !b.mergedFrom?.length), 
        cancelled,
        completed,
        merged,
        all: allBookings 
      });
      setError("");
    }  catch (error) {
     
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [apiCall, navigate]);

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

  const handleApprove = async (bookingId, driverDetails) => {
    try {
      await apiCall("post", "/bookings/approve", {
        bookingId,
        ...driverDetails
      });
      
     
      setSuccessMessage("Booking has been successfully approved!");
   
      window.alert("Booking has been successfully approved!");
      
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve booking");
    }
  };

  const handleCompleteBooking = async (bookingId) => {
    try {
      // Make API call to update the booking status on the server
      await apiCall("post", "/bookings/complete", { bookingId });
      
      setSuccessMessage("Booking completed successfully!");
      
      const findBookingById = (id) => {
        return bookings.approved.find(b => b._id === id) ||
               bookings.merged.find(b => b._id === id);
      };
      
      const bookingToComplete = findBookingById(bookingId);
      
      if (bookingToComplete) {
        const updatedApproved = bookings.approved.filter(b => b._id !== bookingId);
        const updatedMerged = bookings.merged.filter(b => b._id !== bookingId);
        const updatedBooking = {...bookingToComplete, status: 'completed'};
        
        setBookings(prev => ({
          ...prev,
          approved: updatedApproved,
          merged: updatedMerged,
          completed: [...prev.completed, updatedBooking]
        }));
      
        // Instead, only remove the success message after some time
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      } else {
        console.log("Could not find booking with ID:", bookingId);
        fetchBookings();
      }
    } catch (err) {
      console.error("Error in handleCompleteBooking:", err);
      setError("Failed to update booking status");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/");
    }
  };

  const filteredAllBookings = bookings.all.filter(
    (b) => !b.mergedInto // this skips the ones that have already been merged into a shared ride
  );

  // const handleCreateBooking = async (bookingData) => {
  //   try {
  //     await apiCall("post", "/bookings/bookGuest", bookingData);
  //     await fetchBookings();
  //     return { success: true };
  //   } catch (err) {
  //     throw new Error(err.response?.data?.error || "Failed to create booking");
  //   }
  // };

  // Filter bookings based on search term
  const filterBookings = (bookingsList) => {
    if (!searchTerm) return bookingsList;
    
    return bookingsList.filter(booking => 
      booking.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.guestName && booking.guestName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.guestPhone && booking.guestPhone.includes(searchTerm)) ||
      (booking.driverName && booking.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.vehicleId && booking.vehicleId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  if (!localStorage.getItem("token")) {
    navigate("/");
    return null;
  }

  const navItems = [
    { name: "Home", path: "/manager", icon: <Home size={20} /> },
    { name: "Bookings", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
    { name: "Merge Rides", path: "/manager", icon: <Merge size={20} /> },
   
  ];
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header/Navbar */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Welcome, {username || "User"} !</h2>
        <Button variant="outline" className="text-red-500 text-lg border-white hover:bg-blue-900 hover:text-white" onClick={handleLogout}>Logout</Button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="shadow-sm border-r hidden md:block bg-white w-64 flex-shrink-0 p-4 transition-all duration-300 overflow-y-auto">
          <div className="flex items-center mb-6 border-b pb-2">
            <Home className="mr-2" size={24} />
            <h2 className="text-xl text-gray-700 font-bold">Dashboard</h2>
          </div>
          <nav className="mt-6">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="flex items-center py-3 px-4 rounded-md hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>


        {/* Mobile menu button */}
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

        {/* Mobile sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:hidden transition duration-200 ease-in-out z-40 w-64 bg-white shadow-md`}
        >
          <div className="p-4">
            <div className="flex items-center mb-6 border-b pb-2">
              <Home className="mr-2" size={24} />
              <h2 className="text-xl text-gray-700 font-bold">Dashboard</h2>
            </div>
            <nav className="mt-6">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      className="flex items-center py-3 px-4 rounded-md hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
                      onClick={() => setSidebarOpen(false)} // close on nav click
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

      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Statistics Cards */}
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{bookings.pending?.length || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Approved Rides</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{bookings.approved?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Completed Rides</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{bookings.completed?.length || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Cancelled Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{bookings.cancelled?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Management */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Bookings Management</CardTitle> 
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
              {/* Responsive, scrollable tab list */}
              <div className="overflow-x-auto">
                <TabsList className="grid grid-cols-5 sm:flex-nowrap gap-2 mb-2 min-w-max">
                  <TabsTrigger value="pending" className="px-4 py-2 text-sm whitespace-nowrap">
                    Pending ({bookings.pending?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="px-4 py-2 text-sm whitespace-nowrap">
                    Approved ({bookings.approved?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="merged" className="px-4 py-2 text-sm whitespace-nowrap">
                    Merged ({bookings.merged?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="px-4 py-2 text-sm whitespace-nowrap">
                    Completed ({bookings.completed?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="px-4 py-2 text-sm whitespace-nowrap">
                    All Bookings ({bookings.all?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </div>


              <div>
                {/* Tab content styles are now consistent and scrollable */}
                <TabsContent value="pending" className="mt-0">
                  {loading ? (
                    <p className="text-center py-4">Loading bookings...</p>
                  ) : filterBookings(bookings.pending).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending bookings available.</p>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      {filterBookings(bookings.pending).map((booking) => (
                        <PendingBookingItem
                          key={booking._id}
                          booking={booking}
                          onApprove={handleApprove}
                          fetchBookings={fetchBookings}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="approved" className="mt-0">
                  {loading ? (
                    <p className="text-center py-4">Loading bookings...</p>
                  ) : filterBookings(bookings.approved).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No approved bookings found.</p>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      {filterBookings(bookings.approved).map((booking) => (
                        <BookingHistoryItem
                          key={booking._id}
                          booking={booking}
                          onCompleteBooking={handleCompleteBooking}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="merged" className="mt-0">
                  {loading ? (
                    <p className="text-center py-4">Loading bookings...</p>
                  ) : filterBookings(bookings.merged).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No merged bookings found.</p>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      {filterBookings(bookings.merged).map((booking) => (
                        <MergedBookingCard
                        key={booking._id}
                        booking={booking}
                        onCompleteBooking={handleCompleteBooking}
                      />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-0">
                  {loading ? (
                    <p className="text-center py-4">Loading bookings...</p>
                  ) : filterBookings(bookings.completed).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No completed bookings found.</p>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      {filterBookings(bookings.completed).map((booking) => (
                        booking.isSharedRide ? (
                          <MergedBookingCard
                            key={booking._id}
                            booking={booking}
                            // No need for onCompleteBooking since it's already completed
                          />
                        ) : (
                          <BookingHistoryItem
                            key={booking._id}
                            booking={booking}
                          />
                        )
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all" className="mt-0">
                  {loading ? (
                    <p className="text-center py-4">Loading bookings...</p>
                  ) : filterBookings(filteredAllBookings).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No bookings found.</p>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      {filterBookings(filteredAllBookings).map((booking) =>
                        booking.isSharedRide ? (
                          <MergedBookingCard
                            key={booking._id}
                            booking={booking}
                            onCompleteBooking={handleCompleteBooking}
                          />
                        ) : (
                          <BookingHistoryItem
                            key={booking._id}
                            booking={booking}
                            onCompleteBooking={handleCompleteBooking}
                          />
                        )
                      )}
                       
                    </div>
                  )}
                  {successMessage && (
                    <Alert className="mt-2 mb-2 bg-green-100 border-green-500 text-green-800">
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>


              </div>
            </Tabs>
          </CardContent>

        </Card>
      </div>
    </div>
  </div>
  );
};

const MergedBookingCard = ({ booking, onCompleteBooking }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  const handleCompleteClick = async () => {
    if (typeof onCompleteBooking === 'function') {
      await onCompleteBooking(booking._id);
    } else {
      console.warn("onCompleteBooking is not a function");
    }
  };

  // Determine the appropriate badge based on status
  const getBadgeContent = () => {
    if (booking.status === "completed") {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-white hover:text-blue-800">
          Completed
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-fuchsia-100 text-fuchsia-800 hover:bg-white hover:text-fuchsia-800">
          Shared
        </Badge>
      );
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-sm mb-4 border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-bold text-purple-700">🚗 Shared Ride</h3>
          <p><strong>Location:</strong> {booking.location || "Unknown"}</p>
          <p><strong>Vehicle:</strong> {booking.vehicleName || "Unknown"}</p>
          <p><strong>Driver Name:</strong> {booking.driverName || "Unknown"}</p>
          <p><strong>Driver Number:</strong> {booking.driverNumber || "Unknown"}</p>
          <p><strong>Booking Time:</strong> {formatDate(booking.scheduledAt)}</p>
        </div>

        <div className="flex flex-col items-end">
          {getBadgeContent()}

          {booking.status === "merged" && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleCompleteClick}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2"
              >
                Complete
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="font-semibold mb-2 text-gray-700">Passengers:</p>
        {booking.passengers?.length > 0 ? (
          <div className="space-y-4">
            {booking.passengers.map((passenger, idx) => (
              <div key={idx} className="bg-gray-50 p-3 border-l-4 border-blue-300 rounded">
                <p><strong>Name:</strong> 
                  {passenger.username 
                    ? passenger.username 
                    : passenger.guestName 
                      ? passenger.guestName 
                      : "Unknown"}
                </p>
                <p><strong>Phone:</strong> 
                  {passenger.number 
                    ? passenger.number 
                    : passenger.guestPhone 
                      ? passenger.guestPhone 
                      : "N/A"}
                </p>
                <p><strong>Location:</strong> {passenger.location || "N/A"}</p>
                <p><strong>Reason:</strong> {passenger.reason || "N/A"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No passenger information available.</p>
        )}
      </div>
    </div>
  );
};



export default ManagerDashboard;
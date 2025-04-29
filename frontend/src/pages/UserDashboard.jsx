import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Bell, Home, LogOut } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";



const UserDashboard = () => {
  const [username, setUsername] = useState("");
  const [number, setNumber] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookings, setBookings] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("vehicles");
  const [notifications, setNotifications] = useState("[]");
  const [selectedDate, setSelectedDate] = useState(null); // date + time
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);


  const navigate = useNavigate();

  const isVehicleAvailableAt = (vehicleId, targetDateTime) => {
    const target = new Date(targetDateTime);
  
    const futureConflicts = bookings.filter(
      booking =>
        booking.vehicleId === vehicleId &&
        new Date(booking.scheduledAt) >= target &&
        ['pending', 'approved'].includes(booking.status)
    );
  
    return futureConflicts.length === 0;
  };
  useEffect(() => {
    const initializeDashboard = async () => {
      const token = localStorage.getItem("token");
  
      if (!token) {
        console.error("No token found");
        navigate("/"); // Redirect to login if no token
        return;
      }
  
      try {
        // Fetch user profile first
        const userResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = userResponse.data;
        setUsername(userData.username);
        setNumber(userData.number);
  
        // Parallel fetch Vehicles, Bookings, Notifications
        await Promise.all([
          fetchVehicles(token),
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

  const fetchVehicles = async (token) => {
    try {
      setLoadingVehicles(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/vehicles/getVehicles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicles(response.data);
      setLoadingVehicles(false);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      setLoadingVehicles(false);
    }
  };

  const fetchBookings = async (token, userNumber) => {
    try {
      setLoadingBookings(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const processedBookings = response.data.map(booking => {
        if (booking.isSharedRide && booking.passengers) {
          const isCurrentUserPassenger = booking.passengers.some(
            passenger => passenger.number === userNumber
          );
          
          return {
            ...booking,
            isCurrentUserPassenger,
            isVisibleToCurrentUser: isCurrentUserPassenger || true,
          };
        }
        return { ...booking, isVisibleToCurrentUser: true };
      });
  
      setBookings(processedBookings);
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

  const handleOpenModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedVehicle(null);
    setLocation("");
    setReason("");
    setShowModal(false);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;
  
    try {
      const token = localStorage.getItem("token");
  
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/bookings/create`,
        {
          location,
          vehicleId: selectedVehicle._id,
          reason,
          scheduledAt: selectedDate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      alert("✅ Ride booked successfully!");
      setLocation("");
      setReason("");
      setSelectedVehicle(null);
      setShowModal(false);
      fetchBookings();
      fetchVehicles(); // Refresh vehicles to update status
  
    } catch (err) {
      // console.error("Booking error:", err);
  
      if (err.response && err.response.status === 409) {
        // Custom conflict error from backend
        alert(`❌ ${err.response.data.message || "Vehicle already booked for this time."}`);
      } else if (err.response && err.response.data && err.response.data.error) {
        alert(`⚠️ ${err.response.data.error}`);
      } else {
        alert("❌ Failed to book ride. Please try again.");
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
      fetchVehicles(); // Refresh vehicles to update status
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
        fetchVehicles();
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

  // const displayBookings = bookings.filter(booking => 
  //   // Only show bookings that haven't been merged into another booking
  //   !booking.mergedInto
  // );


  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="mr-4 text-2xl md:hidden"
          >
            ☰
          </button>
          <h2 className="text-2xl font-semibold">Welcome, {username || "User"}!</h2>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-transparent hover:bg-white/10 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-all"
        >
          <span>Logout</span>
          <LogOut className="ml-2 h-5 w-5" />
        </button>      
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - always visible on md screens and larger, toggle on smaller screens */}
        <div
          className={`bg-blue-950 text-white w-64 flex-shrink-0 p-4 transition-all duration-300 overflow-y-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } md:relative absolute z-10 h-full`}>
            
            <div className="flex items-center mb-6 border-b pb-2">
              <Home className="mr-2" size={24} />
              <h2 className="text-xl text-white font-bold">Dashboard</h2>
            </div>
            <nav>
              <ul>
                <li className="mb-2">
                  <button
                    onClick={() => {
                      setActiveTab("vehicles");
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-white hover:bg-blue-500 text-left py-2 px-4 rounded ${
                      activeTab === "vehicles" ? "text-white bg-blue-700" : "hover:text-white"
                    }`}
                  >
                    Available Vehicles
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => {
                      setActiveTab("bookings");
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-white text-left hover:bg-blue-500 py-2 px-4 rounded ${
                      activeTab === "bookings" ? "text-white bg-blue-700" : "hover:text-white"
                    }`}
                  >
                    My Bookings
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => {
                      setActiveTab("profile");
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-white text-left hover:bg-blue-500 py-2 px-4 rounded ${
                      activeTab === "profile" ? "text-white bg-blue-700" : "hover:text-white"
                    }`}
                  >
                    Profile
                  </button>
                </li>
                <li className="mb-2">
                  <button
                    onClick={() => {
                      setActiveTab("notifications");
                      setSidebarOpen(false);
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, read: true }))
                      );
                    }}
                    className={`w-full text-white text-left hover:bg-blue-500 py-2 px-4 rounded flex items-center justify-between ${
                      activeTab === "notifications"
                        ? "text-white font-semibold bg-blue-700"
                        : "hover:text-white"
                    }`}
                  >
                    <span>Notifications</span>
                    <span className="relative ml-2">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-[1px] rounded-full shadow-md transition-transform transform-gpu scale-100 group-hover:scale-105">
                          {unreadCount}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Render different content based on active tab */}

            {activeTab === "vehicles" && (
              <div>
                <h2 className="text-3xl font-semibold mb-4">Available Vehicles</h2>
                {loadingVehicles ? (
                  <p>Loading vehicles...</p>
                ) : (
                  <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map((vehicle) => (
                      <div
                        key={vehicle._id}
                        className="bg-white border border-blue-300 rounded-lg p-4 shadow-md"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold">
                            {vehicle.name}
                          </h3>
                          <div className="w-16 h-16 rounded-md overflow-hidden ml-2 flex-shrink-0">
                            {vehicle.imagePath ? (
                              <img 
                                src={`${import.meta.env.VITE_API_BASE_URL}${vehicle.imagePath}`}
                                alt="Vehicle" 
                                className="w-full h-full object-cover transform rotate-0 hover:scale-110 transition-transform duration-300"
                                style={{
                                  filter: "drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.3))"
                                }}
                              />
                            ) : (
                              <img 
                                src="/api/placeholder/160/120" 
                                alt="Vehicle" 
                                className="w-full h-full object-cover transform rotate-0 hover:scale-110 transition-transform duration-300"
                                style={{
                                  filter: "drop-shadow(2px 3px 2px rgba(0, 0, 0, 0.3))"
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600">Vehicle No. - {vehicle.number}</p>
                        <p className="text-gray-600">Driver Name - {vehicle.driverName}</p>
                        <p className="text-gray-600">Driver Number - {vehicle.driverNumber}</p>
                        <p
                          className={`text-sm font-semibold mt-2 ${
                            isVehicleAvailableAt(vehicle._id, new Date())
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Status: {isVehicleAvailableAt(vehicle._id, new Date()) ? "available" : "pending"}
                        </p>

                        {isVehicleAvailableAt(vehicle._id, new Date()) && (
                          <button
                            onClick={() => handleOpenModal(vehicle)}
                            className="mt-4 bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded"
                          >
                            Book
                          </button>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div>
                <h2 className="text-3xl font-semibold mb-4">My Bookings</h2>
                {loadingBookings ? (
                  <p>Loading bookings...</p>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    {bookings.length === 0 ? (
                      <p className="p-4 text-center">No bookings found</p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vehicle
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Driver Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Driver Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reason
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bookings.map((booking) => {
                            // Don't render original bookings that have been merged into others
                            if (booking.mergedInto) {
                              return null;
                            }
                            
                            // Determine if current user is the booking owner or a passenger
                            const isBookingOwner = booking.userId?._id === username;
                            const currentUserAsPassenger = booking.passengers?.find(p => p.number === number);
                            const isPassenger = !isBookingOwner && currentUserAsPassenger;
                            
                            return (
                              <tr key={booking._id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {booking.vehicleName || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {booking.driverName || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {booking.driverNumber || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {/* Show passenger-specific location if they're not the booking owner */}
                                  {isPassenger ? currentUserAsPassenger.location : booking.location || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {/* Show passenger-specific reason if they're not the booking owner */}
                                  {isPassenger ? currentUserAsPassenger.reason : booking.reason || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {new Date(booking.scheduledAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {booking.isSharedRide ? (
                                    <div>
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Shared Ride
                                      </span>
                                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        booking.status === "completed"
                                          ? "bg-green-100 text-green-800"
                                          : booking.status === "cancelled"
                                          ? "bg-red-100 text-red-800"
                                          : booking.status === "pending" 
                                          ? "bg-yellow-100 text-yellow-800"
                                          : booking.status === "approved"
                                          ? "bg-blue-100 text-blue-800"
                                          : booking.status === "merged"
                                          ? "bg-fuchsia-100 text-fuchsia-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}>
                                        {booking.status}
                                      </span>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Shared with {(booking.passengers?.length || 0) - 1} other passenger(s)
                                        {isPassenger && (
                                          <div className="italic mt-1">
                                            (You are a passenger in this shared ride)
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Only show cancel button for pending or active merged rides */}
                                      {(booking.status === "pending" || booking.status === "merged" || booking.status === "approved") && (
                                        <button 
                                          onClick={() => handleCancelBooking(booking._id)}
                                          className="mt-2 bg-red-200 text-red-800 border-red-900 px-2 font-semibold rounded-md hover:bg-red-300"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        booking.status === "completed"
                                          ? "bg-green-100 text-green-800"
                                          : booking.status === "cancelled"
                                          ? "bg-red-100 text-red-800"
                                          : booking.status === "pending" 
                                          ? "bg-yellow-100 text-yellow-800"
                                          : booking.status === "approved"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}>
                                        {booking.status}
                                      </span>
                                      
                                      {booking.status === "approved" && !booking.isSharedRide && (
                                        <button 
                                          onClick={() => handleCompleteBooking(booking._id)}
                                          className="ml-2 bg-green-200 text-green-800 border-green-900 px-2 font-semibold rounded-md hover:bg-green-300"
                                        >
                                          Complete
                                        </button>
                                      )}
                                      
                                      {booking.status === "pending" && (
                                        <button 
                                          onClick={() => handleCancelBooking(booking._id)}
                                          className="ml-2 bg-red-200 text-red-800 border-red-900 px-2 font-semibold rounded-md hover:bg-red-300"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div>
                <h2 className="text-3xl font-semibold mb-4">Profile</h2>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Username
                    </label>
                    <p className="py-2 px-3 bg-gray-100 rounded">{username}</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Number
                    </label>
                    <p className="py-2 px-3 bg-gray-100 rounded">{number}</p>
                  </div>
                  {/* Add more profile information here */}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <div className="p-4 flex justify-between items-center">
                  <h2 className="text-3xl font-semibold mb-4">Notifications</h2>
                  <Button onClick={subscribeUserToPush} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Enable Notifications 🔔
                  </Button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-gray-500">You have no notifications.</p>
                ) : (
                  <ul className="space-y-3">
                    {notifications.map((note) => (
                      <li
                        key={note._id}
                        className={`border rounded-lg p-4 shadow-sm ${
                          note.read ? "bg-gray-100" : "bg-white"
                        }`}
                      >
                        <p className="text-gray-800">{note.message}</p>
                        {/* <p className="text-sm text-gray-500 mt-1">
                          {new Date(bookings.scheduledAt).toLocaleString()}
                        </p> */}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

          </div>
      </div>
      
      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h3 className="text-xl font-semibold mb-4">Book Vehicle</h3>
            <form onSubmit={handleBookingSubmit}>
              <div className="mb-4">
                <label className="block mb-1 text-sm text-gray-700">Select Date & Time *</label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    date.setSeconds(0);
                    date.setMilliseconds(0);
                    setSelectedDate(date);
                  }}
                  showTimeSelect
                  dateFormat="Pp" // fancy format like 4/9/2025, 3:30 PM
                  className="w-full p-2 border rounded"
                  minDate={new Date()}
                  placeholderText="Pick a date and time"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Enter Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                required
              />
              <input
              type="text"
              placeholder="Reason for booking"
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded w-full"
              >
                Book Ride
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="mt-2 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded w-full"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default UserDashboard;
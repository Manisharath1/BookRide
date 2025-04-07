import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Bell, Home } from "lucide-react";

const UserDashboard = () => {
  const [username, setUsername] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("vehicles");
  const [notifications, setNotifications] = useState("[]");

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No token found");
      navigate("/"); // Redirect to login if no token
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

    fetchVehicles();
    fetchBookings();
  }, [navigate]);

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
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/bookings/user",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // console.log("Bookings data:", response.data);
      setBookings(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/"); // Redirect to login
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
        "http://localhost:5000/api/bookings/create",
        { location, vehicleId: selectedVehicle._id, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Ride booked successfully!");
      setLocation("");
      setReason("");
      setSelectedVehicle(null);
      setShowModal(false);
      fetchBookings();
      fetchVehicles(); // Refresh vehicles to update status
    } catch (err) {
      console.error(err);
      alert("Failed to book ride");
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      try {
        const response = await axios.get("http://localhost:5000/api/bookings/notifications", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(response.data || []);
        } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
  
    fetchNotifications();
  }, []);

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
  
      await fetch("http://localhost:5000/subscribe", {
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
        `http://localhost:5000/api/bookings/complete`,
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="mr-4 text-2xl md:hidden"
          >
            ☰
          </button>
          <h2 className="text-2xl font-semibold">Welcome, {username || "User"}!</h2>
        </div>
        <Button className="text-red-500 text-lg bg-white border-white hover:bg-blue-900 hover:text-white" onClick={handleLogout}>Logout</Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - always visible on md screens and larger, toggle on smaller screens */}
        <div
          className={`bg-white w-64 flex-shrink-0 p-4 transition-all duration-300 overflow-y-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } md:relative absolute z-10 h-full`}>

          
            <div className="flex items-center mb-6 border-b pb-2">
              <Home className="mr-2" size={24} />
              <h2 className="text-xl text-gray-700 font-bold">Dashboard</h2>
            </div>
            <nav>
              <ul>
                <li className="mb-2">
                  <button
                    onClick={() => {
                      setActiveTab("vehicles");
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-gray-700 hover:bg-blue-100 text-left py-2 px-4 rounded ${
                      activeTab === "vehicles" ? "text-gray-700" : "hover:text-blue-600"
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
                    className={`w-full text-gray-700 text-left hover:bg-blue-100 py-2 px-4 rounded ${
                      activeTab === "bookings" ? "text-gray-700" : "hover:text-blue-600"
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
                    className={`w-full text-gray-700 text-left hover:bg-blue-100 py-2 px-4 rounded ${
                      activeTab === "profile" ? "text-gray-700" : "hover:text-blue-600"
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
                    className={`w-full text-gray-700 text-left hover:bg-blue-100 py-2 px-4 rounded flex items-center justify-between ${
                      activeTab === "notifications"
                        ? "text-gray-700 font-semibold bg-blue-50"
                        : "hover:text-blue-600"
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
              {loading ? (
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
                              src={`http://localhost:5000${vehicle.imagePath}`}
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
                          vehicle.status === "available"
                            ? "text-green-600"
                            : vehicle.status === "assigned"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        Status: {vehicle.status}
                      </p>
                      {vehicle.status === "available" && (
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
              {loading ? (
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
                        {bookings.map((booking) => (
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
                              {booking.location || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {booking.reason || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  booking.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : booking.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : booking.status === "pending" 
                                    ? "bg-yellow-100 text-yellow-800"
                                    : booking.status === "approved"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {booking.status}
                              </span>
                              {booking.status === "approved" &&(
                                <button 
                                  onClick={() => handleCompleteBooking(booking._id)}
                                  className="ml-8 bg-green-200 text-green-800 border-green-900 px-2 font-semibold rounded-md hover:bg-green-300"
                                >
                                  Complete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
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
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
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
              placeholder="Reason for booking (optional)"
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />
              {/* Google Maps Embed */}
              <iframe
                title="Google Map"
                src={`https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(location || 'Bhubaneswar, Odisha')}`}
                className="w-full h-40 mb-4"
                allowFullScreen
              ></iframe>
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
    </div>
  );
};

export default UserDashboard;
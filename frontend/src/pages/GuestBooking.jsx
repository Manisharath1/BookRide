import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  Car, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  Home, 
  Calendar,
  FileDigit,
  User2,
  Merge,
  LogOut, 
 } from "lucide-react";

 const useManagerAccess = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkManagerAccess = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/"); // Redirect to login if no token
          return;
        }
        
        // Verify user role
        const response = await axios.get("http://localhost:5000/api/auth/user", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // If user is not a manager, redirect
        if (response.data.role !== 'manager') {
          navigate("/guest-booking"); // Or appropriate non-manager page
        }
      } catch (error) {
        console.error("Access verification failed:", error);
        localStorage.removeItem("token");
        navigate("/"); // Redirect to login on error
      }
    };
    checkManagerAccess();
  }, [navigate]);
};

const BookForGuestPage = () => {
  useManagerAccess();

  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState({
    guestName: "",
    guestPhone: "",
    location: "",
    notes: "",
    vehicleId: "",
    driverName: " ",
    driverNumber: " "
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  
  useEffect(() => {
    fetchVehicles();
  }, []);
  
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/vehicles/getVehicles",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // console.log("Fetched Vehicles Raw Data:", response.data);
      // Log specific details of each vehicle
      // response.data.forEach(vehicle => {
      //   console.log(`Vehicle ID: ${vehicle.id}, Name: ${vehicle.name}, Status: ${vehicle.status}`);
      // });
      setVehicles(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      setError("Failed to load vehicles. Please try again.");
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value
    });
    if (error) setError("");
  };

  const handleVehicleSelect = (vehicleId) => {
    // console.log("Selected Vehicle ID:", value);
    const selectedVehicle = vehicles.find(vehicle => vehicle._id === vehicleId);
    setBookingData((prev) => ({
      ...prev,
      vehicleId: vehicleId,
      driverName: selectedVehicle?.driverName || prev.driverName,
      driverNumber: selectedVehicle?.driverNumber || prev.driverNumber
    }));
    if (error) setError("");
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!bookingData.guestName || !bookingData.guestPhone || !bookingData.location || !bookingData.vehicleId || !bookingData.driverName || !bookingData.driverNumber) {
      setError("Please fill in all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/bookings/bookGuest",
        bookingData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      alert("Ride booked successfully!");
      setError("");

            
      // Redirect to bookings page or show success message
      navigate("/guest-booking", { 
        state: { 
          success: response.data.message || "Booking created successfully" 
        } 
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
    }
  };
  
  const handleCancel = () => {
    navigate(-1); 
  };

  // Navigation items
  const navItems = [
    { name: "Home", path: "/manager", icon: <Home size={20} /> },
    { name: "Bookings", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
    { name: "Merge Rides", path: "/merge-ride", icon: <Merge size={20} /> },
    

   ];

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };
  
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header/Navbar - Full width at the top */}
      <div className="relative w-full z-10">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-20">
          <div className="mx-auto flex justify-between items-center h-full px-4">
            <div className="flex justify-between items-center">
              <div className="bg-blue-500 rounded-full p-1 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-white font-medium">Dashboard</h2>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-transparent hover:bg-white/10 text-white font-medium py-2 px-4 rounded-lg flex items-center transition-all"
            >
              <span>Logout</span>
              <LogOut className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content area with sidebar and content */}
      <div className="flex flex-1">
        {/* Sidebar - Now positioned below navbar */}
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
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Main content */}
          <div className="container mx-auto p-4 lg:p-6 space-y-6">
            {/* Top Navigation Bar */}
            <Card>
              <CardHeader className="bg-gray-50 border-b pb-4">
                <CardTitle className="flex items-center text-2xl font-bold text-blue-700">
                  <Car className="mr-2" size={24} />
                  Book Vehicle for Guest
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="guestName" className="flex items-center text-sm font-medium text-gray-700">
                        <User className="mr-2" size={16} />
                        Guest Name *
                      </label>
                      <Input
                        id="guestName"
                        name="guestName"
                        value={bookingData.guestName}
                        onChange={handleChange}
                        required
                        className="w-full"
                        placeholder="Enter guest name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="guestPhone" className="flex items-center text-sm font-medium text-gray-700">
                        <Phone className="mr-2" size={16} />
                        Guest Phone *
                      </label>
                      <Input
                        id="guestPhone"
                        name="guestPhone"
                        value={bookingData.guestPhone}
                        onChange={handleChange}
                        required
                        className="w-full"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="location" className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="mr-2" size={16} />
                      Pickup Location *
                    </label>
                    <Input
                      id="location"
                      name="location"
                      value={bookingData.location}
                      onChange={handleChange}
                      required
                      className="w-full"
                      placeholder="Enter pickup location"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="vehicle" className="flex items-center text-sm font-medium text-gray-700">
                      <Car className="mr-2" size={16} />
                      Select Vehicle *
                    </label>
                    {loading ? (
                      <div className="flex items-center justify-center p-4 border rounded bg-gray-50">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">Loading vehicles...</span>
                      </div>
                    ) : (
                      <Select 
                        onValueChange={handleVehicleSelect} 
                        value={bookingData.vehicleId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.length > 0 ? (
                            vehicles.map((vehicle) => (
                              <SelectItem 
                                key={vehicle._id} 
                                value={vehicle._id}
                                disabled={vehicle.status !== 'available'}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={vehicle.status === 'available' ? 'text-green-600 font-medium' : 'text-red-500'}>
                                    {vehicle.name}
                                  </span>
                                  <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100">
                                    {vehicle.status === 'available' ? 'Available' : `${vehicle.status}`}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-4 text-sm text-gray-500 text-center">
                              No vehicles available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="driverName" className="flex items-center text-sm font-medium text-gray-700">
                        <User2 className="mr-2" size={16} />
                        Driver Name *
                      </label>
                      <Input
                        id="driverName"
                        name="driverName"
                        value={bookingData.driverName}
                        onChange={handleChange}
                        required
                        className="w-full"
                        placeholder="Driver's Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="driverNumber" className="flex items-center text-sm font-medium text-gray-700">
                        <FileDigit className="mr-2" size={16} />
                        Driver Number *
                      </label>
                      <Input
                        id="driverNumber"
                        name="driverNumber"
                        value={bookingData.driverNumber}
                        onChange={handleChange}
                        required
                        className="w-full"
                        placeholder="Driver's Number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="notes" className="flex items-center text-sm font-medium text-gray-700">
                      <FileText className="mr-2" size={16} />
                      Special Notes
                    </label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={bookingData.notes}
                      onChange={handleChange}
                      className="w-full min-h-20"
                      placeholder="Add any special requirements or notes here"
                    />
                  </div>
                  
                  {error && (
                    <Alert variant="destructive" className="mt-4 border-red-500 bg-red-50">
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || vehicles.length === 0 || loading}
                      className="px-6 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : "Book"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Mobile sidebar toggle button */}
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
      
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default BookForGuestPage;
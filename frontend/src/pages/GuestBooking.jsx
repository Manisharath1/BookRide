import { useState, useEffect } from 'react';
import { useNavigate, Link} from 'react-router-dom';
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
// import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
 Loader2, 
  Car, 
  MapPin, 
  Phone, 
  User, 
  // FileText, 
  Home, 
  Calendar,
  FileDigit,
  User2,
  LogOut,
  Clock,
  Users,
  Target,
  LayoutDashboard,
  ArrowDown,
  ArrowUp,
  User2Icon
 } from "lucide-react";
import { toast } from 'react-toastify';

// eslint-disable-next-line react/prop-types
const TimePicker = ({ value, onChange, placeholder = "Select time" }) => {
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        times.push({ value: timeString, display: displayTime });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4 text-gray-500" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-60 overflow-y-auto">
        {timeOptions.map((time) => (
          <SelectItem key={time.value} value={time.value}>
            {time.display}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Custom Date Picker Component
// eslint-disable-next-line react/prop-types
const DateInput = ({ value, onChange, placeholder = "Select date" }) => {
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={today}
      className="w-full"
      placeholder={placeholder}
    />
  );
};

const useManagerAccess = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkManagerAccess = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.role !== 'manager') {
          navigate("/guest-booking");
        }
      } catch (error) {
        console.error("Access verification failed:", error);
        localStorage.removeItem("token");
        navigate("/");
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
    scheduledDate: "",
    scheduledTime: "",
    duration: "",
    members: "",
    notes: "",
    reason: "",
    vehicleId: "",
    driverName: "",
    driverNumber: "",
    serviceType: "pickup"
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/vehicles/drivers`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setDrivers(res.data);
    }).catch(err => {
      console.error("Error fetching drivers", err);
    });
  }, []);
  
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/vehicles/getVehicles`,
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
  
  const handleChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value
    });
    if (error) setError("");
  };

  const handleVehicleSelect = (vehicleId) => {
    const selectedVehicle = vehicles.find(vehicle => vehicle._id === vehicleId);
    if (!selectedVehicle) {
      setBookingData(prev => ({ ...prev, vehicleId, driverName: "", driverNumber: "" }));
      return;
    }
    setBookingData((prev) => ({
      ...prev,
      vehicleId: vehicleId,
      driverName: selectedVehicle.driverName || "",
      driverNumber: selectedVehicle.driverNumber || ""
    }));
    if (error) setError("");
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields as per backend
    const requiredFields = [
      'guestName', 'guestPhone', 'location', 'scheduledDate', 
      'scheduledTime', 'duration', 'members', 'reason', 'vehicleId', 
      'driverName', 'driverNumber', 'serviceType'
    ];
    
    const missingFields = requiredFields.filter(field => !bookingData[field]);
    
    if (missingFields.length > 0) {
      setError("All fields are required. Please fill in all required fields.");
      return;
    }
    
    // Validate phone number (same regex as backend)
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(bookingData.guestPhone)) {
      setError("Please provide a valid phone number");
      return;
    }
    
    // Validate driver phone number
    if (!phoneRegex.test(bookingData.driverNumber)) {
      setError("Please provide a valid driver phone number");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      
      // Combine date and time for scheduledAt
      const scheduledAt = new Date(`${bookingData.scheduledDate}T${bookingData.scheduledTime}`);
      
      const submissionData = {
        location: bookingData.location,
        guestName: bookingData.guestName,
        guestPhone: bookingData.guestPhone,
        vehicleId: bookingData.vehicleId,
        driverName: bookingData.driverName,
        driverNumber: bookingData.driverNumber,
        notes: bookingData.notes,
        reason: bookingData.reason,
        scheduledAt: scheduledAt.toISOString(),
        duration: parseFloat(bookingData.duration),
        members: parseInt(bookingData.members),
        serviceType: bookingData.serviceType
      };
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/bookings/bookGuest`,
        submissionData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      console.log(response)
      
      toast.success("Guest booking created successfully!");
      navigate("/manager");
    } catch (err) {
      console.error("Booking error:", err);
      setError(err.response?.data?.error || "Failed to create booking");
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
  
  // const handleCancel = () => {
  //   navigate(-1); 
  // };

  const navItems = [
    { name: "Home", path: "/home", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
    { name: "Guest Booking", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
    { name: "Profile", path: "/profile", icon: <User2Icon size={20} /> }
  ];

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const getLocationLabel = () => {
    return bookingData.serviceType === 'pickup' ? 'Pickup Location' : 'Drop-off Location';
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
              <h2 className="text-white text-lg">Dashboard</h2>
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
                  Create Guest Booking
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6 lg:p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Guest Information */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Guest Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="guestName" className="flex items-center text-sm font-medium text-gray-700">
                          <User className="mr-2 text-blue-500" size={16} />
                          Guest Name *
                        </label>
                        <Input
                          id="guestName"
                          name="guestName"
                          value={bookingData.guestName}
                          onChange={handleChange}
                          required
                          className="transition-all focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter guest's full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="guestPhone" className="flex items-center text-sm font-medium text-gray-700">
                          <Phone className="mr-2 text-green-500" size={16} />
                          Guest Phone *
                        </label>
                        <Input
                          id="guestPhone"
                          name="guestPhone"
                          value={bookingData.guestPhone}
                          onChange={handleChange}
                          required
                          className="transition-all focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter phone number (+1234567890)"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <Car className="mr-2 text-blue-500" size={16} />
                          Service Type *
                        </label>
                        <Select
                          value={bookingData.serviceType}
                          onValueChange={(value) => setBookingData(prev => ({ ...prev, serviceType: value }))}
                        >
                          <SelectTrigger className="w-full transition-all focus:ring-2 focus:ring-blue-500">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">
                              <div className="flex items-center">
                                <ArrowUp className="mr-2 h-4 w-4 text-green-500" />
                                <span>Pickup Service</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="dropoff">
                              <div className="flex items-center">
                                <ArrowDown className="mr-2 h-4 w-4 text-blue-500" />
                                <span>Drop-off Service</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Trip Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                      <div className="space-y-2">
                        <label htmlFor="location" className="flex items-center text-sm font-medium text-gray-700">
                          <MapPin className="mr-2 text-red-500" size={16} />
                          {getLocationLabel()} *
                        </label>
                        <Input
                          id="location"
                          name="location"
                          value={bookingData.location}
                          onChange={handleChange}
                          required
                          className="transition-all focus:ring-2 focus:ring-blue-500"
                          placeholder={`Enter detailed ${bookingData.serviceType === 'pickup' ? 'pickup' : 'drop-off'} address`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="reason" className="flex items-center text-sm font-medium text-gray-700">
                          <Target className="mr-2 text-pink-500" size={16} />
                          Reason for Trip *
                        </label>
                        <Input
                          id="reason"
                          name="reason"
                          value={bookingData.reason}
                          onChange={handleChange}
                          required
                          className="transition-all focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter reason for the trip"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="members" className="flex items-center text-sm font-medium text-gray-700">
                          <Users className="mr-2 text-teal-500" size={16} />
                          Number of Members *
                        </label>
                        <Input
                          id="members"
                          name="members"
                          type="number"
                          min="1"
                          max="20"
                          value={bookingData.members}
                          onChange={handleChange}
                          required
                          className="transition-all focus:ring-2 focus:ring-blue-500"
                          placeholder="No. of people"
                        />
                      </div>

                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <Calendar className="mr-2 text-purple-500" size={16} />
                          Date *
                        </label>
                        <DateInput
                          value={bookingData.scheduledDate}
                          onChange={(date) => setBookingData(prev => ({ ...prev, scheduledDate: date }))}
                          placeholder="Select date"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <Clock className="mr-2 text-orange-500" size={16} />
                          Time *
                        </label>
                        <TimePicker
                          value={bookingData.scheduledTime}
                          onChange={(time) => setBookingData(prev => ({ ...prev, scheduledTime: time }))}
                          placeholder="Select time"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <Clock className="mr-2 text-indigo-500" size={16} />
                          Duration (Hours) *
                        </label>
                        <Select
                          value={bookingData.duration || ""}
                          onValueChange={(value) =>
                            setBookingData((prev) => ({ ...prev, duration: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(12)].map((_, i) => {
                              const duration = (0.5 * (i + 1)).toFixed(1);
                              return (
                                <SelectItem key={duration} value={duration}>
                                  {duration} hour{duration !== "1.0" ? "s" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                  </div>

                  {/* Vehicle & Driver */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <Car className="mr-2 text-blue-500" size={16} />
                        Select Vehicle *
                      </label>
                      {loading ? (
                        <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                          <Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-500" />
                          <span className="text-gray-600">Loading available vehicles...</span>
                        </div>
                      ) : (
                        <Select 
                          onValueChange={handleVehicleSelect} 
                          value={bookingData.vehicleId}
                        >
                          <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
                            <SelectValue placeholder="Choose an available vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.length > 0 ? (
                              vehicles.map((vehicle) => (
                                <SelectItem 
                                  key={vehicle._id} 
                                  value={vehicle._id}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className= 'text-green-700 font-medium'>
                                      {vehicle.name}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-6 text-center text-gray-500">
                                No vehicles available at the moment
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <User2 className="mr-2 text-cyan-500" size={16} />
                        Select Driver *
                      </label>
                      <Select
                        onValueChange={(selectedIndex) => {
                          const selectedDriver = drivers[selectedIndex];
                          if (selectedDriver) {
                            setBookingData(prev => ({
                              ...prev,
                              driverName: selectedDriver.name,
                              driverNumber: selectedDriver.number,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="transition-all focus:ring-2 focus:ring-blue-500">
                          <SelectValue placeholder="Choose a driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.length > 0 ? (
                            drivers.map((driver, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-gray-800">{driver.name}</span>
                                  <span className="text-xs text-gray-500">{driver.number}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-gray-500">
                              No drivers available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                      
                    <div className="space-y-2">
                      <label htmlFor="driverNumber" className="flex items-center text-sm font-medium text-gray-700">
                        <FileDigit className="mr-2 text-yellow-500" size={16} />
                        Driver Phone *
                      </label>
                      <Input
                        id="driverNumber"
                        name="driverNumber"
                        value={bookingData.driverNumber}
                        onChange={handleChange}
                        required
                        className="transition-all focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter driver's phone number"
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-800 font-medium">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || vehicles.length === 0 || loading}
                      className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Booking...
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-2 h-4 w-4" />
                          Create Booking
                        </>
                      )}
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
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="mt-6">
              <h2 className="text-2xl text-white text-center mb-10 font-bold">Dashboard</h2>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
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
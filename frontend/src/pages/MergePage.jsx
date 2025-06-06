import { Calendar, Car, Home, LayoutDashboard, LogOut, Users, ChevronRight, Loader, ArrowLeft, RefreshCw, Phone, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import FullCalendarSelector from "../components/FullCalendarSelector";

const MergePage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [primaryBooking, setPrimaryBooking] = useState(null);
  const [bookingsToMerge, setBookingsToMerge] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [existingEvents, setExistingEvents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [step, setStep] = useState(1);
  const [mergedBooking, setMergedBooking] = useState(null);
  const [mergeInProgress, setMergeInProgress] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        // Fetch primary booking
        if (bookingId) {
          const bookingRes = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL}/api/bookings/${bookingId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setPrimaryBooking(bookingRes.data);
          setSelectedBookings([bookingRes.data._id]);
        }
        
        // Fetch all pending bookings for potential merging
        const bookingsRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/bookings/all`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Filter out the primary booking from potential merge candidates
        const filteredBookings = bookingsRes.data.filter(booking => 
          ['pending', 'approved'].includes(booking.status) &&
          booking._id !== bookingId
        );

        setBookingsToMerge(filteredBookings);
        
        // Fetch all available vehicles
        const vehiclesRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/vehicles/getVehicles`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setVehicles(vehiclesRes.data);
        
        // Fetch all available drivers
        const driversRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/vehicles/drivers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDrivers(driversRes.data);
        
        // Fetch existing bookings for calendar
        const eventsRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/bookings/all`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setExistingEvents(eventsRes.data);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to load required data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [bookingId]);

  useEffect(() => {
    if (selectedVehicle) {
      // Create a driver object from the vehicle's driver information
      const associatedDriver = {
        _id: selectedVehicle._id, // Use the same ID for simplicity
        name: selectedVehicle.driverName,
        number: selectedVehicle.driverNumber
      };
      setSelectedDriver(associatedDriver);
    } else {
      setSelectedDriver(null);
    }
  }, [selectedVehicle]);

  const navItems = [
    { name: "Home", path: "/home", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
    { name: "Bookings", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
    }
  };

  const handleBookingSelection = (bookingId) => {
    setSelectedBookings(prev => {
      if (prev.includes(bookingId)) {
        return prev.filter(id => id !== bookingId);
      } else {
        return [...prev, bookingId];
      }
    });
  };

  const handleMergeBookings = async () => {
    if (!selectedTime) {
      toast.error("Please select a time for the merged booking");
      return;
    }
    
    if (selectedBookings.length < 2) {
      toast.error("Please select at least two bookings to merge");
      return;
    }
    
    if (!selectedVehicle) {
      toast.error("Please select a vehicle for the merged booking");
      return;
    }
    
    if (!selectedDriver) {
      toast.error("Please select a driver for the merged booking");
      return;
    }
    
    try {
      setMergeInProgress(true);
      const token = localStorage.getItem("token");
      
      const mergeData = {
        bookingIds: selectedBookings,
        primaryBookingId: primaryBooking ? primaryBooking._id : selectedBookings[0],
        newDetails: {
          scheduledAt: selectedTime,
          vehicleId: selectedVehicle._id,
          vehicleName: selectedVehicle.name,
          driverName: selectedDriver.name,
          driverNumber: selectedDriver.number
        }
      };
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/bookings/merge`,
        mergeData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMergedBooking(response.data.mergedBooking);
      toast.success("Bookings successfully merged!");
      setStep(3);
    } catch (err) {
      console.error("Merge failed:", err);
      toast.error(err.response?.data?.error || "Failed to merge bookings");
    } finally {
      setMergeInProgress(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!selectedTime || selectedBookings.length < 2)) {
      toast.warning("Please select a time and at least two bookings");
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const renderStepOne = () => (
    <div className="bg-white shadow rounded-lg p-3 sm:p-4 border border-blue-100 mb-4">
      <h3 className="text-xl font-semibold mb-4">Step 1: Select Time & Bookings</h3>
      
      <div className="mb-6">
        <FullCalendarSelector 
          selectedTime={selectedTime} 
          setSelectedTime={setSelectedTime} 
          existingEvents={existingEvents} 
        />
        
        {selectedTime && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="font-medium">Selected Time: {new Date(selectedTime).toLocaleString()}</p>
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <h4 className="text-lg font-medium mb-2">Select Bookings to Merge</h4>
        {primaryBooking && (
          <div className="mb-4 p-3 bg-blue-100 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-semibold">Primary Booking</h5>
                <p>Location: {primaryBooking.location}</p>
                <p>Scheduled: {new Date(primaryBooking.scheduledAt).toLocaleString()}</p>
                <p>User: {primaryBooking.userId?.username || "N/A"}</p>
                <p>Duration: {primaryBooking.duration || "N/A"}</p>
                <p>Member: {primaryBooking.members || "N/A"}</p>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={true} 
                  disabled 
                  className="w-5 h-5 accent-blue-600" 
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-4 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {bookingsToMerge.map(booking => (
            <div 
              key={booking._id} 
              className={`p-4 rounded-lg shadow-sm border ${
                selectedBookings.includes(booking._id)
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="grid grid-cols-2 gap-x-1 gap-y-2">
                <p className="text-sm"><span className="font-bold text-sm">Location:</span> {booking.location}</p>
                <p className="text-sm"><span className="font-bold text-sm">Scheduled:</span> {new Date(booking.scheduledAt).toLocaleString()}</p>
                <p className="text-sm"><span className="font-bold text-sm">User:</span> {booking.userId?.username || "N/A"}</p>
                <p className="text-sm"><span className="font-bold text-sm">Reason:</span> {booking.reason || "N/A"}</p>
                <p className="text-sm"><span className="font-bold text-sm">Duration:</span> {booking.duration || "N/A"}</p>
                <p className="text-sm"><span className="font-bold text-sm">Member:</span> {booking.members || "N/A"}</p>
                <div className="col-span-2 flex justify-end mt-2">
                  <input 
                    type="checkbox" 
                    checked={selectedBookings.includes(booking._id)} 
                    onChange={() => handleBookingSelection(booking._id)} 
                    className="w-5 h-5 accent-blue-600" 
                  />
                </div>
              </div>
            </div>
          ))}

          {bookingsToMerge.length === 0 && (
            <div className="col-span-full p-4 bg-gray-50 rounded-md text-center">
              <p className="text-gray-500">No bookings available for merging</p>
            </div>
          )}
        </div>

      </div>
      
      <div className="mt-6 flex justify-end">
        <button 
          onClick={nextStep}
          disabled={selectedBookings.length < 2 || !selectedTime}
          className={`px-4 py-2 rounded-md text-white font-medium flex items-center ${
            selectedBookings.length < 2 || !selectedTime 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Next Step <ChevronRight size={18} className="ml-1" />
        </button>
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="bg-white shadow-lg rounded-lg p-5 border-l-4 border-blue-500 mb-6">
      <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
        <span className="bg-blue-500 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">2</span>
        Select Vehicle & Driver
      </h3>
      
      {/* Vehicles Section */}
      <div className="mb-8">
        <h4 className="text-lg font-medium mb-3 text-gray-700 flex items-center">
          <Car size={20} className="text-blue-500 mr-2" />
          Select Vehicle
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          {vehicles.map(vehicle => (
            <div 
              key={vehicle._id}
              onClick={() => setSelectedVehicle(vehicle)}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedVehicle?._id === vehicle._id 
                  ? "bg-sky-50 border-2 border-blue-900 shadow-sm" 
                  : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`font-semibold ${selectedVehicle?._id === vehicle._id ? "text-blue-800" : "text-blue-800"}`}>
                    {vehicle.name}
                  </p>
                  <span>
                    <p className={`font-medium ${selectedVehicle?._id === vehicle._id ? "text-blue-600" : "text-gray-900"}`}>
                      Driver Name - {vehicle.driverName}
                    </p>
                    <p className={`font-medium ${selectedVehicle?._id === vehicle._id ? "text-blue-600" : "text-gray-900"}`}>
                      Driver Number - {vehicle.driverNumber}
                    </p>
                  </span>
                </div>
                {selectedVehicle?._id === vehicle._id && (
                  <div className="bg-blue-500 rounded-full p-1 text-white">
                    <Check size={16} />
                  </div>
                )}
                <Car size={20} className={selectedVehicle?._id === vehicle._id ? "text-blue-500" : "text-gray-500"} />
              </div>
            </div>
          ))}
          
          {vehicles.length === 0 && (
            <div className="col-span-full p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
              <Car size={40} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No available vehicles</p>
              <p className="text-sm text-gray-400 mt-1">Please check back later</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Driver Section - Showing the automatically selected driver with option to change */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-medium text-gray-700 flex items-center">
            <Users size={20} className="text-blue-500 mr-2" />
            Driver Information
          </h4>
          {selectedDriver && (
            <button 
              onClick={() => {
                const changeDriverSection = document.getElementById('change-driver-section');
                if (changeDriverSection) {
                  changeDriverSection.classList.toggle('hidden');
                }
              }}
              className="text-sm px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full border border-blue-200 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
              Change Driver
            </button>
          )}
        </div>

        {/* Currently Selected Driver Display */}
        {selectedDriver ? (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 mb-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full mr-3">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <h5 className="font-semibold text-blue-800">{selectedDriver.name}</h5>
                <p className="text-sm text-blue-600 flex items-center mt-1">
                  <Phone size={14} className="mr-1" /> {selectedDriver.number}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {selectedVehicle ? `Assigned to vehicle: ${selectedVehicle.name}` : ''}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center mb-4">
            <p className="text-gray-500">No driver selected yet. Please select a vehicle first.</p>
          </div>
        )}

        {/* Change Driver Section (hidden by default) */}
        <div id="change-driver-section" className="hidden mt-4">
          <h5 className="font-medium text-gray-700 mb-2">Select a Different Driver</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
            {drivers.map((driver, index) => {
              // Create a unique identifier - use _id if available, otherwise use index or name+number combo
              const driverId = driver._id || driver.id || `${driver.name}-${driver.number}` || index;
              const selectedId = selectedDriver?._id || selectedDriver?.id || (selectedDriver ? `${selectedDriver.name}-${selectedDriver.number}` : null);
              const isSelected = selectedDriver && selectedId === driverId;
              
              return (
                <div 
                  key={`driver-${driverId}-${index}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Selecting driver:', driverId, driver.name, 'Full driver object:', driver);
                    
                    // Create a clean copy of the driver object with proper ID
                    setSelectedDriver({
                      _id: driverId,
                      id: driverId, // Backup ID field
                      name: driver.name,
                      number: driver.number
                    });
                    
                    // Hide the change driver section after selection
                    setTimeout(() => {
                      const changeDriverSection = document.getElementById('change-driver-section');
                      if (changeDriverSection) {
                        changeDriverSection.classList.add('hidden');
                      }
                    }, 100);
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? "bg-sky-50 border-2 border-blue-900 shadow-sm" 
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`font-semibold ${isSelected ? "text-blue-800" : "text-gray-800"}`}>
                        {driver.name}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <Phone size={14} className="mr-1" /> {driver.number}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="bg-blue-500 rounded-full p-1 text-white">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {drivers.length === 0 && (
              <div className="col-span-full p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                <p className="text-gray-500">No other drivers available</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3">
        <button 
          onClick={prevStep}
          className="px-5 py-2.5 rounded-lg border border-gray-300 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          <ArrowLeft size={18} className="mr-2" /> Back
        </button>
        
        <button 
          onClick={handleMergeBookings}
          disabled={!selectedVehicle || !selectedDriver || mergeInProgress}
          className={`px-5 py-2.5 rounded-lg text-white font-medium flex items-center justify-center ${
            !selectedVehicle || !selectedDriver || mergeInProgress
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 transition-colors"
          }`}
        >
          {mergeInProgress ? (
            <>
              <Loader size={18} className="animate-spin mr-2" /> Processing...
            </>
          ) : (
            <>
              <RefreshCw size={18} className="mr-2" /> Merge Bookings
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStepThree = () => (
    <div className="bg-white shadow rounded-lg p-3 sm:p-4 border border-blue-100 mb-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 className="text-xl font-semibold">Bookings Successfully Merged!</h3>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-lg mb-2">Merged Booking Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {/* <p><span className="font-medium">Booking ID:</span> {mergedBooking?._id}</p> */}
            <p><span className="font-medium">Status:</span> {mergedBooking?.status}</p>
            <p><span className="font-medium">Scheduled Time:</span> {mergedBooking?.scheduledAt ? new Date(mergedBooking.scheduledAt).toLocaleString() : 'N/A'}</p>
            <p><span className="font-medium">Total Members:</span> {mergedBooking?.members || 'N/A'}</p>
            <p><span className="font-medium">Duration:</span> {mergedBooking?.duration || 'N/A'} hours</p>
          </div>
          <div>
            <p><span className="font-medium">Vehicle:</span> {mergedBooking?.vehicleName}</p>
            <p><span className="font-medium">Driver:</span> {mergedBooking?.driverName}</p>
            <p><span className="font-medium">Driver Contact:</span> {mergedBooking?.driverNumber}</p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="font-semibold text-lg mb-2">Passengers</h4>
        <div className="max-h-64 overflow-y-auto">
          {mergedBooking?.passengers?.map((passenger, index) => (
            <div key={index} className="p-3 mb-2 bg-gray-50 rounded-md">
              <p><span className="font-medium">Name:</span> {passenger.username}</p>
              <p><span className="font-medium">Contact:</span> {passenger.number}</p>
              <p><span className="font-medium">Location:</span> {passenger.location}</p>
              <p><span className="font-medium">Duration:</span> {passenger.duration !== undefined ? `${passenger.duration} hours` : "N/A"}</p>
              <p><span className="font-medium">Members:</span> {passenger.members !== undefined ? passenger.members : "N/A"}</p>
              <p><span className="font-medium">Reason:</span> {passenger.reason}</p>
              <p><span className="font-medium">Original Time:</span> {new Date(passenger.bookingTime).toLocaleString()}</p>
            </div>
          ))}

          {(!mergedBooking?.passengers || mergedBooking.passengers.length === 0) && (
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-gray-500">No passenger information available</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-center mt-6">
        <button 
          onClick={() => navigate("/manager")}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Responsive Header */}
      <div className="sticky top-0 w-full z-30">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
          <svg 
            className="absolute bottom-0 w-full"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
          >
          </svg>
        </div>
        
        <div className="relative flex justify-between items-center p-2 sm:p-4">
          <h2 className="text-2xl text-white text-center font-bold">Merge Booking</h2>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
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

          <div className="mt-auto pt-4 border-t border-blue-800">
            <button 
              className="w-full flex items-center gap-2 mb-3 px-4 rounded transition-colors"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-full mx-auto p-3 sm:p-6">
            {/* Progress steps */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-500'}`}>
                  1
                </div>
                <div className="flex-1">
                  <div className={`h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-500'}`}>
                  2
                </div>
                <div className="flex-1">
                  <div className={`h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-500'}`}>
                  3
                </div>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className={step >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Select Bookings</span>
                <span className={step >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Vehicle & Driver</span>
                <span className={step >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}>Confirmation</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {step === 1 && renderStepOne()}
                {step === 2 && renderStepTwo()}
                {step === 3 && renderStepThree()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Toggle Button */}  
      <button
        onClick={() => setSidebarOpen(prev => !prev)}
        className="fixed z-50 bottom-4 right-4 p-2 sm:p-3 rounded-full bg-blue-600 text-white shadow-lg md:hidden"
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
        } md:hidden transition duration-200 ease-in-out z-40 w-64 bg-blue-950 shadow-md`}
      >
        <div className="p-4">
          <div className="flex items-center mb-4 border-b pb-2">
            <h2 className="text-lg sm:text-xl text-white font-bold">Dashboard</h2>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 rounded-full hover:bg-gray-700"
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
        </div>
      </div>
      
      {/* Responsive Footer */}
      <footer className="bg-gray-800 text-white p-2 sm:p-4 text-center text-xs sm:text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MergePage;
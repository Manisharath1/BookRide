import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Alert, AlertDescription } from "../../src/components/ui/alert";
import axios from "axios";
import {  
  Car, 
  Home, 
  Calendar,
  LogOut,
  LayoutDashboard,
 
} from "lucide-react";
import FullCalendarScheduler from "../components/FullCalendarSelector"; 
import "react-toastify/dist/ReactToastify.css";




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

const HomePage = () => {

  const [successMessage] = useState("");
  const [error] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [selectedTime, setSelectedTime] = useState(null);
  const [existingEvents, setExistingEvents] = useState([]);
  const [bookingList, setBookingList] = useState([]);
  

  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
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

  const handleLogout = () => {
  if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
  }
  };
    
  const navItems = [
  { name: "Home", path: "/home", icon: <Home size={20} /> },
  { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
  { name: "Bookings", path: "/guest-booking", icon: <Calendar size={20} /> },
  { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
  ];

  useEffect(() =>{

    const fetchApprovedBookings = async () => {
        try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL}/api/bookings/all`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
    
        const approved = res.data.filter(b => b.status === 'approved' || b.status === 'shared' || b.status === 'confirmed');
    
        // Map to calendar-friendly format
        const events = approved.map(b => {
            const startDate = new Date(b.scheduledAt);
            const endDate = new Date(startDate.getTime() + (b.duration || 1) * 60 * 60 * 1000);
        
            const pad = (n) => (n < 10 ? '0' + n : n);
            const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes() >= 30 ? 30 : 0)}`;
        
            return {
            id: `external-${b._id}`,
            title: b.location || 'Booked',
            date: startDate,
            startTime: formatTime(startDate),
            endTime: formatTime(endDate),
            color: 'bg-green-500',
            readOnly: true
            };
        });
    
        setExistingEvents(events);
        setBookingList(approved);
        // console.log("Approved calendar events loaded:", events);
        } catch (err) {
        console.error("Failed to load approved bookings", err);
        }
    };

    fetchApprovedBookings();
  },[navigate])

  useEffect(() => {
  if (!localStorage.getItem("token")) {
      navigate("/");
  }
  }, [navigate]);
    
return (
  <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    
    {/* Header */}
    <header className="sticky top-0 w-full z-30 backdrop-blur-md inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl border-b border-white/20">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome, {username}!</h1>
          <button 
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-2 transition"
          >
            <span>Logout</span>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    {/* Main Layout */}
    <div className="flex flex-1">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-blue-950 text-white p-4 space-y-3">
        {navItems.map((item) => (
          <Link 
            key={item.name}
            to={item.path}
            className="flex items-center px-4 py-3 rounded-md hover:bg-blue-900 transition"
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Calendar Section */}
        <div className="flex-1 lg:flex-[2] overflow-y-auto ">
          <FullCalendarScheduler 
            selectedTime={selectedTime} 
            setSelectedTime={setSelectedTime} 
            existingEvents={existingEvents} 
          />
        </div>

        {/* Bookings List Section */}
        <div className="lg:flex-1 lg:min-w-[400px] bg-white border-1 border-gray-800 rounded-lg flex flex-col mt-10 mb-12">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="text-xl font-semibold text-gray-800">Approved Bookings</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {bookingList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No approved bookings found.</p>
            ) : (
              <div className="space-y-3">
                {bookingList.map((b) => {
                  const startDate = new Date(b.scheduledAt);
                  const pad = (n) => (n < 10 ? "0" + n : n);
                  const time = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
                  return (
                    <div 
                      key={b._id} 
                      onClick={() => setSelectedTime(new Date(b.scheduledAt))}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800">{b.location}</h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium capitalize">
                          {b.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <span className="w-16 font-medium">Date:</span>
                          <span>{startDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-16 font-medium">Time:</span>
                          <span>{time}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-16 font-medium">Duration:</span>
                          <span>{b.duration || 1} hr(s)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alerts */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="mt-4 bg-green-100 border-green-500">
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </main>
    </div>

    {/* Floating Mobile Menu Toggle */}
    <button
      onClick={() => setSidebarOpen(prev => !prev)}
      className="fixed z-50 bottom-5 right-5 p-3 rounded-full bg-indigo-600 text-white shadow-lg md:hidden"
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

    {/* Mobile Sidebar Drawer */}
    <aside className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:hidden transition duration-200 ease-in-out z-40 w-64 bg-blue-950 shadow-lg`}>
      <div className="p-4">
        <div className="flex justify-between items-center text-white border-b border-gray-500 pb-2 mb-4">
          <h2 className="text-lg font-bold">Navigation</h2>
          <button onClick={() => setSidebarOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className="flex items-center py-3 px-4 text-white hover:bg-blue-800 rounded-md transition"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </div>
    </aside>

    {/* Footer */}
    <footer className="bg-gray-900 text-white p-4 text-center text-sm">
      <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
    </footer>
  </div>
);

};

export default HomePage
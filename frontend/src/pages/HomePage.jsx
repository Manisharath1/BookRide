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
    const [error, setError] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [username, setUsername] = useState("");
    const [selectedTime, setSelectedTime] = useState(null);
    const [existingEvents, setExistingEvents] = useState([]);

    

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
      
          const approved = res.data.filter(b => b.status === 'approved' || b.status === 'shared');
      
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

            <div className="flex-1 flex flex-col overflow-y-auto">
            <FullCalendarScheduler selectedTime={selectedTime} setSelectedTime={setSelectedTime} existingEvents={existingEvents}  />
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

export default HomePage
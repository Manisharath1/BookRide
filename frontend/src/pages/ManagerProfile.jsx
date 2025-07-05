import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";
import { Calendar, Car, Home, LayoutDashboard, LogOut, User2Icon, TrendingUp, Clock, CheckCircle, XCircle, Share2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

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
          navigate("/profile");
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

const ManagerProfile = () => {
    useManagerAccess();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editUsername, setEditUsername] = useState("");
    const [editNumber, setEditNumber] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [username, setUsername] = useState("");
    const [number, setNumber] = useState("");
    const [bookingStats, setBookingStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        confirmed: 0,
        cancelled: 0,
        shared: 0,
        completed: 0
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    const navItems = [
        { name: "Home", path: "/home", icon: <Home size={20} /> },
        { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
        { name: "Guest Booking", path: "/guest-booking", icon: <Calendar size={20} /> },
        { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
        { name: "Profile", path: "/profile", icon: <User2Icon size={20} /> }
    ];

    // Fetch user profile data
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/user`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data) {
                    setUsername(response.data.username || "");
                    setNumber(response.data.number || "");
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            }
        };

        fetchUserProfile();
    }, []);

    // Fetch booking statistics
    useEffect(() => {
        const fetchBookingStats = async () => {
            // console.log('Stats endpoint hit!');
            try {
                setIsLoadingStats(true);
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data) {
                    setBookingStats(response.data);
                }
            } catch (error) {
                console.error('Stats error:', error);
                // console.error("Failed to fetch booking statistics:", error);
                // If the stats endpoint doesn't exist, we'll show zeros
                setBookingStats({
                    total: 0,
                    pending: 0,
                    approved: 0,
                    confirmed: 0,
                    cancelled: 0,
                    shared: 0,
                    completed: 0
                });
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchBookingStats();
    }, []);

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            localStorage.removeItem("token");
            navigate("/dashboard");
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!editUsername.trim()) {
            toast.error('Username cannot be empty.');
            return;
        }
        
        if (!editNumber.trim()) {
            toast.error('Phone number cannot be empty.');
            return;
        }

        // Basic phone number validation (adjust regex as needed)
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(editNumber.replace(/\s+/g, ''))) {
            toast.error('Please enter a valid phone number (10-15 digits).');
            return;
        }

        try {
            setIsUpdating(true);
            const token = localStorage.getItem("token");
            
            if (!token) {
                toast.error('Authentication required. Please log in again.');
                navigate("/");
                return;
            }

            const response = await axios.put(
                `${import.meta.env.VITE_API_BASE_URL}/api/auth/update-profile`,
                {
                    username: editUsername.trim(),
                    number: editNumber.trim()
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200) {
                // Update local state
                setUsername(editUsername.trim());
                setNumber(editNumber.trim());
                
                // Exit edit mode
                setIsEditing(false);
                
                toast.success('Profile updated successfully!');
            }

        } catch (err) {
            console.error("Profile update error:", err);
            
            if (err.response) {
                if (err.response.status === 400) {
                    const errorText = err.response.data?.message || 'Invalid profile data. Please check all fields.';
                    toast.error(errorText);
                } else if (err.response.status === 401) {
                    toast.error('Authentication failed. Please log in again.');
                    localStorage.removeItem("token");
                    setTimeout(() => navigate("/"), 2000);
                } else if (err.response.status === 409) {
                    toast.error('Username or phone number already exists. Please try different values.');
                } else {
                    const errorText = err.response.data?.message || 'Server error. Please try again later.';
                    toast.error(errorText);
                }
            } else if (err.request) {
                toast.error('No response from server. Please check your connection.');
            } else {
                toast.error(`Error: ${err.message}`);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditClick = () => {
        setEditUsername(username);
        setEditNumber(number);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditUsername("");
        setEditNumber("");
        setIsEditing(false);
    };

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    // Booking statistics configuration
    const statCards = [
        {
            title: "Total Bookings",
            value: bookingStats.total,
            icon: <TrendingUp className="w-6 h-6" />,
            bgColor: "bg-blue-500",
            textColor: "text-blue-600",
            bgLight: "bg-blue-50"
        },
        {
            title: "Pending",
            value: bookingStats.pending,
            icon: <Clock className="w-6 h-6" />,
            bgColor: "bg-yellow-500",
            textColor: "text-yellow-600",
            bgLight: "bg-yellow-50"
        },
        {
            title: "Approved",
            value: bookingStats.approved,
            icon: <CheckCircle className="w-6 h-6" />,
            bgColor: "bg-green-500",
            textColor: "text-green-600",
            bgLight: "bg-green-50"
        },
        {
            title: "Confirmed",
            value: bookingStats.confirmed,
            icon: <CheckCircle className="w-6 h-6" />,
            bgColor: "bg-emerald-500",
            textColor: "text-emerald-600",
            bgLight: "bg-emerald-50"
        },
        {
            title: "Cancelled",
            value: bookingStats.cancelled,
            icon: <XCircle className="w-6 h-6" />,
            bgColor: "bg-red-500",
            textColor: "text-red-600",
            bgLight: "bg-red-50"
        },
        {
            title: "Shared Rides",
            value: bookingStats.shared,
            icon: <Share2 className="w-6 h-6" />,
            bgColor: "bg-purple-500",
            textColor: "text-purple-600",
            bgLight: "bg-purple-50"
        }
    ];

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

            <div className="flex flex-1">
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

                <div className="flex-1 flex flex-col p-6">
                    {/* Booking Statistics Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Booking Statistics</h2>
                        
                        {isLoadingStats ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, index) => (
                                    <div key={index} className="bg-white rounded-lg p-6 shadow-sm border animate-pulse">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-3 flex-1">
                                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                                            </div>
                                            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {statCards.map((stat, index) => (
                                    <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                                                </div>
                                                <div className={`w-12 h-12 rounded-lg ${stat.bgLight} flex items-center justify-center`}>
                                                    <div className={stat.textColor}>
                                                        {stat.icon}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Profile Section */}
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900">Profile Settings</h2>
                            {!isEditing && (
                                <button
                                    onClick={handleEditClick}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition w-full sm:w-auto flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        <Card className="overflow-hidden">
                            <CardContent className="p-6">
                                {!isEditing ? (
                                    // VIEW MODE
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-gray-700 text-sm font-medium mb-2">Username</label>
                                                <div className="py-3 px-4 bg-gray-50 rounded-lg border">
                                                    <p className="font-medium text-gray-900">{username || "Not set"}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
                                                <div className="py-3 px-4 bg-gray-50 rounded-lg border">
                                                    <p className="font-medium text-gray-900">{number || "Not set"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // EDIT MODE
                                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                                    Username <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editUsername}
                                                    onChange={(e) => setEditUsername(e.target.value)}
                                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                                    placeholder="Enter your username"
                                                    required
                                                    disabled={isUpdating}
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                                    Phone Number <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={editNumber}
                                                    onChange={(e) => setEditNumber(e.target.value)}
                                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                                    placeholder="Enter your phone number"
                                                    required
                                                    disabled={isUpdating}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Enter 10-15 digits only</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                                            <button
                                                type="submit"
                                                disabled={isUpdating}
                                                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 flex-1"
                                            >
                                                {isUpdating ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Updating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </button>
                                            
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                disabled={isUpdating}
                                                className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 flex-1"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        {/* Additional Account Information */}
                        <Card className="mt-6 overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-200">
                                <CardTitle className="text-lg flex items-center text-gray-900">
                                    <AlertCircle className="mr-2 h-5 w-5 text-slate-600" />
                                    Account Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-2">Account Status</label>
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                            <p className="font-medium text-green-600">Active</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-2">Role</label>
                                        <p className="font-medium text-gray-900">Manager</p>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-2">Member Since</label>
                                        <p className="font-medium text-gray-900">{new Date().getFullYear()}</p>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 text-xs uppercase tracking-wide mb-2">Last Login</label>
                                        <p className="font-medium text-gray-900">Today</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Button */}
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
                    <div className="absolute top-0 left-0 w-64 h-full bg-blue-950 shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
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

export default ManagerProfile;
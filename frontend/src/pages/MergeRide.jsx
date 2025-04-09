import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Home, 
  Calendar,
  Merge,
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
            navigate("/merge-ride"); // Redirect non-managers to regular dashboard
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

const MergeRide = () => {
    useManagerAccess(); // Check if user has manager access
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState([]);
    const [vehicle, setVehicle] = useState("");
    const [notes, setNotes] = useState("");
    const [mergeSuccess, setMergeSuccess] = useState(false);
    const navigate = useNavigate();

    // Fetch all bookings that can be merged
    useEffect(() => {
        const fetchBookings = async () => {
          setLoading(true);
          setError(null);
          try {
            const token = localStorage.getItem("token");
            if (!token) {
              navigate("/");
              return;
            }
            
            // Fetch bookings that could be merged (not already merged)
            const res = await axios.get("http://localhost:5000/api/bookings/all", {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Filter out bookings that are already merged if needed
            // This is optional and depends on whether your API already filters them
            const availableBookings = Array.isArray(res.data) 
              ? res.data.filter(booking => booking.status !== "merged")
              : [];
              
            setBookings(availableBookings);
          } catch (err) {
            console.error("Error fetching bookings:", err);
            setError("Failed to fetch bookings. Please try again.");
          } finally {
            setLoading(false);
          }
        };
    
        fetchBookings();
      }, [navigate, mergeSuccess]);

    // Select or deselect a booking
    const toggleSelection = (id) => {
        setSelected(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Handle the merging of selected rides
    const handleMerge = async () => {
        if (selected.length < 2) {
          alert("Select at least two bookings to merge for a shared ride.");
          return;
        }

        try {
          const token = localStorage.getItem("token");
          if (!token) {
            navigate("/");
            return;
          }
          
          const res = await axios.post(
            "http://localhost:5000/api/bookings/merge",
            {
              bookingIds: selected,
              newDetails: {
                vehicle,
                notes,
                status: "confirmed", // Set status for the merged booking
                isSharedRide: true    // Mark as a shared ride
              },
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (res.data) {
            setMergeSuccess(true);
            alert("Rides successfully merged into a shared ride!");
            
            // Reset form and selection
            setSelected([]);
            setVehicle("");
            setNotes("");
            
            // Reset success flag after a delay
            setTimeout(() => {
              setMergeSuccess(false);
            }, 3000);
          }
        } catch (err) {
          console.error("Merge failed:", err);
          alert(err.response?.data?.error || "Failed to merge rides. Please try again.");
        }
    };
    
    const navItems = [
        { name: "Home", path: "/manager", icon: <Home size={20} /> },
        { name: "Bookings", path: "/guest-booking", icon: <Calendar size={20} /> },
        { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
        { name: "Merge Rides", path: "/merge-ride", icon: <Merge size={20} /> },
    ];
      
    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };
    
    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
          localStorage.removeItem("token");
          navigate("/");
        }
    };
    
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
        {/* Header/Navbar */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <button
                onClick={toggleSidebar}
                className="mr-4 text-2xl md:hidden"
                >
                ☰
            </button>
            <h2 className="text-2xl text-white font-bold">Manager Dashboard</h2>
            <Button variant="outline" className="text-white border-white hover:bg-blue-900 hover:text-white" onClick={handleLogout}>Logout</Button>
        </div>
        <div className="flex flex-1">
            {/* Sidebar */}
            <div className="shadow-sm border-r hidden md:block bg-white w-64 flex-shrink-0 p-4 transition-all duration-300 overflow-y-auto">
                <nav className="mt-6">
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.name}>
                                <Link
                                to={item.path}
                                className="flex items-center py-3 px-4 rounded-md hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors">
                                    <span className="mr-3">{item.icon}</span>
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Create Shared Rides</h2>
              <p className="text-gray-600 mb-6">Select multiple bookings to merge them into a shared ride.</p>

              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-semibold mb-4">Shared Ride Details</h3>
                
                <div className="mb-4">
                    <label className="block mb-2 font-semibold">Vehicle Assignment</label>
                    <input
                    type="text"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Vehicle to assign to this shared ride"
                    required
                    />
                </div>

                <div className="mb-4">
                    <label className="block mb-2 font-semibold">Notes for Driver</label>
                    <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Additional instructions or notes for this shared ride"
                    rows={3}
                    />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                  <h3 className="text-lg font-semibold mb-4">Select Bookings to Combine</h3>
                  {loading && <p className="text-gray-500 py-4">Loading available bookings...</p>}
                  {error && <p className="text-red-500 py-4">{error}</p>}
                  
                  {!loading && !error && (
                    bookings.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-3">
                        {bookings.map((booking) => (
                          <div 
                            key={booking._id} 
                            className={`flex items-center p-3 border-b hover:bg-gray-50 transition-colors ${selected.includes(booking._id) ? 'bg-blue-50' : ''}`}
                          >
                            <input
                              type="checkbox"
                              id={`booking-${booking._id}`}
                              checked={selected.includes(booking._id)}
                              onChange={() => toggleSelection(booking._id)}
                              className="mr-3 h-5 w-5 text-blue-600"
                            />
                            <label htmlFor={`booking-${booking._id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium text-gray-800">
                                {booking.guestName || "Guest"} 
                              </div>
                              <div className="text-sm">
                                <span className="text-blue-600">From:</span> {booking.location || "N/A"} 
                                <span className="mx-2">→</span> 
                                <span className="text-blue-600">To:</span> {booking.location || "N/A"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {booking.date ? new Date(booking.date).toLocaleString() : "No date specified"} 
                                {booking.passengersCount && <span className="ml-2">• {booking.passengersCount} passenger(s)</span>}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded">
                        <p className="text-gray-500">No available bookings found to merge.</p>
                        <p className="text-sm text-gray-400 mt-1">All bookings may already be assigned or merged.</p>
                      </div>
                    )
                  )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">
                    {selected.length} {selected.length === 1 ? 'booking' : 'bookings'} selected
                  </span>
                  {selected.length > 0 && (
                    <button 
                      onClick={() => setSelected([])}
                      className="ml-3 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                
                <Button
                    onClick={handleMerge}
                    disabled={selected.length < 2 || !vehicle || loading}
                    className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                    Create Shared Ride
                </Button>
              </div>
            </div>
        </div>
        
        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-40 md:hidden" onClick={toggleSidebar}>
            <div 
              className="absolute top-0 left-0 w-64 h-full bg-white shadow-lg p-4"
              onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
            >
              <nav className="mt-6">
                <h2 className="text-2xl text-blue-800 text-center mb-10 font-bold">Manager Tools</h2>
                <ul className="space-y-1">
                  {navItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.path}
                        onClick={() => setSidebarOpen(false)} // Close sidebar on link click
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
          </div>
        )}
    </div>
  );
};

export default MergeRide;
import { useEffect, useState} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Car, 
  Home, 
  Calendar,
  LogOut,
  CrossIcon,
  LayoutDashboard,
  User2Icon,
 } from "lucide-react";
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // If user is not a manager, redirect
        if (response.data.role !== 'manager') {
          navigate("/get-vehicles"); // Or appropriate non-manager page
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


const VehiclePage = () => {
  useManagerAccess();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab] = useState("vehicles");
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState({
    name: "",
    number: "",
    vehicleID: "",
    driverName: "",
    driverNumber: "",
    chassisNumber: "",
    status: "available",
    insuranceDetails: {
      provider: "",
      validFrom: "",
      validTill: ""
    },
    mvTaxPeriod: {
      from: "",
      to: ""
    },
    pollutionClearance: {
      validFrom: "",
      validTill: ""
    },
    rcValidity: ""
  });
  const [updateMessage, setUpdateMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicleImage, setNewVehicleImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [addVehicle, setAddVehicle] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
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

  const updateVehicles = async () => {
    try {
      setError("");
      const token = localStorage.getItem("token");
  
      const formData = new FormData();
      formData.append("name", currentVehicle.name);
      formData.append("number", currentVehicle.number);
      formData.append("driverName", currentVehicle.driverName);
      formData.append("driverNumber", currentVehicle.driverNumber);
      formData.append("status", currentVehicle.status);
      formData.append("vehicleID", currentVehicle.vehicleID);
      formData.append("chassisNumber", currentVehicle.chassisNumber || "");
  
      // Insurance details
      formData.append("insuranceDetails[provider]", currentVehicle.insuranceDetails?.provider || "");
      formData.append("insuranceDetails[validFrom]", currentVehicle.insuranceDetails?.validFrom || "");
      formData.append("insuranceDetails[validTill]", currentVehicle.insuranceDetails?.validTill || "");
  
      // MV Tax period
      formData.append("mvTaxPeriod[from]", currentVehicle.mvTaxPeriod?.from || "");
      formData.append("mvTaxPeriod[to]", currentVehicle.mvTaxPeriod?.to || "");
  
      // Pollution clearance
      formData.append("pollutionClearance[validFrom]", currentVehicle.pollutionClearance?.validFrom || "");
      formData.append("pollutionClearance[validTill]", currentVehicle.pollutionClearance?.validTill || "");
  
      // RC Validity
      formData.append("rcValidity", currentVehicle.rcValidity || "");
  
      // Image, if updated
      if (imageFile) {
        formData.append("vehicleImage", imageFile);
      }
  
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/vehicles/${currentVehicle._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );
  
      setUpdateMessage("Vehicle updated successfully!");
      setShowModal(false);
      fetchVehicles();
  
      setTimeout(() => {
        setUpdateMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to update vehicle:", error);
  
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        setError(`Update failed: ${error.response.data.error || "Server error"}`);
      } else if (error.request) {
        console.error("No response received:", error.request);
        setError("Update failed: No response from server");
      } else {
        console.error("Error message:", error.message);
        setError(`Update failed: ${error.message}`);
      }
    }
  };

  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
  
    // Handle nested names like "insuranceDetails.provider"
    if (name.includes(".")) {
      const [parentKey, childKey] = name.split(".");
      setAddVehicle((prev) => ({
        ...prev,
        [parentKey]: {
          ...prev[parentKey],
          [childKey]: value
        }
      }));
    } else {
      setAddVehicle((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleAddImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewVehicleImage(file);
      
      // Create a preview URL for the selected image
      const previewUrl = URL.createObjectURL(file);
      setNewImagePreview(previewUrl);
    }
  };
  
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const token = localStorage.getItem("token");
      
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append("name", addVehicle.name);
      formData.append("number", addVehicle.number);
      formData.append("driverName", addVehicle.driverName);
      formData.append("driverNumber", addVehicle.driverNumber);
      formData.append("status", addVehicle.status);
      formData.append("vehicleID", addVehicle.vehicleID || "");
      formData.append("chassisNumber", addVehicle.chassisNumber || "");
      // Insurance details (flattened)
      formData.append("insuranceDetails[provider]", addVehicle.insuranceDetails?.provider || "");
      formData.append("insuranceDetails[validFrom]", addVehicle.insuranceDetails?.validFrom || "");
      formData.append("insuranceDetails[validTill]", addVehicle.insuranceDetails?.validTill || "");

      // MV Tax period
      formData.append("mvTaxPeriod[from]", addVehicle.mvTaxPeriod?.from || "");
      formData.append("mvTaxPeriod[to]", addVehicle.mvTaxPeriod?.to || "");

      // Pollution clearance
      formData.append("pollutionClearance[validFrom]", addVehicle.pollutionClearance?.validFrom || "");
      formData.append("pollutionClearance[validTill]", addVehicle.pollutionClearance?.validTill || "");

      // RC Validity
      formData.append("rcValidity", addVehicle.rcValidity || "");
      
      // Append image file if one was selected
      if (newVehicleImage) {
        formData.append("vehicleImage", newVehicleImage);
      }
      
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/vehicles/newVehicle`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      setUpdateMessage("Vehicle added successfully!");
      setShowAddModal(false);
      // Reset the form
      setAddVehicle({
        name: "",
        number: "",
        driverName: "",
        driverNumber: "",
        vehicleID: "",
        status: "available",
        chassisNumber: "",
        insuranceDetails: {
          provider: "",
          validFrom: "",
          validTill: ""
        },
        mvTaxPeriod: {
          from: "",
          to: ""
        },
        pollutionClearance: {
          validFrom: "",
          validTill: ""
        },
        rcValidity: ""
      });
      setNewVehicleImage(null);
      setNewImagePreview(null);
      
      fetchVehicles(); // Refresh the vehicle list
      
      // Clear update message after 3 seconds
      setTimeout(() => {
        setUpdateMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to add vehicle:", error);
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        setError(`Add failed: ${error.response.data.error || 'Server error'}`);
      } else if (error.request) {
        console.error("No response received:", error.request);
        setError("Add failed: No response from server");
      } else {
        console.error("Error message:", error.message);
        setError(`Add failed: ${error.message}`);
      }
    }
  };

  const handleOpenModal = (vehicle) => {
    setCurrentVehicle({...vehicle,
      insuranceDetails: {
        provider: vehicle.insuranceDetails?.provider || "",
        validFrom: formatDate(vehicle.insuranceDetails?.validFrom),
        validTill: formatDate(vehicle.insuranceDetails?.validTill)
      },
      mvTaxPeriod: {
        from: formatDate(vehicle.mvTaxPeriod?.from),
        to: formatDate(vehicle.mvTaxPeriod?.to)
      },
      pollutionClearance: {
        validFrom: formatDate(vehicle.pollutionClearance?.validFrom),
        validTill: formatDate(vehicle.pollutionClearance?.validTill)
      },
      rcValidity: formatDate(vehicle.rcValidity)
    });
    setImagePreview(vehicle.imagePath ? `${import.meta.env.VITE_API_BASE_URL}${vehicle.imagePath}` : null);
    setImageFile(null);
    setShowModal(true);
  };

  const handleViewModal =(vehicle) =>{

    setCurrentVehicle({...vehicle,
      insuranceDetails: {
        provider: vehicle.insuranceDetails?.provider || "",
        validFrom: formatDate(vehicle.insuranceDetails?.validFrom),
        validTill: formatDate(vehicle.insuranceDetails?.validTill)
      },
      mvTaxPeriod: {
        from: formatDate(vehicle.mvTaxPeriod?.from),
        to: formatDate(vehicle.mvTaxPeriod?.to)
      },
      pollutionClearance: {
        validFrom: formatDate(vehicle.pollutionClearance?.validFrom),
        validTill: formatDate(vehicle.pollutionClearance?.validTill)
      },
      rcValidity: formatDate(vehicle.rcValidity)
    });
    setImagePreview(vehicle.imagePath ? `${import.meta.env.VITE_API_BASE_URL}${vehicle.imagePath}` : null);
    setImageFile(null);
    setViewModal(true);

  };

  const handleCloseModal = () => {
    setShowModal(false);
    setViewModal(false);
    setError("");
    setImagePreview(null);
    setImageFile(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentVehicle({
      ...currentVehicle,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Create a preview URL for the selected image
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateVehicles();
  };

  const navigate = useNavigate();
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      navigate("/dashboard");
    }
  };

  const navItems = [
    { name: "Home", path: "/home", icon: <Home size={20} /> },
    { name: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
    { name: "Guest Booking", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
    { name: "Profile", path: "/profile", icon: <User2Icon size={20} /> }
  ];

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
    setIsSidebarOpen(!isSidebarOpen);
  };

  const formatDate = (date) => {
    return date ? new Date(date).toISOString().split("T")[0] : "";
  };

  const handleReleaseVehicle = async (vehicleId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/vehicles/release/${vehicleId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUpdateMessage("Vehicle released successfully!");
      fetchVehicles(); // refresh list
  
      setTimeout(() => {
        setUpdateMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to release vehicle:", error);
      setError("Failed to release vehicle. Please try again.");
    }
  };

   
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="relative w-full z-10">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-20">
          <div className="mx-auto flex justify-between items-center h-full px-4">
            
            {/* Sidebar Toggle (Mobile Only) */}
            <div className="bg-blue-500 flex rounded p-2 md:hidden">
              <button onClick={toggleSidebar} className="text-2xl text-white">
                {isSidebarOpen ? <CrossIcon /> : '☰'}
              </button>
            </div>

            {/* Left Section (User Icon + Dashboard) */}
            <div className="flex items-center">
              <div className="bg-blue-500 rounded-full p-1 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-white font-medium text-lg">Dashboard</h2>
            </div>

            {/* Right Section (Logout Button) */}
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

      {/* Header/Navbar */}
      
      <div className="flex flex-1">
        {/* Sidebar */}
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

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-40 md:hidden" onClick={toggleSidebar}>
            <div 
              className="absolute top-0 left-0 w-64 h-full bg-blue-950 shadow-lg p-4"
              onClick={(e) => e.stopPropagation()} >
                <nav className="mt-6">
                  <h2 className="text-2xl text-white text-center mb-10 font-bold">Dashboard</h2>
                  <ul className="space-y-1">
                    {navItems.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)} // Close sidebar on link click
                          className="flex items-center py-3 px-4 rounded-md text-white transition-colors"
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

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Success message */}
          {updateMessage && (
            <Alert className="mb-4 border-green-500 bg-green-50">
              <AlertDescription className="text-green-700">{updateMessage}</AlertDescription>
            </Alert>
          )}
            
          {/* Render different content based on active tab */}
          {activeTab === "vehicles" && (
            <div>
            {loading ? (
              <p>Loading vehicles...</p>
            ) : (
              <div className=" grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="bg-white border border-blue-300 rounded-lg p-4 shadow-md">
                      {/* Vehicle Image Header */}
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
                          vehicle.status === "available"
                            ? "text-green-600"
                            : vehicle.status === "assigned"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        Status: {vehicle.status}
                      </p>
                      <div className="flex justify-between items-center mt-4">
                        <div>
                          <button
                            onClick={() => handleOpenModal(vehicle)}
                            className="mt-4 bg-blue-500 hover:bg-blue-600 border border-blue-950 border-dotted text-white py-1 px-3 rounded-lg"
                          >
                            Update
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4">
                          <button
                            onClick={() => handleViewModal(vehicle)}
                            className="mt-4 bg-rose-900 hover:bg-rose-600 text-white py-1 mr-2 px-3 rounded-lg"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleReleaseVehicle(vehicle._id)}
                            className={`mt-4 py-1 px-3 rounded text-white
                              ${vehicle.status === "available" 
                                ? "bg-gray-400 cursor-not-allowed" 
                                : "bg-emerald-700 hover:bg-green-900"}
                            `}
                            disabled={vehicle.status === "available"}
                            title={vehicle.status === "available" ? "Vehicle already available" : "Release vehicle"}
                            >
                            Release
                          </button>
                        </div>
                        
                      </div>
                    </div>
                  ))}
                {error && (
                  <Alert variant="destructive" className="mt-4 border-red-500 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        <Car className="fixed bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg" size={60}
          onClick={() => setShowAddModal(true)} />
          
        {/* Add Vehicle Modal */}
        {showAddModal && (
            <div className="overflow-y-auto fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg w-full max-w-3xl p-6 mt-20">
                <h3 className="text-xl font-semibold mb-4">Add New Vehicle</h3>
                {error && (
                  <Alert variant="destructive" className="mb-4 border-red-500 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleAddVehicle}>
                  {/* Image preview and upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Image</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 border rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                        {newImagePreview ? (
                          <img 
                            src={newImagePreview} 
                            alt="Vehicle preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs text-center">No image</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAddImageChange}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">JPG, PNG, or GIF up to 5MB</p>
                      </div>
                    </div>
                  </div>
                    <div className='mb-4'>
                      <label className="block text-sm font-medium text-gray-700">Vehicle Name</label>
                      <input
                        type="text"
                        name="name"
                        value={addVehicle.name}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                      />
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No.</label>
                        <input
                          type="text"
                          name="number"
                          value={addVehicle.number}
                          onChange={handleAddInputChange}
                          className="w-full p-2 border border-gray-300 rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle ID</label>
                        <input
                          type="text"
                          name="vehicleID"
                          value={addVehicle.vehicleID}
                          onChange={handleAddInputChange}
                          className="w-full p-2 border border-gray-300 rounded"
                          required
                        />
                      </div>
                    </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">

                    <div className = "mb-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                      <input
                        type="text"
                        name="driverName"
                        value={addVehicle.driverName}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                      />
                    </div>   
                    <div className = "mb-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Driver Number</label>
                      <input
                        type="text"
                        name="driverNumber"
                        value={addVehicle.driverNumber}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className = "mb-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                      <input
                        type="text"
                        name="chassisNumber"
                        value={addVehicle.chassisNumber || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                      />
                    </div>

                    {/* Insurance Details */}
                    <div className = "mb-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                      <input
                        type="text"
                        name="insuranceDetails.provider"
                        value={addVehicle.insuranceDetails?.provider || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Valid From</label>
                      <input
                        type="date"
                        name="insuranceDetails.validFrom"
                        value={addVehicle.insuranceDetails?.validFrom || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Valid Till</label>
                      <input
                        type="date"
                        name="insuranceDetails.validTill"
                        value={addVehicle.insuranceDetails?.validTill || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* MV Tax Period */}
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MV Tax From</label>
                      <input
                        type="date"
                        name="mvTaxPeriod.from"
                        value={addVehicle.mvTaxPeriod?.from || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MV Tax To</label>
                      <input
                        type="date"
                        name="mvTaxPeriod.to"
                        value={addVehicle.mvTaxPeriod?.to || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Pollution Clearance */}
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pollution Valid From</label>
                      <input
                        type="date"
                        name="pollutionClearance.validFrom"
                        value={addVehicle.pollutionClearance?.validFrom || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pollution Valid Till</label>
                      <input
                        type="date"
                        name="pollutionClearance.validTill"
                        value={addVehicle.pollutionClearance?.validTill || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    {/* RC Validity */}
                    <div className = "mb-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">RC Validity</label>
                      <input
                        type="date"
                        name="rcValidity"
                        value={addVehicle.rcValidity || ""}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div className = "mb-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        name="status"
                        value={addVehicle.status}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                      >
                        <option value="available">Available</option>
                        <option value="assigned">Assigned</option>
                        <option value="in service">In service</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setError("");
                        setNewImagePreview(null);
                        setNewVehicleImage(null);
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded"
                    >
                      Add Vehicle
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
      
      {/* Update Vehicle Modal */}
      {showModal && (
        <div className="overflow-y-auto fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl p-6 mt-20">
            <h3 className="text-xl font-semibold mb-4">Update Vehicle</h3>
            {error && (
              <Alert variant="destructive" className="mb-4 border-red-500 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              {/* Image preview and upload */}
              <div className = "mb-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Image</label>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 border rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Vehicle preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs text-center">No image</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">JPG, PNG, or GIF up to 5MB</p>
                  </div>
                </div>
              </div>
              
              <div className = "mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                <input
                  type="text"
                  name="name"
                  value={currentVehicle.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="mb-2 grid grid-cols-2 gap-4">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle ID</label>
                  <input
                    type="text"
                    name="vehicleID"
                    value={currentVehicle.vehicleID}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No.</label>
                  <input
                    type="text"
                    name="number"
                    value={currentVehicle.number}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              </div>

              <div className="mb-2 grid grid-cols-2 gap-4">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    name="driverName"
                    value={currentVehicle.driverName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Number</label>
                  <input
                    type="text"
                    name="driverNumber"
                    value={currentVehicle.driverNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number</label>
                  <input
                    type="text"
                    name="chassisNumber"
                    value={currentVehicle.chassisNumber || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                {/* Insurance Details */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    name="insuranceDetails.provider"
                    value={currentVehicle.insuranceDetails?.provider || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Valid From</label>
                  <input
                    type="date"
                    name="insuranceDetails.validFrom"
                    value={currentVehicle.insuranceDetails?.validFrom || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Valid Till</label>
                  <input
                    type="date"
                    name="insuranceDetails.validTill"
                    value={currentVehicle.insuranceDetails?.validTill || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* MV Tax Period */}
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MV Tax From</label>
                  <input
                    type="date"
                    name="mvTaxPeriod.from"
                    value={currentVehicle.mvTaxPeriod?.from || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MV Tax To</label>
                  <input
                    type="date"
                    name="mvTaxPeriod.to"
                    value={currentVehicle.mvTaxPeriod?.to || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Pollution Clearance */}
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pollution Valid From</label>
                  <input
                    type="date"
                    name="pollutionClearance.validFrom"
                    value={currentVehicle.pollutionClearance?.validFrom || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pollution Valid Till</label>
                  <input
                    type="date"
                    name="pollutionClearance.validTill"
                    value={currentVehicle.pollutionClearance?.validTill || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              
              <div className="mb-4 grid grid-cols-2 gap-2">
                {/* RC Validity */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">RC Validity</label>
                  <input
                    type="date"
                    name="rcValidity"
                    value={currentVehicle.rcValidity || ""}
                    onChange={handleAddInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={currentVehicle.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="in service">In service</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded"
                >
                  Update Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-lg shadow-xl p-6 z-10 w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-semibold text-gray-800">
                {currentVehicle?.name || 'Vehicle Details'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="mt-4">
              {currentVehicle ? (
                <div className="space-y-3">
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <p className="text-sm text-gray-500">Vehicle Number</p>
                    <p className="font-medium">{currentVehicle.number}</p>
                  </div>
                  
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <p className="text-sm text-gray-500">Driver Name</p>
                    <p className="font-medium">{currentVehicle.driverName}</p>
                  </div>
                  
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <p className="text-sm text-gray-500">Driver Number</p>
                    <p className="font-medium">{currentVehicle.driverNumber}</p>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <p className="text-sm text-gray-500">Chassis Number</p>
                    <p className="font-medium">{currentVehicle.chassisNumber}</p>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <p className="text-sm text-gray-500">Insurance Provider</p>
                    <p className="font-medium">{currentVehicle.insuranceDetails?.provider || ""}</p>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className='bg-slate-100 p-3 rounded'>
                      <p className="text-sm text-gray-500">Insurance Valid From</p>
                      <p className="font-medium">{currentVehicle.insuranceDetails?.validFrom || "N/A"}</p>
                    </div>
                    <div className='bg-slate-100 p-3 rounded'>
                      <p className="text-sm text-gray-500">Insurance Valid Till</p>
                      <p className="font-medium">{currentVehicle.insuranceDetails?.validTill || "N/A"}</p>
                    </div>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className='bg-slate-100 p-3 rounded'>
                      <p className="text-sm text-gray-500">MV Tax From</p>
                      <p className="font-medium">{currentVehicle.mvTaxPeriod?.from || "N/A"}</p>
                    </div>
                    <div className='bg-slate-100 p-3 rounded'>
                      <p className="text-sm text-gray-500">MV Tax Till</p>
                      <p className="font-medium">{currentVehicle.mvTaxPeriod?.to || "N/A"}</p>
                    </div>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className='bg-slate-100 p-3 rounded'>
                      <p className="text-sm text-gray-500">Pollution Valid From</p>
                      <p className="font-medium">{currentVehicle.pollutionClearance?.validFrom || "N/A"}</p>
                    </div>
                    <div className='bg-slate-100 p-3 rounded'>
                      <p className="text-sm text-gray-500">Pollution Valid Till</p>
                      <p className="font-medium">{currentVehicle.pollutionClearance?.validTill || "N/A"}</p>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3 rounded">
                    <p className="text-sm text-gray-500">RC Validity</p>
                    <p className="font-medium">{currentVehicle.rcValidity || ""}</p>
                  </div>

                  <div className={`p-3 rounded ${
                    currentVehicle.status === 'available' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="flex items-center">
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        currentVehicle.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span className={`font-medium ${
                        currentVehicle.status === 'available' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentVehicle.status === 'available' ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading vehicle details...</p>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="mt-6 flex justify-end space-x-3 border-t pt-3">
              {/* <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button> */}
              {/* {currentVehicle?.status === 'available' && (
                <button
                  onClick={() => handleBookVehicle(currentVehicle)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Book Vehicle
                </button>
              )} */}
            </div>
          </div>
        </div>
      )}

    <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default VehiclePage;
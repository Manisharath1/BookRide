import { useEffect, useState} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Home, 
  Calendar,
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
        const response = await axios.get("http://localhost:5000/api/auth/user", {
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
  const [currentVehicle, setCurrentVehicle] = useState({
    name: "",
    number: "",
    driverName: "",
    driverNumber: "",
    status: "available",
  });
  const [updateMessage, setUpdateMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicleImage, setNewVehicleImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [addVehicle, setAddVehicle] = useState([]);
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
      
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append("name", currentVehicle.name);
      formData.append("number", currentVehicle.number);
      formData.append("driverName", currentVehicle.driverName);
      formData.append("driverNumber", currentVehicle.driverNumber);
      formData.append("status", currentVehicle.status);
      formData.append("vehicleID", currentVehicle.vehicleID);
      
      // Append image file if one was selected
      if (imageFile) {
        formData.append("vehicleImage", imageFile);
      }
      
      // Log request data for debugging (but don't log the whole formData since it can't be printed normally)
      // console.log("Updating vehicle with ID:", currentVehicle._id);
      
      // Make API request with FormData
      await axios.put(
        `http://localhost:5000/api/vehicles/${currentVehicle._id}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      setUpdateMessage("Vehicle updated successfully!");
      setShowModal(false);
      fetchVehicles(); // Refresh the vehicle list
      
      // Clear update message after 3 seconds
      setTimeout(() => {
        setUpdateMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to update vehicle:", error);
      
      // More detailed error logging
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        setError(`Update failed: ${error.response.data.error || 'Server error'}`);
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
    setAddVehicle({
      ...addVehicle,
      [name]: value
    });
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
      
      // Append image file if one was selected
      if (newVehicleImage) {
        formData.append("vehicleImage", newVehicleImage);
      }
      
      await axios.post(
        "http://localhost:5000/api/vehicles/newVehicle",
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
    setCurrentVehicle({...vehicle});
    setImagePreview(vehicle.imagePath ? `http://localhost:5000${vehicle.imagePath}` : null);
    setImageFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
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
      navigate("/");
    }
  };

  const navItems = [
    { name: "Home", path: "/manager", icon: <Home size={20} /> },
    { name: "Bookings", path: "/guest-booking", icon: <Calendar size={20} /> },
    { name: "Vehicles", path: "/get-vehicles", icon: <Car size={20} /> },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
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
        <h2 className="text-2xl text-white font-bold">Dashboard</h2>
        <Button variant="outline" className="text-red-500 text-lg border-white hover:bg-blue-900 hover:text-white" onClick={handleLogout}>Logout</Button>
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
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-40 md:hidden" onClick={toggleSidebar}>
            <div 
              className="absolute top-0 left-0 w-64 h-full bg-white shadow-lg p-4"
              onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
            >
              <nav className="mt-6">
              <h2 className="text-2xl text-blue-800 text-center mb-10 font-bold">Dashboard</h2>
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
                <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle._id}
                      className="bg-white border border-blue-300 rounded-lg p-4 shadow-md"
                    >
                      {/* Vehicle Image Header */}
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold">
                          Vehicle - {vehicle.name}
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
                      <button
                        onClick={() => handleOpenModal(vehicle)}
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
                      >
                        Update
                      </button>
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
                <div className="bg-white rounded-lg w-full max-w-md p-6">
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
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
                      <input
                        type="text"
                        name="name"
                        value={addVehicle.name}
                        onChange={handleAddInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div className="mb-4">
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
                    <div className="mb-4">
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
                    <div className="mb-4">
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
                    <div className="mb-4">
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
                    <div className="mb-4">
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
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">Update Vehicle</h3>
            {error && (
              <Alert variant="destructive" className="mb-4 border-red-500 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              {/* Image preview and upload */}
              <div className="mb-4">
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
              
              <div className="mb-4">
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
              <div className="mb-4">
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
              <div className="mb-4">
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
              <div className="mb-4">
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
              <div className="mb-4">
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
    </div>
  );
};

export default VehiclePage;
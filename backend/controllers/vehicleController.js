const Vehicle = require("../models/Vehicle");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// In your Vehicle.js controller, modify the storage configuration:

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "uploads", "vehicles");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`Created directory: ${uploadDir}`);
      } catch (err) {
        console.error(`Error creating directory: ${err.message}`);
      }
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `vehicle_${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Filter for image files only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Initialize upload middleware
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Add a new vehicle
const addVehicle = async (req, res) => {
  try {
    // The upload middleware has already processed the file
    const { name, number, vehicleID, driverName, driverNumber } = req.body;
    
    // Create vehicle object with image path if available
    const vehicleData = { 
      name, 
      number, 
      vehicleID, 
      driverName, 
      driverNumber 
    };

    // Add image path if file was uploaded
    if (req.file) {
      vehicleData.imagePath = `/uploads/vehicles/${req.file.filename}`;
    }

    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();
    
    res.status(201).json({ 
      message: "Vehicle added successfully", 
      vehicle 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all vehicles
const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a vehicle with image
const updateVehicle = async (req, res) => {
  const { id } = req.params;
  const { vehicleID, status, name, number, driverName, driverNumber } = req.body;
  
  try {
    // Get the existing vehicle to check for previous image
    const existingVehicle = await Vehicle.findById(id);
    if (!existingVehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Prepare the update data
    const updateData = { 
      name, 
      number, 
      driverName, 
      driverNumber, 
      vehicleID, 
      status 
    };

    // Add new image path if file was uploaded
    if (req.file) {
      updateData.imagePath = `/uploads/vehicles/${req.file.filename}`;
      
      // Delete the old image if it exists
      if (existingVehicle.imagePath) {
        const oldImagePath = path.join(__dirname, '..', existingVehicle.imagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    res.json({ 
      message: "Vehicle updated successfully", 
      vehicle 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Delete a vehicle
const deleteVehicle = async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Delete associated image if it exists
    if (vehicle.imagePath) {
      const imagePath = path.join(__dirname, '..', vehicle.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the vehicle
    await Vehicle.findByIdAndDelete(id);
    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Middleware to handle file upload
const vehicleUpload = upload.single('vehicleImage');

// Wrapper function to handle multer errors
const uploadVehicleImage = (req, res, next) => {
  vehicleUpload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred during upload
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred
      return res.status(500).json({ error: err.message });
    }
    // No errors, proceed
    next();
  });
};

module.exports = {
  addVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle,
  uploadVehicleImage
};
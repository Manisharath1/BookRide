const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const securityRoutes = require("./routes/securityRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const path = require('path');
const fs = require('fs');

const webPush = require('web-push');

dotenv.config();
const app = express();

const vehiclesUploadDir = path.join(__dirname, 'uploads', 'vehicles');
if (!fs.existsSync(vehiclesUploadDir)) {
  try {
    fs.mkdirSync(vehiclesUploadDir, { recursive: true });
    console.log(`Created uploads directory at: ${vehiclesUploadDir}`);
  } catch (error) {
    console.error(`Failed to create uploads directory: ${error.message}`);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
connectDB();

const subscriptions = [];
webPush.setVapidDetails(
  'mailto:manisha@ils.res.in',
  'BOV7U-0pnV13WuYwbNI7TGcKbdAU3s3AbRbiKYa-gChbMYI8XkF6gs-e9XvTSxjlo28rFnp7E1CRC2ursbjAstQ', //private key
  'M41JGWj8UGpx4KZXdlQCLZB8Kt3uOmeaFbVN5NcKmq8' //public key
);


app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: "Subscribed!" });
});

// Send notification
app.post('/notify', (req, res) => {
  const payload = JSON.stringify({
    title: 'Booking Approved!',
    body: 'Your vehicle is ready to roll 🚗',
  });

  subscriptions.forEach(sub => {
    webPush.sendNotification(sub, payload).catch(err => console.error(err));
  });

  res.status(200).json({ message: "Notifications sent!" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get("/", (req, res) => {
    res.send("Server is running...");
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
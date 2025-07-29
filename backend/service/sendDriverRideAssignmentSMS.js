const axios = require("axios");

const sendDriverRideAssignmentSMS = async (mobile, destination, time, customerName, customerContact, vehicleName) => {
  try {
    // Log the variables being sent
    // cls
    

    const payload = {
      flow_id: "6882206fd6fc055877557162", // Replace with your actual flow ID for driver notifications
      sender: "INSTLS",
      mobiles: mobile,
      // For template: "You have a new ride to {#var1#} at {#var2#}. Customer: {#var3#}, Contact: {#var4#}, Vehicle: {#var5#}. Institute of Life Sciences."
      var1: destination,     // Destination
      var2: time,           // Scheduled time
      var3: customerName,   // Customer name
      var4: customerContact, // Customer contact number
      var5: vehicleName     // Vehicle name and number
    };

    // console.log("Driver Ride Assignment SMS payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // console.log("MSG91 driver ride assignment SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Driver Ride Assignment SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendDriverRideAssignmentSMS;
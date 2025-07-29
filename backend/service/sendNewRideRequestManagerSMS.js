const axios = require("axios");

const sendNewRideRequestManagerSMS = async (mobile, userName, destination, time) => {
  try {
    // Log the variables being sent
    console.log("New Ride Request SMS Variables:", {
      mobile,
      userName,
      destination,
      time
    });

    const payload = {
      flow_id: "68821d4ed6fc0562db1b3432", // Replace with your actual flow ID for manager notifications
      sender: "INSTLS",
      mobiles: mobile,
      // For template: "New ride request by {#var1#} to {#var2#} at {#var3#}. Institute of Life Sciences"
      var1: userName,    // User who requested the ride
      var2: destination, // Destination
      var3: time        // Scheduled time
    };

    // console.log("New Ride Request SMS payload:", JSON.stringify(payload, null, 2));

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

    // console.log("MSG91 new ride request SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send New Ride Request Manager SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendNewRideRequestManagerSMS;
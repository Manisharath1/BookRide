const axios = require("axios");

// Function to send Passenger Removed SMS
const sendPassenger_RemovedSMS = async (mobile, passengerName, scheduledTime) => {
  try {
    console.log("Passenger Removed SMS Variables:", {
      mobile,
      passengerName,
      scheduledTime
    });
    
    const payload = {
      flow_id: "6888bcf8d6fc052c497ffc42", // Replace with your actual flow ID
      sender: "INSTLS",
      mobiles: mobile,
      // Template: "Dear ##var1##, you have been removed from the shared ride scheduled at ##var2##. A new individual booking has been created for you. Institute of Life Sciences"
      var1: passengerName,    // ##var1## = Passenger name
      var2: scheduledTime     // ##var2## = Scheduled time
    };

    console.log("Passenger Removed SMS payload:", JSON.stringify(payload, null, 2));
    
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
    
    console.log("MSG91 passenger removed SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Passenger Removed SMS:", error.response?.data || error.message);
    throw error;
  }
};


module.exports = sendPassenger_RemovedSMS;
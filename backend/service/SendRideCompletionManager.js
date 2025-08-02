const axios = require("axios");

const RideCompletionManager_SMS = async (mobile, userName, scheduledTime) => {
  try {
    const payload = {
      flow_id: "688ca868799835259c1c13a2", // Replace with your actual flow ID for ride completion notifications
      sender: "INSTLS",
      mobiles: mobile,
      // Template: "Booking for user ##var1## scheduled at ##var2## has been completed successfully. Institute of Life Sciences."
      var1: userName,        // ##var1## = User name
      var2: scheduledTime    // ##var2## = Scheduled time
    };

    console.log("Ride Completion Manager SMS payload:", JSON.stringify(payload, null, 2));

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

    console.log("MSG91 ride completion manager SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Ride Completion Manager SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = RideCompletionManager_SMS;
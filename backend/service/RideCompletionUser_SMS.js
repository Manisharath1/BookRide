const axios = require("axios");

const RideCompletionUser_SMS = async (mobile, userName, scheduledTime) => {
  try {
    const payload = {
      flow_id: "688ca8bde488f92f2e188ea2", // Replace with your actual flow ID for user ride completion notifications
      sender: "INSTLS",
      mobiles: mobile,
      // Template: "Dear ##var1##, your ride scheduled on ##var2## has been marked as completed. Thank you for using our service, Institute of Life Sciences."
      var1: userName,        // ##var1## = User name
      var2: scheduledTime    // ##var2## = Scheduled time
    };

    console.log("Ride Completion User SMS payload:", JSON.stringify(payload, null, 2));

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

    console.log("MSG91 ride completion user SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Ride Completion User SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = RideCompletionUser_SMS;
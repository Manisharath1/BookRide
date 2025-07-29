const axios = require("axios");

const sendRideCancelledUserSMS = async (mobile, userName, destination, time) => {
  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      {
        flow_id: "68820e5ed6fc053011629673", // put in .env
        sender: "INSTLS", // your DLT approved sender ID
        mobiles: mobile,
        var1: userName,
        var2: destination,
        var3: time,
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // console.log("MSG91 cancel user SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Ride Cancelled User SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendRideCancelledUserSMS

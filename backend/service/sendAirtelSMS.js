// services/sendAirtelSMS.js

const axios = require("axios");
require("dotenv").config();

const sendAirtelSMS = async (mobile, driverName, vehicleName) => {
  const fullMessage = `Your ride has been approved. Driver: ${driverName}, Vehicle: ${vehicleName}. Institute of life Sciences`;

  const base64Auth = Buffer.from(`${process.env.AIRTEL_USERNAME}:${process.env.AIRTEL_PASSWORD}`).toString("base64");

  try {
    const response = await axios.post(
      process.env.AIRTEL_SMS_API,
      {
        keyword: process.env.AIRTEL_KEYWORD,
        timeStamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        dataSet: [
          {
            mobile,
            message: fullMessage
          }
        ]
      },
      {
        headers: {
          Authorization: `Basic ${base64Auth}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("SMS sent:", response.data);
    console.log("Sending to:", mobile);
    console.log("Message:", fullMessage);
    console.log("Airtel response:", response.data);

    return response.data;
  } catch (error) {
    console.error("Failed to send SMS:", error.response?.data || error.message);
    console.error("Airtel SMS failed:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendAirtelSMS;

const axios = require("axios");

const sendMsg91SMS = async (mobile, driverName, vehicleName ) => {
  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      {
        flow_id: "6853f8b4d6fc0521bd27af62",
        sender: "INSTLS", // your DLT-approved Sender ID
        mobiles: mobile, // ensure 91 prefix without '+'
        var1: driverName,
        var2: vehicleName
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY, // put in your .env file
          "Content-Type": "application/json"
        }
      }
    );

    // console.log("MSG91 response:", response.data);
    return response.data;
  } catch (error) {
    console.error("MSG91 SMS failed:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendMsg91SMS;

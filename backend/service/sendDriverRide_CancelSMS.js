const axios = require("axios");

const sendDriverRide_CancelSMS = async (mobile, destination, time, customerName, vehicleName) => {
  try {
    // Log the variables being sent
    // console.log("Driver Ride Cancel SMS Variables:", {
    //   mobile,
    //   destination,
    //   time,
    //   customerName,
    //   vehicleName
    // });

    const payload = {
      flow_id: "6888c03ed6fc05045406b4c2", // Replace with your actual flow ID
      sender: "INSTLS",
      mobiles: mobile,
      // Template: "Your ride assignment has been cancelled. Destination: ##var1## at ##var2##. Customer: ##var3##, Vehicle: ##var4##. Institute of Life Sciences"
      // Note: Using ##var## format as specified
      var1: destination,     // ##var1## = Destination
      var2: time,           // ##var2## = Scheduled time
      var3: customerName,   // ##var3## = Customer name
      var4: vehicleName     // ##var4## = Vehicle name
    };

    console.log("Driver Ride Cancel SMS payload:", JSON.stringify(payload, null, 2));

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

    console.log("MSG91 driver ride cancel SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Driver Ride Cancel SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendDriverRide_CancelSMS;
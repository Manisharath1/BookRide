const axios = require("axios");

const sendRideMergeNotificationSMS = async (mobile, destination, scheduledTime, driverName, driverContact, vehicleName) => {
  try {
    // Log the variables being sent
    // console.log("Ride Merge Notification SMS Variables:", {
    //   mobile,
    //   destination,
    //   scheduledTime,
    //   driverName,
    //   driverContact,
    //   vehicleName
    // });

    const payload = {
      flow_id: "688227d0d6fc055421611672", // Replace with your actual flow ID for ride merge notifications
      sender: "INSTLS",
      mobiles: mobile,
      // For template: "Your ride has been merged with another ride to ##var1## at ##var2##. Driver: ##var3##, Contact: ##var4##, Vehicle Name: ##var5##. Institute of Life Sciences"
      var1: destination,     // ##var1## = Destination (primary booking's location)
      var2: scheduledTime,   // ##var2## = Scheduled time
      var3: driverName,      // ##var3## = Driver name
      var4: driverContact,   // ##var4## = Driver contact number
      var5: vehicleName      // ##var5## = Vehicle name
    };

    // console.log("Ride Merge Notification SMS payload:", JSON.stringify(payload, null, 2));

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

    // console.log("MSG91 ride merge notification SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Ride Merge Notification SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendRideMergeNotificationSMS;
const axios = require("axios");

const sendRide_UpdateNotificationSMS = async (mobile, destination, time, driverName, driverContact, vehicleName, pickupLocation) => {
  try {
    // Log the variables being sent
    console.log("Ride Update Notification SMS Variables:", {
      mobile,
      destination,
      time,
      driverName,
      driverContact,
      vehicleName,
      pickupLocation 
    });

    // Handle case where pickupLocation might be undefined/null for guest bookings
    // const displayPickupLocation = pickupLocation || "N/A";
    const destinationText = pickupLocation ? `${destination} (Pickup: ${pickupLocation})` : destination;

    const payload = {
      flow_id: "6888b69cd6fc05493951da22", // Replace with your actual flow ID
      sender: "INSTLS",
      mobiles: mobile,
      // Template: "Your ride details have been updated. Destination: ##var1## at ##var2##. Driver: ##var3##, Contact: ##var4##, Vehicle: ##var5##. Institute of Life Sciences"
      var1: destinationText,    // ##var1## = Destination (with pickup if available)
      var2: time,               // ##var2## = Scheduled time
      var3: driverName,         // ##var3## = Driver name
      var4: driverContact,      // ##var4## = Driver contact
      var5: vehicleName         // ##var5## = Vehicle name
    };

    console.log("Ride Update Notification SMS payload:", JSON.stringify(payload, null, 2));

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

    console.log("MSG91 ride update notification SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Ride Update Notification SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendRide_UpdateNotificationSMS;
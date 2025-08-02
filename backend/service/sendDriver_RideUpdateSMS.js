const axios = require("axios");

const sendDriver_RideUpdateSMS = async (mobile, destination, pickupLocation, time, customerName, customerContact, vehicleName) => {
  try {
    // Handle undefined/null pickupLocation
    let destinationText;
    if (pickupLocation && pickupLocation !== 'undefined' && pickupLocation.trim() !== '') {
      destinationText = `${destination} (Pickup: ${pickupLocation})`;
    } else {
      destinationText = destination;
    }

    const payload = {
      flow_id: "688ca7bea6afa70a843ab2e2", // Replace with your actual flow ID for driver ride updates
      sender: "INSTLS",
      mobiles: mobile,
      // Template: "Your ride assignment has been updated. Destination: ##var1## at ##var2##. Customer: ##var3##, Contact: ##var4##, Vehicle: ##var5##. Institute of Life Sciences"
      var1: destinationText,     // Destination (with pickup only if available)
      var2: time,                // Scheduled time
      var3: customerName,        // Customer name
      var4: customerContact,     // Customer contact number
      var5: vehicleName          // Vehicle name
    };

    console.log("Driver Ride Update SMS payload:", JSON.stringify(payload, null, 2));

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

    console.log("MSG91 driver ride update SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Driver Ride Update SMS:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendDriver_RideUpdateSMS;
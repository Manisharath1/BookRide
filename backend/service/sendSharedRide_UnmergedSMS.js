const sendSharedRide_UnmergedSMS = async (mobile, passengerName, scheduledTime) => {
  try {
    console.log("Shared Ride Unmerged SMS Variables:", {
      mobile,
      passengerName,
      scheduledTime
    });
    
    const payload = {
      flow_id: "6888b876d6fc05421e40cab2", // Replace with your actual flow ID
      sender: "INSTLS",
      mobiles: mobile,
      // Template: "Dear ##var1##, the shared ride scheduled at ##var2## has been unmerged. A new individual booking has been created for you. Institute of Life Sciences."
      var1: passengerName,    // ##var1## = Passenger name
      var2: scheduledTime     // ##var2## = Scheduled time
    };

    console.log("Shared Ride Unmerged SMS payload:", JSON.stringify(payload, null, 2));
    
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
    
    console.log("MSG91 shared ride unmerged SMS response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Shared Ride Unmerged SMS:", error.response?.data || error.message);
    throw error;
  }
};
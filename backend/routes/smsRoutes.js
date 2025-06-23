const express = require("express");
const router = express.Router();
const sendAirtelSMS = require("../service/sendAirtelSMS");

router.post("/send-sms", async (req, res) => {
  const { phone, driverName, vehicleName } = req.body;

  if (!phone || !driverName || !vehicleName) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const result = await sendAirtelSMS(phone, driverName, vehicleName);
    res.json({ message: "SMS sent successfully", result });
  } catch (error) {
    res.status(500).json({ error: "Failed to send SMS", details: error.message });
  }
});

module.exports = router;

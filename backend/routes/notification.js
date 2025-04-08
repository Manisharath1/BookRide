const authMiddleware = require("../middleware/authMiddleware");
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

router.post('/mark-read', authMiddleware, async (req, res) => {
    try {
      await Notification.updateMany(
        { userId: req.userId, read: false },
        { $set: { read: true } }
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });
  
  module.exports = router;
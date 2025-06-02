const express = require("express");
const { login, register, logout, verifyEmailOtp, sendEmailOtp, sendCustomOtp, verifyCustomOtp, verifyUsername, resetPassword } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const rateLimit = require('express-rate-limit');


const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-code", verifyEmailOtp);
router.post("/send-email", sendEmailOtp);
router.post('/send-otp', sendCustomOtp);
router.post('/verify-otp', verifyCustomOtp);

router.get("/user", authMiddleware, async (req, res) => { 
    try {
      // console.log("User ID:", req.userId); // Debugging log
  
      // Ensure req.userId exists
      if (!req.userId) {
        return res.status(400).json({ error: "User ID missing from request." });
      }
  
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
  
      res.json({ username: user.username, number: user.number });
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many reset password attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/verify-username', verifyUsername);
router.post('/reset-password',resetPasswordLimiter, resetPassword);




module.exports = router;
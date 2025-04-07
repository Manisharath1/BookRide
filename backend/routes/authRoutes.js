const express = require("express");
const { login, register, logout } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");


const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/user", authMiddleware, async (req, res) => { 
    try {
      // console.log("User ID:", req.userId); // Debugging log
  
      // Ensure req.userId exists
      if (!req.userId) {
        return res.status(400).json({ error: "User ID missing from request." });
      }
  
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
  
      res.json({ username: user.username });
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;
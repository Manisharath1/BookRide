const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register a new user
const register = async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login a user
const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Logout a user
const logout = async (req, res) => {
  try {
    // console.log('Authorization Header:', req.headers.authorization);

    let token = req.headers.authorization?.split(' ')[1];

    // If token is not found in the headers, check the request body
    if (!token && req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      console.log('No token found in authorization header or body');
      return res.status(401).json({ error: "No token provided" });
    }

    res.json({ message: "Logged out successfully." });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  register,
  login,
  logout
};
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const twilio = require('twilio');
const Otp = require('../models/Otp');
const sgMail = require('@sendgrid/mail');

const API_KEY = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL;

// Register a new user
const register = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, number, password, role } = req.body;

  const verifiedOtp = await Otp.findOne({ email, verified: true });
  if (!verifiedOtp) {
    return res.status(400).json({ error: 'Email not verified. Please verify your email before registering.' });
  }


  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email },
        { username },
        { number }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      if (existingUser.number === number) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    }

    // Validate email domain
    if (!email.endsWith('@ils.res.in')) {
      return res.status(400).json({ error: 'Only emails with ils.res.in domain are allowed' });
    }

    // Validate role
    if (role !== 'user' && role !== 'manager') {
      return res.status(400).json({ error: 'Invalid role' }); 
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await verifiedOtp.deleteOne(); // clean up OTP record
    res.status(201).json({ success: true, message: 'User registered successfully' });

    // Create new user
    const user = new User({
      username,
      email,
      number,
      password: hashedPassword,
      role
    });

    await user.save();

    return res.status(201).json({ 
      success: true,
      message: 'User registered successfully' 
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ 
      error: 'An error occurred during registration. Please try again.' 
    });
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

//mobile otp
const verifyCustomOtp = async (req, res) => {
  const { number, code } = req.body;

  const record = await Otp.findOne({ number });
  if (!record) return res.status(400).json({ error: 'OTP not found for this number' });

  if (record.expiresAt < Date.now()) {
    await Otp.deleteOne({ _id: record._id });
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (record.code !== code) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  record.verified = true;
  await record.save();

  return res.status(200).json({ success: true, message: 'Phone number verified' });
};

// const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); 
//mobile otp
const sendCustomOtp = async (req, res) => {
  const { number } = req.body;
  console.log("Incoming number:", number);

  if (!number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    console.log("Using FROM:", process.env.TWILIO_PHONE_NUMBER);
    console.log("Sending TO:", number);
    console.log("Generated OTP:", otp);

    const message = await client.messages.create({
      body: `Your ILS OTP is: ${otp}. It is valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: number
    });

    console.log("SMS sent. SID:", message.sid);

    // Clean up old OTPs
    await Otp.deleteMany({ number });

    // Store new OTP
    await Otp.create({
      number,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error("❌ OTP Send Error:", err.message);
    return res.status(500).json({ error: 'Failed to send OTP. Check console for details.' });
  }
};

//emailotp

const sendEmailOtp = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.endsWith('@ils.res.in')) {
    return res.status(400).json({ error: 'Valid ils.res.in email is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: 'Your ILS OTP Code',
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    // Remove any existing OTPs
    await Otp.deleteMany({ email });

    // Save new OTP
    await Otp.create({
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    return res.status(200).json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error("❌ SendGrid OTP error:", error.response?.body || error.message || error);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
};


const verifyEmailOtp = async (req, res) => {
  const { email, code } = req.body;

  const record = await Otp.findOne({ email });

  if (!record) return res.status(400).json({ error: 'OTP not found for this email' });
  if (record.expiresAt < Date.now()) {
    await Otp.deleteOne({ _id: record._id });
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (record.code !== code) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  record.verified = true;
  await record.save();

  res.status(200).json({ success: true, message: 'Email verified successfully' });
};

module.exports = {
  register,
  login,
  logout,
  verifyCustomOtp,
  sendCustomOtp,
  sendEmailOtp,
  verifyEmailOtp

};
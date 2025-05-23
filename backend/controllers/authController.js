const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const twilio = require('twilio');
const Otp = require('../models/Otp');
const sgMail = require('@sendgrid/mail');
const { sendOtpSMS, verifyOtp } = require('../utils/messageCentral');


// const API_KEY = process.env.SENDGRID_API_KEY;
// sgMail.setApiKey(API_KEY);
// const FROM_EMAIL = process.env.FROM_EMAIL;

// Register a new user
const register = async (req, res) => {
  const { username, email, number, password, role, googleId } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists. Please login.' });
    }

    // Validate ILS email
    if (!email.endsWith('@ils.res.in')) {
      return res.status(400).json({ error: 'Only emails with ils.res.in domain are allowed' });
    }

    let hashedPassword = '';

    // If NOT Google user, enforce OTP verification
    if (!googleId) {
      const verifiedOtp = await Otp.findOne({ number, verified: true });

      if (!verifiedOtp) {
        return res.status(400).json({ error: 'Please verify your phone number before registering.' });
      }
      await verifiedOtp.deleteOne();

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      hashedPassword = await bcrypt.hash(password, 10);
      await verifiedOtp.deleteOne(); // clear used OTP
    } else {
      // For Google users, still validate and hash password
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create user - store phone number for all users
    const user = new User({
      username,
      email,
      googleId: googleId || null,
      number, // Store phone number for both Google and regular users
      password: hashedPassword,
      role: role || 'user'
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
  try {
    const { number, code } = req.body;

    if (!code || !number) {
      return res.status(400).json({ error: 'Missing phone number or code' });
    }

    const otpRecord = await Otp.findOne({ number });

    if (!otpRecord || !otpRecord.verificationId) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    // Call MessageCentral validation API
    const response = await verifyOtp(otpRecord.verificationId, code);

    if (response?.data?.verificationStatus === 'VERIFICATION_COMPLETED') {
      otpRecord.verified = true;
      await otpRecord.save();
      return res.status(200).json({ message: 'OTP verified successfully' });
    } else {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

  } catch (err) {
    console.error('OTP verification failed:', err?.response?.data || err.message || err);
    res.status(500).json({ error: 'Internal Server Error during OTP verification' });
  }
};

//mobile otp
const sendCustomOtp = async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: "Phone number is required" });

    // Send OTP via MessageCentral
    const verificationId = await sendOtpSMS(number);

    // Store in DB
    await Otp.findOneAndUpdate(
      { number },
      { verificationId, createdAt: new Date(), verified: false },
      { upsert: true }
    );

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP send error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};
// const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); 

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
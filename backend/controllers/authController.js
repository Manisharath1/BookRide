const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { hash } = require('bcryptjs');
// const twilio = require('twilio');
// const Otp = require('../models/Otp');
// // const sgMail = require('@sendgrid/mail');
// const { sendOtpSMS, verifyOtp } = require('../utils/messageCentral');


// const API_KEY = process.env.SENDGRID_API_KEY;
// sgMail.setApiKey(API_KEY);
// const FROM_EMAIL = process.env.FROM_EMAIL;

// Register a new user
// const register = async (req, res) => {
//   const { username, email, number, password, role, googleId } = req.body;

//   try {
//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ error: 'User already exists. Please login.' });
//     }

//     // Validate ILS email
//     if (!email.endsWith('@ils.res.in')) {
//       return res.status(400).json({ error: 'Only emails with ils.res.in domain are allowed' });
//     }

//     let hashedPassword = '';

//     // If NOT Google user, enforce OTP verification
//     if (!googleId) {
//       const verifiedOtp = await Otp.findOne({ number, verified: true });

//       if (!verifiedOtp) {
//         return res.status(400).json({ error: 'Please verify your phone number before registering.' });
//       }
//       await verifiedOtp.deleteOne();

//       if (!password || password.length < 6) {
//         return res.status(400).json({ error: 'Password must be at least 6 characters' });
//       }

//       hashedPassword = await bcrypt.hash(password, 10);
//       await verifiedOtp.deleteOne(); // clear used OTP
//     } else {
//       // For Google users, still validate and hash password
//       if (!password || password.length < 6) {
//         return res.status(400).json({ error: 'Password must be at least 6 characters' });
//       }
//       hashedPassword = await bcrypt.hash(password, 10);
//     }

//     // Create user - store phone number for all users
//     const user = new User({
//       username,
//       email,
//       googleId: googleId || null,
//       number, // Store phone number for both Google and regular users
//       password: hashedPassword,
//       role: role || 'user'
//     });

//     await user.save();

//     return res.status(201).json({
//       success: true,
//       message: 'User registered successfully'
//     });

//   } catch (err) {
//     console.error('Registration error:', err);
//     return res.status(500).json({
//       error: 'An error occurred during registration. Please try again.'
//     });
//   }
// };

const register = async (req, res) => {
  const { username, email, number, password } = req.body;
  
  try {
    // Log the registration attempt (remove in production)
    console.log('Registration attempt:', { username, email, phoneNumber: number?.substring(0, 5) + '...' });
    
    // Input validation
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    // Validate ILS email
    if (!email.endsWith('@ils.res.in')) {
      return res.status(400).json({ error: 'Only emails with ils.res.in domain are allowed' });
    }
    if (!number || number.length < 10) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists by email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if user already exists by username
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if phone number already exists
    const existingUserByPhone = await User.findOne({ number });
    if (existingUserByPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with default role 'user'
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      number,
      password: hashedPassword
      // role will default to 'user' automatically
    });

    await user.save();

    console.log('User registered successfully:', username);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully'
    });

  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        error: `Validation failed: ${errors.join(', ')}`
      });
    }
    
    // Handle duplicate key errors (if you have unique indexes)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        error: `This ${field} is already registered`
      });
    }

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

    await autoCompleteBookings();
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
// const verifyCustomOtp = async (req, res) => {
//   try {
//     const { number, code } = req.body;

//     if (!code || !number) {
//       return res.status(400).json({ error: 'Missing phone number or code' });
//     }

//     const otpRecord = await Otp.findOne({ number });

//     if (!otpRecord || !otpRecord.verificationId) {
//       return res.status(400).json({ error: 'OTP not found or expired' });
//     }

//     // Call MessageCentral validation API
//     const response = await verifyOtp(otpRecord.verificationId, code);

//     if (response?.data?.verificationStatus === 'VERIFICATION_COMPLETED') {
//       otpRecord.verified = true;
//       await otpRecord.save();
//       return res.status(200).json({ message: 'OTP verified successfully' });
//     } else {
//       return res.status(400).json({ error: 'Invalid or expired OTP' });
//     }

//   } catch (err) {
//     console.error('OTP verification failed:', err?.response?.data || err.message || err);
//     res.status(500).json({ error: 'Internal Server Error during OTP verification' });
//   }
// };

// //mobile otp
// const sendCustomOtp = async (req, res) => {
//   try {
//     const { number } = req.body;
//     if (!number) return res.status(400).json({ error: "Phone number is required" });

//     // Send OTP via MessageCentral
//     const verificationId = await sendOtpSMS(number);

//     // Store in DB
//     await Otp.findOneAndUpdate(
//       { number },
//       { verificationId, createdAt: new Date(), verified: false },
//       { upsert: true }
//     );

//     res.json({ message: 'OTP sent successfully' });
//   } catch (err) {
//     console.error('OTP send error:', err);
//     res.status(500).json({ error: 'Failed to send OTP' });
//   }
// };
// // const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); 

// //emailotp
// const sendEmailOtp = async (req, res) => {
//   const { email } = req.body;

//   if (!email || !email.endsWith('@ils.res.in')) {
//     return res.status(400).json({ error: 'Valid ils.res.in email is required' });
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   try {
//     await sgMail.send({
//       to: email,
//       from: FROM_EMAIL,
//       subject: 'Your ILS OTP Code',
//       text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
//     });

//     // Remove any existing OTPs
//     await Otp.deleteMany({ email });

//     // Save new OTP
//     await Otp.create({
//       email,
//       code: otp,
//       expiresAt: new Date(Date.now() + 5 * 60 * 1000)
//     });

//     return res.status(200).json({ success: true, message: 'OTP sent to your email' });
//   } catch (error) {
//     console.error("❌ SendGrid OTP error:", error.response?.body || error.message || error);
//     return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
//   }
// };

// const verifyEmailOtp = async (req, res) => {
//   const { email, code } = req.body;

//   const record = await Otp.findOne({ email });

//   if (!record) return res.status(400).json({ error: 'OTP not found for this email' });
//   if (record.expiresAt < Date.now()) {
//     await Otp.deleteOne({ _id: record._id });
//     return res.status(400).json({ error: 'OTP has expired' });
//   }

//   if (record.code !== code) {
//     return res.status(400).json({ error: 'Invalid OTP' });
//   }

//   record.verified = true;
//   await record.save();

//   res.status(200).json({ success: true, message: 'Email verified successfully' });
// };

const verifyUsername = async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });
  
  try {
      const user = await findOne({ username });
      if (!user) return res.status(404).json({ message: 'Username not found' });

      return res.status(200).json({ message: 'Username verified' });
  } catch (err) {
      return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) return res.status(400).json({ message: 'All fields are required' }); 
  try {
    const user = await findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const salt = await genSalt(10);
    user.password = await hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

const updateProfile = async(req, res) => {
  try {
    const { username, number } = req.body;
    const userId = req.userId; // ✅ Changed from req.user.id to req.userId

    console.log('Update request:', { username, number, userId }); // Debug log

    // Basic validation
    if (!username || !number) {
      return res.status(400).json({
        message: 'Username and phone number are required'
      });
    }

    // Clean inputs
    const cleanUsername = username.trim();
    const cleanNumber = number.replace(/\s+/g, '');

    // Validate phone number (10-15 digits)
    if (!/^[0-9]{10,15}$/.test(cleanNumber)) {
      return res.status(400).json({
        message: 'Phone number must be 10-15 digits'
      });
    }

    // Check if username exists (excluding current user)
    const existingUsername = await User.findOne({
      username: cleanUsername,
      _id: { $ne: userId }
    });

    if (existingUsername) {
      return res.status(409).json({
        message: 'Username already exists'
      });
    }

    // Check if number exists (excluding current user)
    const existingNumber = await User.findOne({
      number: cleanNumber,
      _id: { $ne: userId }
    });

    if (existingNumber) {
      return res.status(409).json({
        message: 'Phone number already exists'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        username: cleanUsername, 
        number: cleanNumber 
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    console.log('Profile updated successfully for user:', userId); // Debug log

    res.status(200).json({
      message: 'Profile updated successfully',
      username: updatedUser.username,
      number: updatedUser.number
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      message: 'Server error. Please try again later.'
    });
  }
};
module.exports = {
  register,
  login,
  logout,
  // verifyCustomOtp,
  // sendCustomOtp,
  // sendEmailOtp,
  // verifyEmailOtp,
  verifyUsername,
  resetPassword,
  updateProfile

};
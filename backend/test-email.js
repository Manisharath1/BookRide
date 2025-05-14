// require('dotenv').config();
// const sgMail = require('@sendgrid/mail');

// const API_KEY = process.env.SENDGRID_API_KEY;
// const FROM_EMAIL = process.env.FROM_EMAIL;

// console.log("🔍 SENDGRID_API_KEY loaded?", !!API_KEY);
// console.log("🔍 FROM_EMAIL =", FROM_EMAIL);

// sgMail.setApiKey(API_KEY);

// const msg = {
//   to: FROM_EMAIL, // send to yourself
//   from: FROM_EMAIL,
//   subject: '✅ Testing SendGrid OTP from ILS',
//   text: 'This is a test message from BookRide using SendGrid email verification.',
// };

// sgMail
//   .send(msg)
//   .then(() => {
//     console.log('✅ Email sent successfully!');
//   })
//   .catch((error) => {
//     console.error('❌ SendGrid Test Error:', error.response?.body || error.message || error);
//   });


// Run this script once (in your Node.js backend or a separate script file)

// Import Booking model
// const mongoose = require('mongoose');
// const Booking = require('./models/Booking'); // <- adjust the path to your model

// const MONGO_URI = "mongodb+srv://rathmanisha631:rqZninCTZxjZgPii@cluster0.6kywv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // 🔥 Replace with your Mongo URI

// const repairPassengerNumbers = async () => {
//   try {
//     await mongoose.connect(MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true
//     });
//     console.log("✅ Connected to MongoDB.");

//     const bookings = await Booking.find({
//       passengers: { $exists: true, $not: { $size: 0 } }
//     });

//     console.log(`📦 Found ${bookings.length} bookings.`);

//     for (const booking of bookings) {
//       let updated = false;

//       const newPassengers = booking.passengers.map(passenger => {
//         if (passenger.number && !passenger.number.startsWith('+91')) {
//           updated = true;
//           return {
//             ...passenger,
//             number: '+91' + passenger.number.replace(/\D/g, '')
//           };
//         }
//         return passenger;
//       });

//       if (updated) {
//         booking.passengers = newPassengers;
//         await booking.save();
//         console.log(`✏️ Updated booking ID: ${booking._id}`);
//       }
//     }

//     console.log("🏁 Repair completed.");
//     process.exit(0);
//   } catch (error) {
//     console.error("❌ Error:", error.message);
//     process.exit(1);
//   }
// };

// // Call the function
// repairPassengerNumbers();

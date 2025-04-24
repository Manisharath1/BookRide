require('dotenv').config();
const sgMail = require('@sendgrid/mail');

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

console.log("🔍 SENDGRID_API_KEY loaded?", !!API_KEY);
console.log("🔍 FROM_EMAIL =", FROM_EMAIL);

sgMail.setApiKey(API_KEY);

const msg = {
  to: FROM_EMAIL, // send to yourself
  from: FROM_EMAIL,
  subject: '✅ Testing SendGrid OTP from ILS',
  text: 'This is a test message from BookRide using SendGrid email verification.',
};

sgMail
  .send(msg)
  .then(() => {
    console.log('✅ Email sent successfully!');
  })
  .catch((error) => {
    console.error('❌ SendGrid Test Error:', error.response?.body || error.message || error);
  });

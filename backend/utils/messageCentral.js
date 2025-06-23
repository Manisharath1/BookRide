const axios = require('axios');
require('dotenv').config();

let authToken = null;

async function getToken() {
  const response = await axios.get(`${process.env.MESSAGE_CENTRAL_API_BASE}/auth/v1/authentication/token`, {
    params: {
      customerId: process.env.MESSAGE_CENTRAL_CUSTOMER_ID,
      key: process.env.MESSAGE_CENTRAL_KEY,
      scope: process.env.MESSAGE_CENTRAL_SCOPE,
      country: 91 // for India
    }
  });

  if (response.data.token) {
    authToken = response.data.token;
    return authToken;
  } else {
    throw new Error('Unable to fetch token from MessageCentral');
  }
};

async function sendOtpSMS(number) {
  if (!authToken) await getToken();

  const response = await axios.post(
    `${process.env.MESSAGE_CENTRAL_API_BASE}/verification/v3/send`,
    {},
    {
      params: {
        countryCode: '91',
        flowType: 'SMS',
        mobileNumber: number.replace('+91', ''),
        otpLength: 6
      },
      headers: {
        authToken
      }
    }
  );

  return response.data.data.verificationId;
};

async function verifyOtp(verificationId, code) {
    if (!authToken) await getToken();
  
    const response = await axios.get(
      `${process.env.MESSAGE_CENTRAL_API_BASE}/verification/v3/validateOtp`,
      {
        params: {
          verificationId,
          code
        },
        headers: {
          authToken
        }
      }
    );
  
    return response.data;
};

async function sendTransactionalSMS(number, messageText) {
  if (!authToken) await getToken();

  const sanitizedNumber = number.replace(/\D/g, '').replace(/^91/, '');
  console.log("📤 Sending SMS to:", sanitizedNumber, "| Message:", messageText);

  const response = await axios.post(
    `${process.env.MESSAGE_CENTRAL_API_BASE}/verification/v3/send`,
    {},
    {
      params: {
        countryCode: '91',
        flowType: 'SMS',
        mobileNumber: sanitizedNumber,
        type: 'SMS',
        messageType: 'TRANSACTIONAL',
        senderId: process.env.MESSAGE_CENTRAL_SENDER_ID,
        message: messageText
      },
      headers: {
        authToken
      }
    }
  );

  const data = response.data;
  console.log("📩 SMS Response:", data); 
  return data;
}


  

module.exports = {
  sendOtpSMS,
  verifyOtp,
  sendTransactionalSMS
};

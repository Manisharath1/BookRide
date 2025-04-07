const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();
console.log("Your VAPID Keys: 🔑");
console.log("Public Key:\n", vapidKeys.publicKey);
console.log("Private Key:\n", vapidKeys.privateKey);

require('dotenv').config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function check() {
    try {
        const call = await client.calls('CA96e5242c3718e1b40b1d8b9e31b54866').fetch();
        console.log("Call Status:", call.status);
        
        const notifications = await client.calls('CA96e5242c3718e1b40b1d8b9e31b54866').notifications.list({limit: 5});
        if (notifications.length === 0) {
           console.log("No specific Twilio errors found. Twilio tried to ring the client.");
        } else {
           notifications.forEach(n => console.log("Twilio Error:", n.errorCode, n.messageText));
        }
    } catch(e) { console.error(e); }
}
check();

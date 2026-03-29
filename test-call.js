require('dotenv').config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

console.log("Initiating direct test call to agent1...");

client.calls
  .create({
     to: 'client:agent1',                     // Call the browser Directly!
     from: process.env.TWILIO_ITALIAN_NUMBER, // Appears as coming from your system Let's bypass PSTN entirely.
     twiml: '<Response><Say voice="woman" language="it-IT">Sorpresa! La connessione diretta al tuo computer funziona perfettamente! Usa questa funzione per chiamare i tuoi agenti dal server.</Say></Response>'
   })
  .then(call => {
      console.log("✅ Success! Twilio is connecting directly to agent1.");
      console.log("Call SID:", call.sid);
      console.log("Look at your browser tab at http://localhost:5173 — it should be ringing immediately!");
  })
  .catch(err => {
      console.error("❌ Failed to initiate call:");
      console.error(err);
  });

const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const AGENTS = [
  { id: "agent1", name: "Youssef", password: "pass1", role: "agent" },
  { id: "agent2", name: "Karim",   password: "pass2", role: "agent" },
  { id: "agent3", name: "Sara",    password: "pass3", role: "agent" },
  { id: "agent4", name: "LAARBI",  password: "adminpass", role: "admin" }
];

router.post('/login', (req, res) => {
  const { id, password } = req.body;
  const agent = AGENTS.find(a => a.id === id && a.password === password);
  
  if (!agent) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Ensure TWILIO enav variables match your Twilio Console mapping
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioApiKey = process.env.TWILIO_API_KEY;
  const twilioApiSecret = process.env.TWILIO_API_SECRET;
  const outgoingApplicationSid = process.env.TWILIO_TWIML_APP_SID;

  if(!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
    return res.status(500).json({ error: 'Server misconfigured. Missing Twilio keys.' });
  }

  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    { identity: id }
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: outgoingApplicationSid,
    incomingAllow: true,
  });

  token.addGrant(voiceGrant);
  const jwt = token.toJwt();

  res.json({
    token: jwt,
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role
    }
  });
});

router.get('/list', (req, res) => {
  const safeList = AGENTS.map(a => ({ id: a.id, name: a.name, role: a.role }));
  res.json(safeList);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const presenceService = require('../services/presence');
const { getDb } = require('../services/db');
const voicemailService = require('../services/voicemail');

// ──────────────────────────────────────────────────────────────────────────────
// POST /twilio/incoming
// Called by Twilio when a new call arrives on the Italian number.
// Logs the call, then dials the first available online agent.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/incoming', (req, res) => {
  const onlineAgents = presenceService.getOnlineAgents();
  const firstAgent   = onlineAgents[0];
  const twiml        = new twilio.twiml.VoiceResponse();
  const callerNumber = req.body.From || 'Unknown';
  const callSid      = req.body.CallSid || Date.now().toString();

  // Insert initial call record
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR IGNORE INTO calls (id, caller_number, status) VALUES (?, ?, 'incoming')`
    ).run(callSid, callerNumber);
  } catch (err) {
    console.error('DB: Failed to log incoming call:', err);
  }

  if (!firstAgent) {
    // No agents online → straight to voicemail
    twiml.redirect('/twilio/voicemail');
    return res.type('text/xml').send(twiml.toString());
  }

  const dial = twiml.dial({
    timeout:  15,
    action:   `/twilio/fallback?attempt=1&tried=${firstAgent}`,
    callerId: process.env.TWILIO_ITALIAN_NUMBER
  });
  dial.client(firstAgent);

  console.log(`Routing call ${callSid} from ${callerNumber} → ${firstAgent}`);
  res.type('text/xml').send(twiml.toString());
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /twilio/fallback
// Called by Twilio when a dial attempt ends (no-answer, busy, failed).
// Finds the next untried online agent; if none, routes to voicemail.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/fallback', (req, res) => {
  const dialStatus  = req.body.DialCallStatus; // 'completed' | 'no-answer' | 'busy' | 'failed'
  const triedAgent  = req.query.tried || '';
  const attempt     = parseInt(req.query.attempt, 10) || 1;
  const callSid     = req.body.CallSid;
  const twiml       = new twilio.twiml.VoiceResponse();

  // Call was answered — update DB and hang up cleanly
  if (dialStatus === 'completed') {
    try {
      const db = getDb();
      db.prepare(
        `UPDATE calls SET agent_id = ?, duration = ?, status = 'answered' WHERE id = ?`
      ).run(triedAgent, parseInt(req.body.DialCallDuration, 10) || 0, callSid);
    } catch (err) {
      console.error('DB: Failed to update answered call:', err);
    }
    return res.type('text/xml').send(twiml.toString()); // empty TwiML = hang up
  }

  // Call was NOT answered — find the next available online agent
  const onlineAgents  = presenceService.getOnlineAgents();
  const currentIndex  = onlineAgents.indexOf(triedAgent);

  // All tried agents come from query string (CSV to handle multiple attempts)
  const triedList     = req.query.triedList ? req.query.triedList.split(',') : [triedAgent];
  const nextAgent     = onlineAgents.find(id => !triedList.includes(id));

  console.log(
    `Fallback attempt ${attempt}: tried=${triedAgent}, dialStatus=${dialStatus}, next=${nextAgent || 'voicemail'}`
  );

  if (!nextAgent) {
    // Exhausted all online agents → voicemail
    voicemailService.markMissed(callSid);
    twiml.redirect('/twilio/voicemail');
    return res.type('text/xml').send(twiml.toString());
  }

  const updatedTriedList = [...triedList, nextAgent].join(',');
  const dial = twiml.dial({
    timeout:  15,
    action:   `/twilio/fallback?attempt=${attempt + 1}&tried=${nextAgent}&triedList=${updatedTriedList}`,
    callerId: process.env.TWILIO_ITALIAN_NUMBER
  });
  dial.client(nextAgent);

  res.type('text/xml').send(twiml.toString());
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /twilio/voicemail
// Plays Italian message and records up to 60 seconds.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/voicemail', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say(
    { language: 'it-IT', voice: 'Polly.Bianca' },
    'Tutti gli operatori sono al momento occupati. ' +
    'La preghiamo di lasciare un messaggio dopo il segnale. Grazie.'
  );

  twiml.record({
    maxLength:   60,
    action:      '/twilio/voicemail-saved',
    transcribe:  false,
    playBeep:    true
  });

  // Fallback if caller hangs up without recording
  twiml.say({ language: 'it-IT', voice: 'Polly.Bianca' }, 'Grazie. Arrivederci.');

  res.type('text/xml').send(twiml.toString());
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /twilio/voicemail-saved
// Twilio calls this once the recording is complete with the recording URL.
// ──────────────────────────────────────────────────────────────────────────────
router.post('/voicemail-saved', (req, res) => {
  const callSid           = req.body.CallSid;
  const callerNumber      = req.body.From || 'Unknown';
  const recordingUrl      = req.body.RecordingUrl;
  const recordingDuration = parseInt(req.body.RecordingDuration, 10) || 0;

  voicemailService.saveVoicemail({ callSid, callerNumber, recordingUrl, recordingDuration });

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ language: 'it-IT', voice: 'Polly.Bianca' }, 'Il suo messaggio è stato registrato. Arrivederci.');
  res.type('text/xml').send(twiml.toString());
});

module.exports = router;

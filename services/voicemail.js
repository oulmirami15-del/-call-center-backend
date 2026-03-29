const { getDb } = require('./db');

/**
 * Save a voicemail recording to the database
 * Called from /twilio/voicemail-saved webhook
 */
function saveVoicemail({ callSid, callerNumber, recordingUrl, recordingDuration }) {
  try {
    const db = getDb();
    // Update the existing call row (inserted on /incoming) or insert new
    const existing = db.prepare('SELECT id FROM calls WHERE id = ?').get(callSid);
    if (existing) {
      db.prepare(`
        UPDATE calls
        SET status = 'voicemail', voicemail_url = ?, duration = ?
        WHERE id = ?
      `).run(recordingUrl, recordingDuration || 0, callSid);
    } else {
      db.prepare(`
        INSERT INTO calls (id, caller_number, status, voicemail_url, duration)
        VALUES (?, ?, 'voicemail', ?, ?)
      `).run(callSid, callerNumber || 'Unknown', recordingUrl, recordingDuration || 0);
    }
    console.log('Voicemail saved for call:', callSid);
  } catch (err) {
    console.error('Error saving voicemail:', err);
  }
}

/**
 * Mark a call as missed (all agents failed to answer)
 */
function markMissed(callSid) {
  try {
    const db = getDb();
    db.prepare(`UPDATE calls SET status = 'missed' WHERE id = ? AND status = 'incoming'`)
      .run(callSid);
  } catch (err) {
    console.error('Error marking missed:', err);
  }
}

module.exports = { saveVoicemail, markMissed };

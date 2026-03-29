const express = require('express');
const router = express.Router();
const { getDb } = require('../services/db');

// Middleware to check basic role if we want to protect endpoints
// Since this is a simple app, we can just allow the frontend to fetch logs or pass agentId explicitly

router.get('/history', (req, res) => {
  try {
    const db = getDb();
    const calls = db.prepare(`SELECT * FROM calls ORDER BY timestamp DESC LIMIT 100`).all();
    res.json(calls);
  } catch(err) {
    console.error('Failed fetching history:', err);
    res.status(500).json({ error: 'DB Error' });
  }
});

// Admin-only stats
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    // basic daily counts
    const todayStats = db.prepare(`SELECT COUNT(*) as count FROM calls WHERE date(timestamp) = date('now')`).get();
    const missedStats = db.prepare(`SELECT COUNT(*) as count FROM calls WHERE status = 'missed' OR status = 'voicemail'`).get();
    const totalCalls = db.prepare(`SELECT COUNT(*) as count FROM calls`).get();
    
    res.json({
        today: todayStats.count,
        missed: missedStats.count,
        total: totalCalls.count
    });
  } catch(err) {
    console.error('Failed fetching stats:', err);
    res.status(500).json({ error: 'DB Error' });
  }
});

module.exports = router;

-- call-center/backend/db/schema.sql
CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    caller_number TEXT NOT NULL DEFAULT 'Unknown',
    agent_id TEXT,
    duration INTEGER,
    status TEXT, -- 'answered', 'missed', 'voicemail'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    voicemail_url TEXT
);

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db;

function initDb() {
  const dbPath = path.join(__dirname, '../db/callcenter.db');
  db = new Database(dbPath);
  
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  db.exec(schema);
  console.log('Database initialized');
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized call initDb first');
  }
  return db;
}

module.exports = { initDb, getDb };

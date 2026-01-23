
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = "E:\\psychotherapy-appointment-sys\\psy-backend\\database.sqlite";
console.log('Connecting to database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

db.serialize(() => {
  // 1. Add calendar_token column to users table
  db.run(`ALTER TABLE users ADD COLUMN calendar_token TEXT`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('calendar_token column already exists.');
      } else {
        console.error('Error adding calendar_token column:', err.message);
      }
    } else {
      console.log('calendar_token column added successfully.');
    }
  });

  // 2. Generate tokens for existing doctors
  db.all(`SELECT id FROM users WHERE role = 'doctor' AND (calendar_token IS NULL OR calendar_token = '')`, [], (err, rows) => {
    if (err) {
      console.error('Error fetching doctors:', err.message);
      return;
    }

    console.log(`Found ${rows.length} doctors without calendar tokens.`);
    
    rows.forEach((row) => {
      const token = crypto.randomBytes(16).toString('hex');
      db.run(`UPDATE users SET calendar_token = ? WHERE id = ?`, [token, row.id], (updateErr) => {
        if (updateErr) {
          console.error(`Error updating token for doctor ${row.id}:`, updateErr.message);
        } else {
          console.log(`Generated token for doctor ${row.id}: ${token}`);
        }
      });
    });
  });
});

// Close the database connection after a short delay to allow updates to finish
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    console.log('Database connection closed.');
  });
}, 2000);

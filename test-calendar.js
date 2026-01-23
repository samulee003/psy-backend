
const axios = require('axios');

async function testCalendarFeed() {
  try {
    // 1. Get token for doctor 2 (the one we generated earlier)
    const token = '3648c2c147c0aa0590e6e48ba896a414';
    const url = `http://localhost:3000/api/calendar/feed/${token}`;
    
    console.log(`Testing calendar feed at: ${url}`);
    
    // Note: We need the server to be running.
    // Since I can't easily start the server and wait, I'll simulate the call by calling the controller directly if I can, 
    // or just assume it works if the syntax is correct.
    // Actually, I'll just check if the routes are correctly registered by reading the app.js or server.js
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// I'll run a quick check on the controller logic by creating a dummy db object
const calendarController = require('./controllers/calendarController');

const mockDb = {
  get: (query, params, callback) => {
    console.log('Mock DB GET:', query, params);
    callback(null, { id: 2, name: '測試醫生' });
  },
  all: (query, params, callback) => {
    console.log('Mock DB ALL:', query, params);
    callback(null, [
      { id: 1, date: '2026-01-25', time: '10:00', patient_name: '測試患者', notes: '感冒' }
    ]);
  }
};

const req = { params: { token: '3648c2c147c0aa0590e6e48ba896a414' } };
const res = {
  setHeader: (name, value) => console.log(`Header: ${name} = ${value}`),
  status: (code) => ({ send: (msg) => console.log(`Status ${code}: ${msg}`) }),
  send: (body) => {
    console.log('Response body start:');
    console.log(body.substring(0, 200));
    console.log('--- End of body ---');
  }
};

const controller = calendarController(mockDb);
controller.getCalendarFeed(req, res);

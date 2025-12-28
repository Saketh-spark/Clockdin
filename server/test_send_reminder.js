const fetch = require('node-fetch');
const base = 'http://localhost:5000';

async function main(){
  // try to register a user with a known email
  const email = 'testreminder@example.com';
  const password = 'Test1234!';
  const name = 'Test Reminder';

  try {
    // register (ignore errors if exists)
    await fetch(`${base}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    }).then(r => r.json()).catch(()=>{});

    // login
    const loginRes = await fetch(`${base}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) {
      console.error('Login failed', loginData);
      process.exit(1);
    }
    const token = loginData.token;

    // create event 6 minutes from now
    const eventDate = new Date(Date.now() + 6 * 60 * 1000);
    const dateStr = eventDate.toISOString().slice(0,10);
    const hours = eventDate.getHours().toString().padStart(2,'0');
    const minutes = eventDate.getMinutes().toString().padStart(2,'0');
    const timeStr = `${hours}:${minutes}`;

    const eventPayload = {
      title: 'Test Reminder Event',
      description: 'This is a test',
      date: dateStr,
      time: timeStr,
      location: 'Online',
      category: 'test',
      reminder: '5 minutes before'
    };

    const res = await fetch(`${base}/api/users/myevents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body: JSON.stringify(eventPayload)
    });

    const body = await res.json();
    console.log('Created myEvents response:', body);

  } catch (err) {
    console.error('Test script error', err);
  }
}

main();

import bcrypt from 'bcryptjs';

const API_BASE = 'http://localhost:5000/api';

async function testAuth() {
  console.log('--- TESTING AUTH FLOW ---');

  // Test 1: Signup with mixed case & spaces in email
  const rawEmail = `  UniqueStudent_${Date.now()}@Example.COM  `;
  const password = 'MyPassword123!';
  const name = 'Unique Student';

  console.log('Signing up with raw email:', JSON.stringify(rawEmail));
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email: rawEmail,
      password,
      college: 'Test College',
      branch: 'CS',
      semester: 'Semester 1'
    })
  });
  const signupData = await signupRes.json();
  console.log('Signup result status:', signupRes.status, 'User:', signupData.user);

  // Test 2: Login with lowercase trimmed email
  const loginEmail1 = rawEmail.trim().toLowerCase();
  console.log('Logging in with lowercase email:', JSON.stringify(loginEmail1));
  const loginRes1 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: loginEmail1,
      password
    })
  });
  const loginData1 = await loginRes1.json();
  console.log('Login 1 status:', loginRes1.status, 'Success:', loginData1.success, 'Error:', loginData1.error);

  // Test 3: Login with uppercase / spaced email
  console.log('Logging in with unnormalized email:', JSON.stringify(rawEmail));
  const loginRes2 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: rawEmail,
      password
    })
  });
  const loginData2 = await loginRes2.json();
  console.log('Login 2 status:', loginRes2.status, 'Success:', loginData2.success, 'Error:', loginData2.error);

  // Test 4: Login with WRONG password
  console.log('Logging in with wrong password...');
  const loginRes3 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: loginEmail1,
      password: 'WrongPassword999!'
    })
  });
  const loginData3 = await loginRes3.json();
  console.log('Login 3 (wrong password) status:', loginRes3.status, 'Error message:', loginData3.error);
}

testAuth().catch(console.error);

import fetch from 'node-fetch';

async function testCreateUser() {
  const username = `testuser_${Date.now()}`;
  const password = 'password123';
  const role = 'manager';

  console.log(`Testing create-user API for ${username}...`);

  try {
    // 1. Create User without explicit email to test auto-generation
    console.log('Test 1: Auto-generated email (@pmsy.com)');
    const response = await fetch('http://localhost:3001/api/auth/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        role,
        full_name: 'Test User Auto Email'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('User Email:', result.user?.email);
    
    if (result.user?.email !== `${username}@pmsy.com`) {
        console.error('FAIL: Email mismatch! Expected @pmsy.com');
    } else {
        console.log('PASS: Email domain correct.');
    }

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testCreateUser();

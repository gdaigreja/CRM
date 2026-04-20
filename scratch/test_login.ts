import fetch from 'node-fetch';

async function testLogin() {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@resolveprev.com.br',
      password: 'admin123',
      operation: 'resolve'
    }),
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Data:', data);
}

testLogin();

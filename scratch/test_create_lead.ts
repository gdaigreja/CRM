import fetch from 'node-fetch';

async function testCreateLead() {
  // 1. Login to get token
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@resolveprev.com.br',
      password: 'admin123',
      operation: 'resolve'
    }),
  });

  const { token } = await loginRes.json();
  console.log('Logged in, token received.');

  // 2. Create lead
  const createRes = await fetch('http://localhost:3000/api/leads', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Test Multi-Tenant Lead',
      phone: '11999999999',
      status: 'Novo'
    }),
  });

  const data = await createRes.json();
  console.log('Status:', createRes.status);
  console.log('Data:', data);
}

testCreateLead();

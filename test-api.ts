import axios from 'axios';

async function testApi() {
  console.log('Logging in...');
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@crm.com', // Known from SQL setup/mock users
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log('Token received:', token.substring(0, 10) + '...');

    console.log('Fetching leads from API...');
    const leadsRes = await axios.get('http://localhost:3000/api/leads', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Leads received:', leadsRes.data.length);
    console.log('Sample Lead:', leadsRes.data[0]?.name || 'No leads');
  } catch (err: any) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

testApi();

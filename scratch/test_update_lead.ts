import dotenv from 'dotenv';

dotenv.config();

const API_URL = "http://localhost:3000";
const EMAIL = "gdaigreja@gmail.com";
const PASSWORD = "123456"; // Or their production password if Supabase is connected

async function testUpdateLead() {
  try {
    console.log("1. Logging in...");
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, operation: 'resolve' })
    });

    if (!loginRes.ok) {
      const err = await loginRes.json();
      console.error("Login failed:", err);
      return;
    }

    const { token } = await loginRes.json();
    console.log("Logged in successfully.");

    console.log("2. Fetching leads...");
    const leadsRes = await fetch(`${API_URL}/api/leads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const leads = await leadsRes.json();
    
    if (leads.length === 0) {
      console.log("No leads found to test.");
      return;
    }

    const lead = leads[0];
    console.log(`Found lead: ${lead.name} (ID: ${lead.id}) with status: ${lead.status}`);

    const newStatus = lead.status === 'Novo' ? 'Em Atendimento' : 'Novo';
    console.log(`3. Updating lead to status: ${newStatus}...`);
    
    const updateRes = await fetch(`${API_URL}/api/leads/${lead.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...lead, status: newStatus })
    });

    if (updateRes.ok) {
      const updatedLead = await updateRes.json();
      console.log(`Lead updated successfully! New status: ${updatedLead.status}`);
    } else {
      const err = await updateRes.json();
      console.error("Update failed:", err);
    }

  } catch (e) {
    console.error("Test error:", e);
  }
}

testUpdateLead();

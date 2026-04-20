import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");

async function checkTables() {
  console.log("Checking users...");
  const { data: users, error: uErr } = await supabase.from('users').select('id, name, email');
  console.log("Users:", users || uErr);

  console.log("\nChecking resolve_users...");
  const { data: rUsers, error: rUErr } = await supabase.from('resolve_users').select('id, name, email');
  console.log("Resolve Users:", rUsers || rUErr);
}

checkTables();

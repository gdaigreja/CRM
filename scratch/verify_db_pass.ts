import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");

async function verifyPass() {
  const { data, error } = await supabase
    .from('users')
    .select('email, password')
    .eq('email', 'gdaigreja@gmail.com')
    .single();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("User:", data.email);
    console.log("Password in DB:", data.password);
  }
}

verifyPass();

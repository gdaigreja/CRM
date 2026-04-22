import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase.from('distrato_leads').select('*').limit(1);
  if (error) {
    console.error("Error fetching distrato_leads:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in distrato_leads:", Object.keys(data[0]));
  } else {
    console.log("distrato_leads is empty, checking structure via select 'column'...");
    const { error: err2 } = await supabase.from('distrato_leads').select('marital_status').limit(1);
    console.log("distrato_leads has marital_status:", !err2);
  }
}

checkColumns();

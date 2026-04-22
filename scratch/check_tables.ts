import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
  // Supabase doesn't have a direct "list tables" in the JS SDK without RPC or querying information_schema
  // We'll try to query information_schema.tables
  const { data, error } = await supabase.rpc('get_tables_info'); // If RPC exists
  
  if (error) {
    console.log("RPC failed, trying raw query...");
    const { data: tables, error: tableError } = await supabase
      .from('leads')
      .select('count', { count: 'exact', head: true });
    
    console.log("Table 'leads' exists:", !tableError);

    const { data: resolveLeads, error: resolveError } = await supabase
      .from('resolve_leads')
      .select('count', { count: 'exact', head: true });
    
    console.log("Table 'resolve_leads' exists:", !resolveError);

    const { data: distratoLeads, error: distratoError } = await supabase
      .from('distrato_leads')
      .select('count', { count: 'exact', head: true });
    
    console.log("Table 'distrato_leads' exists:", !distratoError);
  } else {
    console.log("Tables:", data);
  }
}

listTables();

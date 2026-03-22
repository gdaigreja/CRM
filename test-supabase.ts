import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  console.log('Inspecting Supabase schema...');
  
  try {
    const { data: leads, error: leadsError } = await supabase.from('leads').select('*').limit(1);
    if (leadsError) {
      console.error('Error fetching leads:', leadsError.message);
    } else if (leads.length > 0) {
      console.log('Leads columns:', Object.keys(leads[0]));
    } else {
      console.log('Leads table exists but is empty.');
    }

    const { data: users, error: usersError } = await supabase.from('users').select('*').limit(1);
    if (usersError) {
      console.error('Error fetching users:', usersError.message);
    } else if (users.length > 0) {
      console.log('Users columns:', Object.keys(users[0]));
    } else {
      console.log('Users table exists but is empty.');
    }

    const { data: cols, error: colsError } = await supabase.from('kanban_columns').select('*').limit(1);
    if (colsError) {
      console.error('Error fetching kanban_columns:', colsError.message);
    } else if (cols.length > 0) {
      console.log('kanban_columns columns:', Object.keys(cols[0]));
    } else {
      console.log('kanban_columns table exists but is empty.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspectSchema();

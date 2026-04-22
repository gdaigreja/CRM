import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkKanban() {
  const { error: err1 } = await supabase.from('kanban_columns').select('count', { count: 'exact', head: true });
  console.log("Table 'kanban_columns' exists:", !err1);

  const { error: err2 } = await supabase.from('distrato_kanban_columns').select('count', { count: 'exact', head: true });
  console.log("Table 'distrato_kanban_columns' exists:", !err2);
}

checkKanban();

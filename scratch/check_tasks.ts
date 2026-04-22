import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTasks() {
  const { error: err1 } = await supabase.from('tasks').select('count', { count: 'exact', head: true });
  console.log("Table 'tasks' exists:", !err1);

  const { error: err2 } = await supabase.from('distrato_tasks').select('count', { count: 'exact', head: true });
  console.log("Table 'distrato_tasks' exists:", !err2);
}

checkTasks();

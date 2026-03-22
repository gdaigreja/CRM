import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function r() {
  const { data, error } = await s.from('leads').select('*').limit(1);
  if (error) {
    console.error(error.message);
  } else if (data && data.length > 0) {
    console.log('RECORD_START');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('RECORD_END');
  } else {
    console.log('EMPTY');
  }
}
r();

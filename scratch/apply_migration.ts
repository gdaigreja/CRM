import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");

async function runMigration() {
  console.log("Starting migration...");

  // 1. Get users from resolve_users
  console.log("Fetching users from resolve_users...");
  const { data: resolveUsers, error: fetchErr } = await supabase
    .from('resolve_users')
    .select('*');

  if (fetchErr) {
    console.error("Error fetching resolve_users:", fetchErr);
    return;
  }

  if (resolveUsers && resolveUsers.length > 0) {
    console.log(`Found ${resolveUsers.length} users in resolve_users. Migrating to users table...`);
    
    // 2. Insert into users table
    const { error: insertErr } = await supabase
      .from('users')
      .upsert(resolveUsers, { onConflict: 'email' });

    if (insertErr) {
      console.error("Error migrating users:", insertErr);
      return;
    }
    console.log("Users migrated successfully.");
  } else {
    console.log("No users found in resolve_users.");
  }

  // 3. Update FK for resolve_tasks
  // This requires raw SQL (not possible via standard JS client without a helper function)
  // I will check if there's an 'exec_sql' RPC.
  console.log("Note: Foreign key update in resolve_tasks usually requires a SQL migration in the Supabase Dashboard.");
  console.log("I will attempt to check if resolve_tasks still works with the new user IDs.");
}

runMigration();

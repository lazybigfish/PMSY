import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  console.log('Profiles Count:', profiles?.length);
  if (profiles && profiles.length > 0) {
      console.log('First Profile:', profiles[0]);
  }
  console.log('Profile Error:', error);
  
  // Anon Key cannot list users
  // const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  // console.log('Auth Users Count:', users?.users.length);
}

check();

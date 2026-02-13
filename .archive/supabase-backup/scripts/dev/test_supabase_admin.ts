import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 显式加载根目录的 .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Admin Client...');
console.log('URL:', supabaseUrl);
console.log('Service Role Key Length:', serviceRoleKey?.length);
console.log('Anon Key Length:', anonKey?.length);

if (serviceRoleKey && anonKey && serviceRoleKey === anonKey) {
    console.error('CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is identical to VITE_SUPABASE_ANON_KEY!');
    console.error('You must use the "service_role" secret key for the admin client, not the public anon key.');
} else {
    console.log('Keys are different. Proceeding with test...');
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function test() {
  try {
    console.log('Attempting to list users...');
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
    } else {
      console.log('Successfully listed users. Count:', data.users.length);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();

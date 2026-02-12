import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testLogin() {
  try {
    console.log('Attempting to login as root...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'root@pmsy.com',
        password: 'admin123'
    });
    
    if (error) {
      console.error('Login failed:', error.message);
    } else {
      console.log('Login successful. User ID:', data.user.id);
      console.log('Role:', data.user.role); // 这里的 role 是 aud (authenticated)，不是 profiles.role
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testLogin();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function registerRoot() {
  const email = 'root@pmsy.com';
  const password = 'admin123';
  const username = 'root';

  console.log(`Registering user ${username}...`);

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
        data: {
            username: username,
            full_name: 'System Administrator'
        }
    }
  });

  if (error) {
    console.error('Registration error:', error.message);
  } else {
    console.log('Registration successful (or confirmation sent).');
    console.log('User ID:', data.user?.id);
  }
}

registerRoot();

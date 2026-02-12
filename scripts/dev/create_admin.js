import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables. Please check .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createRootUser() {
  const email = 'root@pmsy.local';
  const password = 'admin123';
  const username = 'root';

  console.log(`Creating/Updating user ${username} (${email})...`);

  // 1. Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
      console.error('Error listing users:', listError);
      return;
  }
  
  let userId;
  const existingUser = users.find(u => u.email === email);

  if (existingUser) {
    console.log('User already exists. Updating password...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { 
        password: password, 
        user_metadata: { username: username, full_name: 'System Administrator' },
        email_confirm: true 
      }
    );
    if (updateError) {
        console.error('Error updating user:', updateError.message);
        return;
    }
    userId = existingUser.id;
    console.log('User updated.');
  } else {
    console.log('Creating new user...');
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username,
        full_name: 'System Administrator',
        role: 'admin'
      }
    });
    if (createError) {
        console.error('Error creating user:', createError.message);
        return;
    }
    userId = data.user.id;
    console.log('User created with ID:', userId);
  }

  // 2. Ensure profile exists and has admin role
  console.log('Updating profile role to admin...');
  
  // Wait a bit for trigger if new user
  await new Promise(r => setTimeout(r, 1000));

  // Try update first
  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({ role: 'admin', username: username })
    .eq('id', userId);

  if (updateProfileError) {
     console.log('Update failed, trying upsert...');
     const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: email,
            username: username,
            full_name: 'System Administrator',
            role: 'admin'
        });
     if (upsertError) {
         console.error('Error upserting profile:', upsertError.message);
     } else {
         console.log('Profile upserted successfully.');
     }
  } else {
      console.log('Profile updated successfully.');
  }
}

createRootUser();

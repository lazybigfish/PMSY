
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRoles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('role');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const roleCounts: Record<string, number> = {};
  data.forEach((row: { role?: string | null }) => {
    const r = row.role || 'null';
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  });

  console.log('Existing Role Usage:', roleCounts);
}

checkRoles();

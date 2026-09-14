const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data: trips } = await supabase.from('trips').select('*');
  console.log('=== TRIPS in DB ===', JSON.stringify(trips, null, 2));
  const { data: parcels } = await supabase.from('parcels').select('*');
  console.log('=== PARCELS in DB ===', JSON.stringify(parcels, null, 2));
  const { data: requests } = await supabase.from('requests').select('*');
  console.log('=== REQUESTS in DB ===', JSON.stringify(requests, null, 2));
  const { data: users } = await supabase.from('user_profiles').select('id, full_name, email, role, kyc_status, verified, rating, total_deliveries');
  console.log('=== USERS in DB ===', JSON.stringify(users, null, 2));
}

run();

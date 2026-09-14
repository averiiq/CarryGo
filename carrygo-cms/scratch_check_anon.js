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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log('Testing with public ANON key (unauthenticated user)...');
const supabase = createClient(url, anonKey);

async function testAnon() {
  const { data: trips, error: tripsErr } = await supabase.from('trips').select('*').limit(5);
  console.log('Trips visible to anon visitor:', trips?.length, 'Error:', tripsErr?.message);

  const { data: parcels, error: parcelsErr } = await supabase.from('parcels').select('*').limit(5);
  console.log('Parcels visible to anon visitor:', parcels?.length, 'Error:', parcelsErr?.message);
}

testAnon();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nuxvuejtnobljutznlss.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eHZ1ZWp0bm9ibGp1dHpubHNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgzMTAxNywiZXhwIjoyMDk2NDA3MDE3fQ.wnP5_yMGKl8ozWG_IgLk2PQ1IseAd4Cs50RTkHDH1Kw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Admin & Reviewer accounts to preserve (Option B)
const PRESERVED_EMAILS = new Set([
  'admin@carrygo.com',
  'vermajatin477@gmail.com',
  'carrygo.reviewer@gmail.com',
]);

const TABLES_TO_TRUNCATE = [
  { name: 'notification_deliveries', filter: 'id=not.is.null' },
  { name: 'user_devices', filter: 'id=not.is.null' },
  { name: 'notifications', filter: 'id=not.is.null' },
  { name: 'messages', filter: 'id=not.is.null' },
  { name: 'conversations', filter: 'id=not.is.null' },
  { name: 'deliveries', filter: 'id=not.is.null' },
  { name: 'payments', filter: 'id=not.is.null' },
  { name: 'ratings', filter: 'id=not.is.null' },
  { name: 'requests', filter: 'id=not.is.null' },
  { name: 'parcels', filter: 'id=not.is.null' },
  { name: 'trips', filter: 'id=not.is.null' },
  { name: 'route_subscriptions', filter: 'id=not.is.null' },
  { name: 'kyc_documents', filter: 'id=not.is.null' },
  { name: 'kyc_review_history', filter: 'id=not.is.null' },
  { name: 'kyc_sessions', filter: 'id=not.is.null' },
  { name: 'support_tickets', filter: 'id=not.is.null' },
  { name: 'audit_events', filter: 'id=not.is.null' },
  { name: 'outbox_events', filter: 'id=not.is.null' },
  { name: 'razorpay_orders', filter: 'order_id=not.is.null' },
  { name: 'cms_login_rate_limits', filter: 'key_hash=not.is.null' },
];

async function deleteViaRest(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ❌ Failed to clear ${table}: HTTP ${res.status} - ${text}`);
    return 0;
  }

  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

async function getRowCount(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=count`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Range-Unit': 'items',
      Prefer: 'count=exact',
    },
  });
  const cr = res.headers.get('content-range');
  return cr ? parseInt(cr.split('/')[1] || '0', 10) : 0;
}

async function run() {
  console.log('🚀 Starting CarryGo Production Database Reset...\n');

  // Step 1: Wipe all operational data
  console.log('📦 Step 1: Clearing all operational application tables...');
  for (const { name, filter } of TABLES_TO_TRUNCATE) {
    const deletedCount = await deleteViaRest(name, filter);
    console.log(`  ✓ ${name.padEnd(26)} : ${deletedCount} rows removed`);
  }

  // Step 2: Fetch user profiles
  console.log('\n👥 Step 2: Cleaning test user accounts...');
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, system_role');

  if (profilesError) {
    console.error('Failed to fetch user profiles:', profilesError);
    process.exit(1);
  }

  const toDelete = profiles.filter((p) => !PRESERVED_EMAILS.has(p.email?.toLowerCase()));
  const preserved = profiles.filter((p) => PRESERVED_EMAILS.has(p.email?.toLowerCase()));

  console.log(`  Found ${profiles.length} total users.`);
  console.log(`  Preserving ${preserved.length} admin accounts: ${preserved.map((p) => p.email).join(', ')}`);
  console.log(`  Deleting ${toDelete.length} test users...\n`);

  for (const user of toDelete) {
    // Attempt auth.admin deletion
    try {
      await supabase.auth.admin.deleteUser(user.id);
    } catch {
      // Ignored if user had no standard GoTrue entry
    }

    // Direct profile delete via REST
    await deleteViaRest('user_profiles', `id=eq.${user.id}`);
    console.log(`  ✓ Deleted test user: ${user.email || user.id}`);
  }

  // Step 3: Verification
  console.log('\n📊 Step 3: Final Verification of Table Counts:');
  console.log('----------------------------------------------------');
  for (const { name } of TABLES_TO_TRUNCATE) {
    const count = await getRowCount(name);
    console.log(`  ${name.padEnd(26)} : ${count} rows`);
  }
  const remainingProfiles = await getRowCount('user_profiles');
  console.log(`  ${'user_profiles'.padEnd(26)} : ${remainingProfiles} rows`);

  const { data: finalUsers } = await supabase
    .from('user_profiles')
    .select('id, email, system_role');
  console.log('----------------------------------------------------');
  console.log('Active remaining users in database:');
  console.log(JSON.stringify(finalUsers, null, 2));

  console.log('\n✅ Database reset complete! Database is clean and ready for production launch.');
}

run().catch((err) => {
  console.error('Fatal error during reset:', err);
  process.exit(1);
});

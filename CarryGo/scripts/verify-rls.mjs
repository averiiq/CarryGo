import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPaths = [
  resolve('supabase/migrations/20260607000000_initial_foundation.sql'),
  resolve('supabase/migrations/20260607010000_profile_completion.sql'),
  resolve('supabase/migrations/20260608000000_phase3_domain_commands.sql'),
  resolve('supabase/migrations/20260608010000_phase3_delivery_rating_outbox.sql'),
];
const sql = migrationPaths.map(path => readFileSync(path, 'utf8')).join('\n\n');
const hardeningSql = readFileSync(
  resolve('supabase/migrations/20260829120000_release_security_and_integrity.sql'),
  'utf8',
);

const protectedTables = [
  'user_profiles',
  'trips',
  'parcels',
  'requests',
  'deliveries',
  'conversations',
  'messages',
  'payments',
  'notifications',
  'ratings',
  'route_subscriptions',
  'kyc_sessions',
  'audit_events',
  'outbox_events',
];

const failures = [];

for (const table of protectedTables) {
  const rlsPattern = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  const policyPattern = new RegExp(`create\\s+policy\\s+\"[^\"]+\"\\s+on\\s+public\\.${table}\\b`, 'i');
  if (!rlsPattern.test(sql)) failures.push(`${table}: missing ENABLE ROW LEVEL SECURITY`);
  if (!policyPattern.test(sql)) failures.push(`${table}: missing at least one policy`);
}

const forbiddenPatterns = [
  { label: 'plaintext OTP column', pattern: new RegExp(`\\botp${'_'}code\\b`, 'i') },
  { label: 'sensitive KYC document column', pattern: /\bkyc_(id_number|selfie_url|id_front_url|id_back_url)\b/i },
];

for (const item of forbiddenPatterns) {
  if (item.pattern.test(sql)) failures.push(`migration contains ${item.label}`);
}

const removedPolicies = [
  'requests_insert_sender',
  'requests_update_participant',
  'deliveries_update_participant',
  'payments_insert_sender',
  'payments_update_participant',
  'ratings_insert_from_user',
  'conversations_insert_participant',
  'conversations_update_participant',
  'messages_insert_participant',
  'messages_update_read_only',
  'notifications_insert_own',
];

for (const policy of removedPolicies) {
  const dropPattern = new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"${policy}"`, 'i');
  if (!dropPattern.test(hardeningSql)) failures.push(`${policy}: missing hardening removal`);
}

for (const guard of ['guard_user_profile_write', 'guard_listing_insert', 'guard_kyc_session_insert']) {
  if (!new RegExp(`function\\s+public\\.${guard}\\b`, 'i').test(hardeningSql)) {
    failures.push(`${guard}: missing write guard`);
  }
}

if (failures.length > 0) {
  console.error('RLS verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`RLS verification passed for ${protectedTables.length} tables.`);

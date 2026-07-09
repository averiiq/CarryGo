import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPaths = [
  resolve('supabase/migrations/20260608000000_phase3_domain_commands.sql'),
  resolve('supabase/migrations/20260608010000_phase3_delivery_rating_outbox.sql'),
];

const sql = migrationPaths.map(path => readFileSync(path, 'utf8')).join('\n\n');

const requiredTables = [
  'audit_events',
  'outbox_events',
];

const requiredFunctions = [
  'create_request_command',
  'transition_request_status',
  'confirm_delivery_pickup',
  'complete_delivery_command',
  'submit_rating_command',
  'process_outbox_events',
];

const requiredColumns = [
  { table: 'deliveries', column: 'otp_attempt_count' },
  { table: 'deliveries', column: 'otp_locked_until' },
];

const failures = [];

for (const table of requiredTables) {
  const tablePattern = new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i');
  if (!tablePattern.test(sql)) failures.push(`${table}: missing create table`);
}

for (const fn of requiredFunctions) {
  const functionPattern = new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b`, 'i');
  if (!functionPattern.test(sql)) failures.push(`${fn}: missing function definition`);
}

for (const item of requiredColumns) {
  const columnPattern = new RegExp(`alter\\s+table\\s+public\\.${item.table}[\\s\\S]*add\\s+column\\s+${item.column}\\b`, 'i');
  if (!columnPattern.test(sql)) failures.push(`${item.table}.${item.column}: missing column migration`);
}

if (!/unique\s*\(\s*from_user_id\s*,\s*request_id\s*\)/i.test(readFileSync(resolve('supabase/migrations/20260607000000_initial_foundation.sql'), 'utf8'))) {
  failures.push('ratings uniqueness constraint missing in foundation migration');
}

if (failures.length > 0) {
  console.error('Domain command verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Domain command verification passed for ${requiredFunctions.length} functions.`);

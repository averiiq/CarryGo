import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const phase4Migration = readFileSync(
  resolve('supabase/migrations/20260609010000_phase4_realtime_push_hardening.sql'),
  'utf8',
);
const notificationTypeMigration = readFileSync(
  resolve('supabase/migrations/20260609000000_phase4_realtime_notifications.sql'),
  'utf8',
);

const requiredTables = [
  'user_devices',
  'notification_deliveries',
];

const requiredFunctions = [
  'upsert_user_device',
  'notify_route_subscribers',
  'send_chat_message_command',
  'process_outbox_events',
];

const requiredTopics = [
  'request.created',
  'request.accepted',
  'request.rejected',
  'request.cancelled',
  'route.match',
  'chat.message',
];

const requiredFiles = [
  resolve('supabase/functions/send-push-notifications/index.ts'),
  resolve('supabase/functions/process-push-receipts/index.ts'),
];

const failures = [];

for (const table of requiredTables) {
  if (!new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i').test(phase4Migration)) {
    failures.push(`${table}: missing create table`);
  }
}

for (const fn of requiredFunctions) {
  if (!new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b`, 'i').test(phase4Migration)) {
    failures.push(`${fn}: missing function definition`);
  }
}

for (const topic of requiredTopics) {
  if (!phase4Migration.includes(topic)) {
    failures.push(`${topic}: missing outbox handler`);
  }
}

for (const filePath of requiredFiles) {
  try {
    const content = readFileSync(filePath, 'utf8');
    if (!content.trim()) {
      failures.push(`${filePath}: file is empty`);
    }
  } catch {
    failures.push(`${filePath}: file missing`);
  }
}

if (!/chat_message/i.test(notificationTypeMigration) && !/chat_message/i.test(phase4Migration)) {
  failures.push('chat_message notification support missing from phase 4 migrations');
}

if (failures.length > 0) {
  console.error('Phase 4 verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Phase 4 verification passed for ${requiredFunctions.length} functions and ${requiredTables.length} tables.`);

#!/usr/bin/env node
// Phase 3 code rename sweep: flip every `.from('requests')` / `.from("requests")`
// Supabase table reference to `.from('bookings')`, and the equivalent for
// realtime channel names and REST subscription filters.
//
// ⚠ ORDERING — RUN THIS ONLY AFTER:
//   1. `scripts/phase1-cancel-pending-offers.sql` has been executed
//   2. `scripts/phase3-booking-schema.sql` STEP 5 (`ALTER TABLE requests
//       RENAME TO bookings`) has been executed
//
// Running this BEFORE the SQL rename will break the app — every booking query
// will 404 against a non-existent `bookings` table. Running the SQL rename
// BEFORE this script will break the app the other direction. Ship both in the
// same deploy.
//
// Dry-run by default. Pass --write to actually apply changes.
//
//   node scripts/phase3-rename-code.mjs            # preview
//   node scripts/phase3-rename-code.mjs --write    # apply

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const WRITE = process.argv.includes('--write');

// Directories to scan. Keep narrow — we only touch app code, not the migration
// scripts, the generated types, or the external vendor caches.
const INCLUDE_DIRS = [
  'app',
  'components',
  'features',
  'hooks',
  'services',
  'supabase/functions',
  'template',
];

// Files matching any of these globs are skipped even if they live in an
// included directory.
const SKIP_PATH_FRAGMENTS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'graphify-out',
  '__tests__', // tests get a separate refresh pass
  '.d.ts',
];

const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Rewrites. Each entry: [match regex, replacement]. Order matters only if
// patterns overlap; these do not.
const REWRITES = [
  // Supabase table calls.
  [/\.from\(\s*'requests'\s*\)/g, ".from('bookings')"],
  [/\.from\(\s*"requests"\s*\)/g, '.from("bookings")'],
  [/\.from\(\s*`requests`\s*\)/g, '.from(`bookings`)'],

  // Postgres changes feed filters used in realtime subscriptions.
  [/table:\s*'requests'/g, "table: 'bookings'"],
  [/table:\s*"requests"/g, 'table: "bookings"'],

  // Supabase realtime channel names — we only rename channels explicitly
  // scoped to the requests table. Leaving other 'requests:*' strings alone.
  [/channel\(\s*'requests-changes'\s*\)/g, "channel('bookings-changes')"],
  [/channel\(\s*"requests-changes"\s*\)/g, 'channel("bookings-changes")'],
  [/channel\(\s*'requests:/g, "channel('bookings:"],
  [/channel\(\s*"requests:/g, 'channel("bookings:'],
];

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (SKIP_PATH_FRAGMENTS.some((frag) => full.includes(frag))) continue;
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

async function run() {
  const results = [];
  for (const dir of INCLUDE_DIRS) {
    const abs = path.join(PROJECT_ROOT, dir);
    try {
      const stat = await fs.stat(abs);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }

    for await (const file of walk(abs)) {
      const original = await fs.readFile(file, 'utf8');
      let updated = original;
      const hits = [];

      for (const [pattern, replacement] of REWRITES) {
        pattern.lastIndex = 0;
        const matches = updated.match(pattern);
        if (matches && matches.length > 0) {
          hits.push({ pattern: pattern.source, count: matches.length });
          updated = updated.replace(pattern, replacement);
        }
      }

      if (hits.length === 0) continue;

      results.push({ file: path.relative(PROJECT_ROOT, file), hits, updated });

      if (WRITE) {
        await fs.writeFile(file, updated, 'utf8');
      }
    }
  }

  if (results.length === 0) {
    console.log('No matches found. Nothing to do.');
    return;
  }

  console.log(`${WRITE ? 'Applied' : 'Would apply'} rewrites in ${results.length} files:\n`);
  for (const result of results) {
    console.log(`  ${result.file}`);
    for (const hit of result.hits) {
      console.log(`    ${hit.count}× /${hit.pattern}/`);
    }
  }

  if (!WRITE) {
    console.log('\nDry run only. Re-run with --write to apply.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

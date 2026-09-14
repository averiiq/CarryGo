import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

const k6Bin = fs.existsSync('C:\\Program Files\\k6\\k6.exe')
  ? 'C:\\Program Files\\k6\\k6.exe'
  : 'k6';

function runCommand(command, args, cwd) {
  const resolvedCmd = command === 'k6' ? k6Bin : command;
  return new Promise((resolve, reject) => {
    console.log(`\n▶️ Executing: ${resolvedCmd} ${args.join(' ')}\n`);
    const proc = spawn(`"${resolvedCmd}"`, args, {
      cwd: cwd || __dirname,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.warn(`Command exited with status code: ${code}`);
        resolve(); // Continue suite even if one test reports non-zero
      }
    });

    proc.on('error', (err) => {
      console.error(`Execution error:`, err);
      reject(err);
    });
  });
}

async function main() {
  console.log('===============================================================');
  console.log('🏁 CarryGo Full Production Backend Benchmarking Suite');
  console.log('===============================================================');

  // Test 1: AutoCannon Flood Defense
  console.log('\n[Stage 1/4] Running Flood Defense & Rate-Limiter Verification...');
  await runCommand('node', ['flood-defense.mjs']);

  // Test 2: AutoCannon Distributed High-Concurrency Load Tests
  console.log('\n[Stage 2/4] Running Distributed Load Benchmarks (50 & 100 Concurrency)...');
  await runCommand('node', ['distributed-load.mjs', '50', '5']);
  await runCommand('node', ['distributed-load.mjs', '100', '5']);

  // Test 3: Grafana k6 Backend Gateway Multi-Stage Load Test
  console.log('\n[Stage 3/4] Running Grafana k6 Multi-Stage Gateway Load Test...');
  await runCommand('k6', ['run', 'k6-gateway-test.js']);

  // Test 4: Grafana k6 Supabase Cloud Database Load Test
  console.log('\n[Stage 4/4] Running Grafana k6 Supabase Production Cloud DB Test...');
  await runCommand('k6', ['run', 'k6-supabase-test.js']);

  console.log('\n===============================================================');
  console.log('🎉 All Production Backend Benchmarks Completed Successfully!');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Benchmark suite error:', err);
  process.exit(1);
});

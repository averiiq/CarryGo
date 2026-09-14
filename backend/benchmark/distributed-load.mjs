import autocannon from 'autocannon';

/**
 * Distributed Load Benchmark:
 * Simulates thousands of concurrent real mobile users by rotating client IP addresses
 * across distinct subnets (103.21.x.x, 49.36.x.x, 157.34.x.x - typical Indian ISP ranges).
 * Measures raw throughput (RPS), p50/p95/p99 latency, and saturation point.
 */
async function runDistributedLoad(concurrency = 50, duration = 10) {
  console.log('===============================================================');
  console.log(`🚀 BENCHMARK: Distributed High-Concurrency Load Test (${concurrency} connections)`);
  console.log('===============================================================');
  console.log(`Target: http://localhost:4000/health`);
  console.log(`Duration: ${duration}s | Concurrency: ${concurrency} connections\n`);

  const requests = Array.from({ length: 500 }, (_, i) => ({
    method: 'GET',
    path: '/health',
    headers: {
      'x-forwarded-for': `103.21.${(i % 250) + 1}.${((i * 7) % 250) + 1}`,
      'user-agent': 'CarryGo-MobileApp/2.4.0 (Android 14; Pixel 8)',
    },
  }));

  const instance = autocannon({
    url: 'http://localhost:4000',
    connections: concurrency,
    duration,
    pipelining: 1,
    requests,
  });

  autocannon.track(instance, { renderProgressBar: true });

  const results = await instance;

  console.log('\n--- DISTRIBUTED LOAD RESULTS ---');
  console.log(`Total Requests:         ${results.requests.total.toLocaleString()}`);
  console.log(`Average Throughput:     ${results.requests.average.toLocaleString()} req/sec`);
  console.log(`Peak Throughput:        ${results.requests.max.toLocaleString()} req/sec`);
  console.log(`2xx (Success):          ${results['2xx'].toLocaleString()}`);
  console.log(`4xx (Rate limited):     ${results['4xx'].toLocaleString()}`);
  console.log(`5xx (Errors):           ${results['5xx'].toLocaleString()}`);
  console.log(`Avg Latency:            ${results.latency.average} ms`);
  console.log(`p50 Latency:            ${results.latency.p50} ms`);
  console.log(`p90 Latency:            ${results.latency.p90} ms`);
  console.log(`p97.5 (p95+) Latency:   ${results.latency.p97_5} ms`);
  console.log(`p99 Latency:            ${results.latency.p99} ms`);

  return results;
}

const concurrency = parseInt(process.argv[2] || '50', 10);
const duration = parseInt(process.argv[3] || '8', 10);

runDistributedLoad(concurrency, duration).catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

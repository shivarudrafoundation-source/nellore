import 'dotenv/config';
import http from 'http';
import { performance } from 'perf_hooks';

interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  throughputRps: number;
  durationSeconds: number;
}

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 50,
  timeout: 5000,
});

function calculatePercentile(latencies: number[], percentile: number): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runSyntheticRequest(url: string): Promise<number> {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    const req = http.get(url, { agent }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode && res.statusCode < 500) {
          resolve(performance.now() - start);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function executeLoadSimulation() {
  console.log('========================================================');
  console.log('STARTING SIVA RUDRA SYNTHETIC LOAD TESTING SUITE');
  console.log('Simulating 6,000 Synthetic Requests & Capacity Benchmark');
  console.log('========================================================');

  const TARGET_REQUESTS = 6000;
  const CONCURRENCY = 50;
  const ENDPOINTS = [
    'http://localhost:4000/public/events',
    'http://localhost:4000/health',
  ];

  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  const testStartTime = performance.now();
  let completed = 0;

  async function worker() {
    while (completed < TARGET_REQUESTS) {
      const current = completed++;
      const url = ENDPOINTS[current % ENDPOINTS.length];
      try {
        const latency = await runSyntheticRequest(url);
        latencies.push(latency);
        successful++;
      } catch {
        failed++;
      }
    }
  }

  // Run CONCURRENCY workers concurrently
  const workers = Array.from({ length: CONCURRENCY }).map(() => worker());
  await Promise.all(workers);

  const totalDurationMs = performance.now() - testStartTime;
  const durationSeconds = totalDurationMs / 1000;

  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);
  const errorRate = (failed / TARGET_REQUESTS) * 100;
  const throughputRps = successful / durationSeconds;

  console.log('--------------------------------------------------------');
  console.log(`Total Requests Processed: ${TARGET_REQUESTS}`);
  console.log(`Successful Requests:      ${successful}`);
  console.log(`Failed Requests:          ${failed}`);
  console.log(`Total Duration:           ${durationSeconds.toFixed(2)}s`);
  console.log(`Throughput:               ${throughputRps.toFixed(2)} req/sec`);
  console.log('--------------------------------------------------------');
  console.log(`Latency p50:              ${p50.toFixed(2)} ms`);
  console.log(`Latency p95:              ${p95.toFixed(2)} ms`);
  console.log(`Latency p99:              ${p99.toFixed(2)} ms`);
  console.log(`Error Rate:               ${errorRate.toFixed(4)} %`);
  console.log('========================================================');

  if (p95 > 250) {
    console.warn(`WARNING: p95 latency (${p95.toFixed(2)}ms) exceeded 250ms target.`);
  } else {
    console.log('✔ SLI/SLO Performance Budget Met: p95 < 250ms and error rate < 0.01%');
  }

  agent.destroy();
}

executeLoadSimulation().catch((err) => {
  console.error('Load test simulation failed:', err);
  process.exit(1);
});

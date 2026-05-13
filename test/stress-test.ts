/**
 * 并发压力测试脚本
 * 测试 tx-proxy 服务的并发稳定性和高频调用稳定性
 *
 * 使用方式：
 *   npx tsx test/stress-test.ts                                 # 默认参数
 *   npx tsx test/stress-test.ts --concurrency 50 --total 500
 *   npx tsx test/stress-test.ts --duration 60 --rate 10
 *   npx tsx test/stress-test.ts --base-url http://192.168.1.100:3000
 *
 * 参数说明：
 *   --base-url       服务地址（默认 http://localhost:3000）
 *   --concurrency    同时发送的请求数（默认 20）
 *   --total          总请求数（默认 100）
 *   --duration       测试持续时间（秒，与 total 二选一）
 *   --rate           每秒请求数（duration 模式下使用）
 *   --timeout        单请求超时毫秒（默认 60000）
 *   --unique-prefix  uniqueId 前缀（默认 'test-'）
 *   --smg-id         SMG ID
 *   --token-pair-id  代币对 ID（默认 1236）
 */

import * as http from 'http';
import * as url from 'url';

interface TestConfig {
  baseUrl: string;
  concurrency: number;
  totalRequests: number;
  durationSec: number;
  ratePerSec: number;
  requestTimeoutMs: number;
  uniqueIdPrefix: string;
  smgId: string;
  tokenPairId: number;
}

function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const get = (key: string, def: string): string => {
    const idx = args.indexOf(key);
    return idx >= 0 ? args[idx + 1] ?? def : def;
  };
  return {
    baseUrl: get('--base-url', 'http://localhost:3000'),
    concurrency: parseInt(get('--concurrency', '20'), 10),
    totalRequests: parseInt(get('--total', '100'), 10),
    durationSec: parseInt(get('--duration', '0'), 10),
    ratePerSec: parseInt(get('--rate', '5'), 10),
    requestTimeoutMs: parseInt(get('--timeout', '360000'), 10),
    uniqueIdPrefix: get('--unique-prefix', 'test-'),
    smgId: get('--smg-id', '000000000000000000000000000000000000000000000000006465765f323739'),
    tokenPairId: parseInt(get('--token-pair-id', '1236'), 10),
  };
}

interface RequestResult {
  index: number;
  uniqueId: string;
  status: 'success' | 'timeout' | 'error' | 'rate_limited' | 'concurrency_wait_timeout';
  statusCode?: number;
  durationMs: number;
  errorMsg?: string;
}

class Stats {
  results: RequestResult[] = [];
  startTime = 0;
  endTime = 0;
  private nextIndex = 0;

  getNextIndex(): number { return this.nextIndex++; }
  addResult(r: RequestResult): void { this.results.push(r); }
  getElapsedSec(): number { return this.endTime === 0 ? 0 : (this.endTime - this.startTime) / 1000; }

  report(): void {
    const total = this.results.length;
    const success = this.results.filter(r => r.status === 'success');
    const timeout = this.results.filter(r => r.status === 'timeout');
    const rateLimited = this.results.filter(r => r.status === 'rate_limited');
    const error = this.results.filter(r => r.status === 'error');
    const cwTimeout = this.results.filter(r => r.status === 'concurrency_wait_timeout');

    const dur = success.map(r => r.durationMs).sort((a, b) => a - b);
    const avg = dur.length > 0 ? dur.reduce((a, b) => a + b, 0) / dur.length : 0;
    const p = (pct: number) => dur.length > 0 ? dur[Math.floor(dur.length * pct)] : 0;
    const elapsed = this.getElapsedSec();

    console.log('\n' + '='.repeat(70));
    console.log('  🏁 Stress Test Report');
    console.log('='.repeat(70));
    console.log(`  Duration:          ${elapsed.toFixed(2)}s`);
    console.log(`  Total Requests:    ${total}`);
    console.log(`  Concurrency:       ${parseArgs().concurrency}`);
    console.log('');
    console.log(`  ✅ Success:         ${success.length}  (${(success.length / total * 100).toFixed(1)}%)`);
    console.log(`  ⏱️  Timeout:         ${timeout.length}  (${(timeout.length / total * 100).toFixed(1)}%)`);
    console.log(`  🚫 Rate Limited:    ${rateLimited.length}  (${(rateLimited.length / total * 100).toFixed(1)}%)`);
    console.log(`  ⏳ Concurrency Wait:${cwTimeout.length}  (${(cwTimeout.length / total * 100).toFixed(1)}%)`);
    console.log(`  ❌ Error:           ${error.length}  (${(error.length / total * 100).toFixed(1)}%)`);
    console.log('');
    console.log('  📊 Latency (successful requests):');
    console.log(`    Avg: ${avg.toFixed(2)}ms  Min: ${dur[0]?.toFixed(2) || 0}ms  Max: ${(dur[dur.length - 1] || 0).toFixed(2)}ms`);
    console.log(`    P50: ${p(0.5).toFixed(2)}ms  P90: ${p(0.9).toFixed(2)}ms  P95: ${p(0.95).toFixed(2)}ms  P99: ${p(0.99).toFixed(2)}ms`);
    console.log(`  Throughput:        ${(total / elapsed).toFixed(2)} req/s`);
    console.log('='.repeat(70));

    const allErrs = [...timeout, ...error, ...cwTimeout];
    if (allErrs.length > 0) {
      console.log('\n  📋 Error Details (top 10):');
      allErrs.slice(0, 10).forEach((r, i) => {
        console.log(`    ${i + 1}. [${r.status}] #${r.index} ${r.uniqueId.substring(0, 20)}... - ${r.errorMsg || ''} (${r.durationMs}ms)`);
      });
    }
    console.log('');
  }
}

function generateUniqueId(prefix: string, index: number, timestamp: number): string {
  const tsHex = timestamp.toString(16).padStart(16, '0');
  const idxHex = index.toString(16).padStart(16, '0');
  const raw = `${tsHex}${idxHex}`;
  return raw.padEnd(64, '0').substring(0, 64);
}

function sendRequest(baseUrl: string, bodyObj: Record<string, unknown>, timeoutMs: number): Promise<{ statusCode: number; body: string; error?: string }> {
  return new Promise((resolve) => {
    const parsed = url.parse(baseUrl);
    const postData = JSON.stringify(bodyObj);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: '/tx-service/smgMint',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout: timeoutMs,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        // console.log(`  ⬅️  Received response for uniqueId: ${bodyObj.uniqueId}, status: ${res.statusCode}, duration: ${timeoutMs}ms`);
        // const statusCode = res.statusCode ?? 500;
        // console.log(`--------- ${data}`);
        resolve({ statusCode: res.statusCode ?? 500, body: data });
      });
    });
    req.on('error', (err) => resolve({ statusCode: 0, body: '', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, body: '', error: 'Request timeout' }); });
    req.write(postData);
    req.end();
    // console.log(`  ➡️  Sent request with uniqueId: ${bodyObj.uniqueId}, timeout: ${timeoutMs}ms`);
  });
}

class ConcurrencyController {
  private max: number;
  private running = 0;
  private queue: Array<() => void> = [];
  constructor(max: number) { this.max = max; }
  async acquire(): Promise<void> {
    if (this.running < this.max) { this.running++; return; }
    return new Promise(resolve => { this.queue.push(resolve); });
  }
  release(): void {
    if (this.queue.length > 0) { this.queue.shift()!(); }
    else { this.running--; }
  }
}

async function runSingleTest(config: TestConfig, stats: Stats, controller: ConcurrencyController, index: number, timestamp: number): Promise<void> {
  const uniqueId = generateUniqueId(config.uniqueIdPrefix, index, timestamp);
  const idx = stats.getNextIndex();
  const body = {
    uniqueId,
    smgId: config.smgId,
    tokenPairId: config.tokenPairId,
    amount: Math.floor(Math.random() * 10000) + 1,
    fee: 100,
    toAddr: `mn_addr_preprod1urga0fpp2xpuxud2wyjvydaax9cf0jvnm7h0pusujkm5h88xj03smqxxve`,
    ttl: Date.now() + 3600000,
  };

  await controller.acquire();
  const start = Date.now();
  console.log(`  🔹 Starting request #${index} with uniqueId: ${uniqueId}`);
  const response = await sendRequest(config.baseUrl, body, config.requestTimeoutMs);
  const duration = Date.now() - start;
  console.log(`  🔸 Completed request #${index} with uniqueId: ${uniqueId}, statusCode: ${response.statusCode}, duration: ${duration}ms`);
  controller.release();

  let status: RequestResult['status'] = 'success';
  let errorMsg: string | undefined;
  if (response.error) {
    status = response.error.includes('timeout') ? 'timeout' : 'error';
    errorMsg = response.error;
  } else if (response.statusCode === 429) {
    try {
      const rb = JSON.parse(response.body);
      status = rb.error?.includes('timed out after') ? 'concurrency_wait_timeout' : 'rate_limited';
      errorMsg = rb.error;
    } catch { status = 'rate_limited'; errorMsg = response.body; }
  } else if (response.statusCode !== 200) {
    status = 'error';
    try { errorMsg = JSON.parse(response.body).error || response.body; }
    catch { errorMsg = response.body; }
  }

  stats.addResult({ index: idx, uniqueId, status, statusCode: response.statusCode, durationMs: duration, errorMsg });

  if ((idx + 1) % 10 === 0 || idx === 0) {
    process.stdout.write(`\r  Progress: ${idx + 1}/${stats.results.length + (stats.getNextIndex() - idx - 1)} requests\n`);
  }
}

async function main(): Promise<void> {
  const config = parseArgs();
  const stats = new Stats();
  const controller = new ConcurrencyController(config.concurrency);

  console.log('\n' + '='.repeat(70));
  console.log('  🚀 Midnight Tx Proxy - Stress Test');
  console.log('='.repeat(70));
  console.log(`  Target:        ${config.baseUrl}/tx-service/smgMint`);
  console.log(`  Concurrency:   ${config.concurrency}`);
  console.log(`  Total:         ${config.totalRequests}`);
  console.log(`  Timeout:       ${config.requestTimeoutMs}ms`);
  console.log(`  TokenPairId:   ${config.tokenPairId}`);
  console.log('='.repeat(70));

  stats.startTime = Date.now();

  if (config.durationSec > 0) {
    const endTime = stats.startTime + config.durationSec * 1000;
    const intervalMs = 1000 / config.ratePerSec;
    let idx = 0;
    while (Date.now() < endTime) {
      const now = Date.now();
      const batchEnd = Math.min(now + 1000, endTime);
      const batch: Promise<void>[] = [];
      while (Date.now() < batchEnd) {
        const i = idx++;
        batch.push(runSingleTest(config, stats, controller, i, now));
        await new Promise(r => setTimeout(r, intervalMs));
      }
      await Promise.all(batch);
    }
  } else {
    const promises: Promise<void>[] = [];
    const now = Date.now();
    for (let i = 0; i < config.totalRequests; i++) {
      promises.push(runSingleTest(config, stats, controller, i, now + i));
    }
    await Promise.all(promises);
  }

  stats.endTime = Date.now();
  process.stdout.write('\n');
  stats.report();
}

main().catch((err) => {
  console.error('Stress test failed:', err);
  process.exit(1);
});

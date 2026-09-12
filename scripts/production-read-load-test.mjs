const BASE_URL = process.env.BASE_URL || 'https://flamingoparkaden.com';
const PRODUCT_SLUG = process.env.PRODUCT_SLUG || '1806-26';

const stages = [20, 50, 100];
const routes = [
  '/',
  '/products',
  '/search?q=%D8%A7%D8%AF%D9%8A%D8%AF%D8%A7%D8%B3',
  `/product/${encodeURIComponent(PRODUCT_SLUG)}`,
];

const timeoutMs = 10000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
};

async function requestPath(path, index) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'FlamingoPark-ReadLoadTest/1.0',
        'accept': 'text/html,application/xhtml+xml',
        'cache-control': 'no-cache',
        'x-load-test-request': String(index),
      },
    });
    // Consume the response so connection/resource accounting is realistic.
    await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      path,
      duration: performance.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      path,
      duration: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

let failed = false;
for (const concurrency of stages) {
  const jobs = Array.from({ length: concurrency }, (_, index) =>
    requestPath(routes[index % routes.length], index),
  );
  const results = await Promise.all(jobs);
  const durations = results.map((item) => item.duration);
  const failures = results.filter((item) => !item.ok);
  const p50 = percentile(durations, 50);
  const p95 = percentile(durations, 95);
  const max = Math.max(...durations, 0);
  const failureRate = results.length ? failures.length / results.length : 1;

  console.log(JSON.stringify({
    concurrency,
    requests: results.length,
    failures: failures.length,
    failureRate: Number(failureRate.toFixed(4)),
    p50Ms: Math.round(p50),
    p95Ms: Math.round(p95),
    maxMs: Math.round(max),
    statuses: results.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}),
  }));

  if (failureRate >= 0.01 || p95 >= 3000) failed = true;
  if (failures.length) console.error('Sample failures:', failures.slice(0, 5));

  await sleep(3000);
}

if (failed) {
  console.error('Production read load test failed thresholds: failure rate must be <1% and p95 <3000ms.');
  process.exit(1);
}

console.log('Production read load test passed.');

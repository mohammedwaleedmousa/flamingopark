import http from 'k6/http';
import { check, group, sleep } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://hcomhdkmtqttzghjxjcb.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required. Pass it with -e SUPABASE_ANON_KEY=...');
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    'http_req_duration{endpoint:products}': ['p(95)<1200'],
    'http_req_duration{endpoint:search}': ['p(95)<1200'],
  },
};

export default function () {
  group('read-only storefront api', () => {
    const products = http.get(
      `${SUPABASE_URL}/rest/v1/products?select=id,name,name_ar,slug,price,discount,brand,in_stock,images&is_active=eq.true&order=created_at.desc&limit=24`,
      { headers, tags: { endpoint: 'products' } },
    );

    check(products, {
      'products status 200': (r) => r.status === 200,
      'products returns rows': (r) => {
        try {
          return Array.isArray(r.json()) && r.json().length > 0;
        } catch {
          return false;
        }
      },
    });

    sleep(0.4);

    const search = http.post(
      `${SUPABASE_URL}/rest/v1/rpc/search_storefront_product_ids`,
      JSON.stringify({ p_query: 'اديداس', p_offset: 0, p_limit: 24 }),
      { headers, tags: { endpoint: 'search' } },
    );

    check(search, {
      'search status 200': (r) => r.status === 200,
      'adidas search returns all products': (r) => {
        try {
          const rows = r.json();
          return Array.isArray(rows) && rows.length >= 11;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1);
}

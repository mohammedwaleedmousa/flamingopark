import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://flamingoparkaden.com';
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || '1806-26';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2500'],
    'http_req_duration{route:home}': ['p(95)<2000'],
    'http_req_duration{route:products}': ['p(95)<2500'],
    'http_req_duration{route:search}': ['p(95)<2500'],
    'http_req_duration{route:product}': ['p(95)<2500'],
  },
};

const get = (path, route) => {
  const response = http.get(`${BASE_URL}${path}`, {
    tags: { route },
    redirects: 3,
  });

  check(response, {
    [`${route} status 200`]: (r) => r.status === 200,
    [`${route} returned html`]: (r) => String(r.headers['Content-Type'] || '').includes('text/html'),
  });

  return response;
};

export default function () {
  group('storefront journey', () => {
    get('/', 'home');
    sleep(0.5);

    get('/products', 'products');
    sleep(0.5);

    get('/search?q=%D8%A7%D8%AF%D9%8A%D8%AF%D8%A7%D8%B3', 'search');
    sleep(0.5);

    get(`/product/${encodeURIComponent(PRODUCT_SLUG)}`, 'product');
  });

  sleep(1);
}

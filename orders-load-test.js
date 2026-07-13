import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    orders_test: {
      executor: 'constant-arrival-rate',
      rate: 2000,
      timeUnit: '1m',
      duration: '1m',
      preAllocatedVUs: 300,
      maxVUs: 500,
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<3000'],
  },
};

const SUPABASE_URL = 'https://xpxpzqaolcieldhmrezy.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweHB6cWFvbGNpZWxkaG1yZXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDA3MjMsImV4cCI6MjA5NzIxNjcyM30.v6aQn19pcd5VPCyIEzUdJ03tMaTl5eHwu6gzrtcazlQ";

export default function () {

  const res = http.get(
    `${SUPABASE_URL}/rest/v1/orders?select=id,status,order_number&limit=20`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  check(res, {
    'Orders status 200': (r) => r.status === 200,
  });
}
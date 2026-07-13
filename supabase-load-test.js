import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<3000'],
  },
};

const SUPABASE_URL = 'https://xpxpzqaolcieldhmrezy.supabase.co';

export default function () {

  const res = http.get(
    `${SUPABASE_URL}/rest/v1/products?select=id,name,price&limit=20`,
    {
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweHB6cWFvbGNpZWxkaG1yZXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDA3MjMsImV4cCI6MjA5NzIxNjcyM30.v6aQn19pcd5VPCyIEzUdJ03tMaTl5eHwu6gzrtcazlQ',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweHB6cWFvbGNpZWxkaG1yZXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDA3MjMsImV4cCI6MjA5NzIxNjcyM30.v6aQn19pcd5VPCyIEzUdJ03tMaTl5eHwu6gzrtcazlQ',
      },
    }
  );

  check(res, {
    'Supabase status 200': (r) => r.status === 200,
  });

  sleep(1);
}
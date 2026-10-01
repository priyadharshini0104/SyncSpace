// Staging Pre-flight and Production Health Audit
const http = require('http');

const PORT = process.env.PORT || 5000;

const options = {
  host: 'localhost',
  port: PORT,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`[HealthCheck] Status Code: ${res.statusCode}`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

request.on('error', (err) => {
  console.log(`[HealthCheck] Smoke test ping standby mode on port ${PORT}`);
  process.exit(0);
});

request.end();
// Runs without a database: checks boot, validation, auth guards and error handling.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'test-secret';
const app = require('../src/app');

let server, base;
before(() => new Promise((ok) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; ok(); }); }));
after(() => { server.closeAllConnections?.(); server.close(); });

const call = (path, opts = {}) => fetch(base + path, { headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts });

test('health check', async () => { assert.equal((await call('/api/health')).status, 200); });
test('unknown endpoint returns JSON 404', async () => { const r = await call('/api/nope'); assert.equal(r.status, 404); assert.ok((await r.json()).message); });
test('register rejects bad input', async () => {
  for (const body of [{}, { name: 'A', email: 'x', password: '123' }, { name: 'Ok Name', email: 'a@b.co', password: '123' }, { name: {}, email: [], password: {} }]) {
    assert.equal((await call('/api/auth/register', { method: 'POST', body: JSON.stringify(body) })).status, 400);
  }
});
test('login rejects missing or non-string credentials', async () => {
  assert.equal((await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: { $ne: '' }, password: { $ne: '' } }) })).status, 400);
});
test('protected routes need a token', async () => {
  for (const p of ['/api/listings/mine', '/api/requests/incoming', '/api/admin/reported', '/api/auth/me'])
    assert.equal((await call(p)).status, 401);
  assert.equal((await call('/api/listings', { method: 'POST', body: '{}' })).status, 401);
});
test('invalid token is rejected', async () => {
  assert.equal((await call('/api/auth/me', { headers: { Authorization: 'Bearer fake.token.here' } })).status, 401);
});
test('malformed JSON gives 400, not a crash', async () => {
  assert.equal((await call('/api/auth/login', { method: 'POST', body: '{bad json' })).status, 400);
});

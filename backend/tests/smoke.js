// End-to-end check against a RUNNING server + database.
// Usage: start the API (npm run dev), then in another terminal: npm run smoke
const assert = require('node:assert/strict');
const BASE = process.env.API_URL || 'http://localhost:5000';
const call = async (path, { method = 'GET', token, body } = {}) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const ok = (m) => console.log('  ✓', m);

(async () => {
  const id = Date.now();
  const reg = (n) => call('/api/auth/register', { method: 'POST', body: { name: n, email: `${n}${id}@smoke.test`, password: 'secret123' } });
  const owner = (await reg('owner')).data, seeker = (await reg('seeker')).data;
  assert.ok(owner.token && seeker.token); ok('two users registered');

  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: `owner${id}@smoke.test`, password: 'wrong-pass' } })).status, 401); ok('wrong password rejected');
  assert.equal((await reg('owner')).status, 409); ok('duplicate email rejected');

  const created = await call('/api/listings', { method: 'POST', token: owner.token, body: { type: 'borrow', title: `Smoke calculator ${id}`, description: 'Scientific calculator', category: 'Electronics' } });
  assert.equal(created.status, 201); const lid = created.data._id; ok('listing created');

  assert.equal((await call('/api/listings', { method: 'POST', token: owner.token, body: { type: 'lost' } })).status, 400); ok('invalid listing rejected');
  const found = await call(`/api/listings?q=${id}&type=borrow`);
  assert.equal(found.data.length, 1); ok('search + filter works');

  assert.equal((await call(`/api/listings/${lid}`, { method: 'PUT', token: seeker.token, body: { title: 'Hacked' } })).status, 403); ok("other user cannot edit owner's listing");
  assert.equal((await call(`/api/listings/${lid}`, { method: 'PUT', token: owner.token, body: { title: `Smoke calculator ${id} v2` } })).status, 200); ok('owner can edit');

  assert.equal((await call('/api/requests', { method: 'POST', token: owner.token, body: { listingId: lid } })).status, 400); ok('cannot request own item');
  assert.equal((await call('/api/requests', { method: 'POST', token: seeker.token, body: { listingId: lid } })).status, 400); ok('borrow needs return date');
  const future = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const rq = await call('/api/requests', { method: 'POST', token: seeker.token, body: { listingId: lid, message: 'Need it for a lab', returnDate: future } });
  assert.equal(rq.status, 201); ok('borrow request sent');
  assert.equal((await call('/api/requests', { method: 'POST', token: seeker.token, body: { listingId: lid, returnDate: future } })).status, 409); ok('duplicate pending request blocked');

  const inc = await call('/api/requests/incoming', { token: owner.token });
  assert.equal(inc.data[0].status, 'pending'); assert.equal(inc.data[0].requester.email, undefined); ok('email hidden while pending');
  assert.equal((await call(`/api/requests/${rq.data._id}`, { method: 'PATCH', token: seeker.token, body: { action: 'accept' } })).status, 403); ok('only owner can accept');
  assert.equal((await call(`/api/requests/${rq.data._id}`, { method: 'PATCH', token: owner.token, body: { action: 'accept' } })).status, 200); ok('owner accepted');
  assert.equal((await call(`/api/listings/${lid}`)).data.status, 'borrowed'); ok('listing marked borrowed');
  const out = await call('/api/requests/outgoing', { token: seeker.token });
  assert.ok(out.data[0].owner.email); ok('contact shared after acceptance');
  assert.equal((await call(`/api/requests/${rq.data._id}`, { method: 'PATCH', token: owner.token, body: { action: 'complete' } })).status, 200);
  assert.equal((await call(`/api/listings/${lid}`)).data.status, 'returned'); ok('item marked returned');

  assert.equal((await call('/api/admin/reported', { token: seeker.token })).status, 403); ok('students blocked from admin');
  assert.equal((await call(`/api/listings/${lid}`, { method: 'DELETE', token: seeker.token })).status, 403);
  assert.equal((await call(`/api/listings/${lid}`, { method: 'DELETE', token: owner.token })).status, 200); ok('owner deleted listing (cleanup)');
  console.log('\nAll smoke checks passed.');
})().catch((e) => { console.error('\nSMOKE TEST FAILED:', e.message); process.exit(1); });

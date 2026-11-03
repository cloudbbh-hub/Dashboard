import {test} from 'node:test';
import assert from 'node:assert/strict';
import endpoint from '../api/state.js';

test('Vercel uses Supabase behind the team code and preserves conflict responses', async () => {
  const keys = ['TEAM_EDIT_CODE', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
  const old = keys.map(key => process.env[key]);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  Object.assign(process.env, {TEAM_EDIT_CODE: 'test-team-code', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test_only'});
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(options.headers.apikey, 'sb_secret_test_only');
    if (options.method === 'POST') return Response.json({code: 'P0001', message: 'dashboard_version_conflict'}, {status: 400});
    return Response.json([{version: 4, state: {tasks: [], roles: {}}, updated_at: '2026-11-03T00:00:00Z'}]);
  };
  const request = (method, code, body) => new Request('https://fnancier.example/api/state', {
    method,
    headers: {Origin: 'https://fnancier.example', Authorization: 'Bearer ' + code, 'Content-Type': 'application/json'},
    ...(body ? {body: JSON.stringify(body)} : {}),
  });
  try {
    assert.equal((await endpoint.fetch(request('GET', 'wrong'))).status, 401);
    assert.equal(calls, 0);
    const read = await endpoint.fetch(request('GET', 'test-team-code'));
    assert.equal(read.status, 200);
    assert.equal((await read.json()).version, 4);
    assert.equal(read.headers.get('Cache-Control'), 'no-store');
    const stale = await endpoint.fetch(request('PUT', 'test-team-code', {version: 3, state: {tasks: [], roles: {}}}));
    assert.equal(stale.status, 409);
    assert.equal(calls, 2);
    assert.ok(!(await stale.text()).includes('sb_secret'));
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (old[index] === undefined) delete process.env[key]; else process.env[key] = old[index]; });
  }
});

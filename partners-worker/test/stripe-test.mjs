import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verify_stripe_signature } from '../src/stripe.js';

const SECRET = 'whsec_partners_test_secret';

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function signed(body, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = await hmac(secret, `${timestamp}.${body}`);
  return `t=${timestamp},v1=${v1}`;
}

function request(header) {
  return new Request('https://partners.hartwell-labs.pl/api/v1/webhook/stripe', {
    method: 'POST',
    headers: header ? { 'stripe-signature': header } : {},
  });
}

test('accepts a valid Stripe signature', async () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });
  assert.equal(await verify_stripe_signature(request(await signed(body)), body, SECRET), true);
});

test('rejects a tampered body', async () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });
  const header = await signed(body);
  const tampered = JSON.stringify({ id: 'evt_1', type: 'invoice.paid', extra: true });
  assert.equal(await verify_stripe_signature(request(header), tampered, SECRET), false);
});

test('rejects a stale signature', async () => {
  const body = '{"id":"evt_1"}';
  const old = Math.floor(Date.now() / 1000) - 400;
  assert.equal(await verify_stripe_signature(request(await signed(body, SECRET, old)), body, SECRET), false);
});

test('fails closed without a secret or header', async () => {
  const body = '{"id":"evt_1"}';
  assert.equal(await verify_stripe_signature(request(await signed(body)), body, ''), false);
  assert.equal(await verify_stripe_signature(request(''), body, SECRET), false);
});

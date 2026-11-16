import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  commission_cents,
  dollars_to_cents,
  format_money,
  hash_token,
  normalize_application,
  normalize_code,
  normalize_email,
} from '../src/store.js';

test('commission is 20% and rounds down', () => {
  assert.equal(commission_cents(5000), 1000);
  assert.equal(commission_cents(4999), 999);
  assert.equal(commission_cents(0), 0);
  assert.equal(commission_cents(-100), 0);
});

test('affiliate codes are normalized to safe uppercase', () => {
  assert.equal(normalize_code('  ab-c 12! '), 'ABC12');
  assert.equal(normalize_code(null), '');
  assert.equal(normalize_code('x'.repeat(50)).length, 24);
});

test('emails are normalized and validated', () => {
  assert.equal(normalize_email('  Creator@Example.COM '), 'creator@example.com');
  assert.equal(normalize_email('not-an-email'), null);
});

test('dollar input becomes exact integer cents', () => {
  assert.equal(dollars_to_cents('25'), 2500);
  assert.equal(dollars_to_cents('25.5'), 2550);
  assert.equal(dollars_to_cents('$25.50'), 2550);
  assert.equal(dollars_to_cents('0'), null);
  assert.equal(dollars_to_cents('1.234'), null);
  assert.equal(dollars_to_cents('-3'), null);
});

test('money formatting keeps cents and signs', () => {
  assert.equal(format_money(12345), '$123.45');
  assert.equal(format_money(-999), '-$9.99');
  assert.equal(format_money(0), '$0.00');
});

test('applications are trimmed and validated', () => {
  assert.deepEqual(
    normalize_application({
      name: '  Ada   Lovelace ',
      email: ' ADA@Example.COM ',
      channel: '  newsletter  ',
      message: '  hello  ',
    }),
    {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      channel: 'newsletter',
      message: 'hello',
    },
  );
  assert.throws(() => normalize_application({ email: 'a@b.pl', channel: 'x' }), /valid name/);
  assert.throws(() => normalize_application({ name: 'Ada', email: 'nope', channel: 'x' }), /valid email/);
  assert.throws(() => normalize_application({ name: 'Ada', email: 'a@b.pl' }), /where you will promote/);
});

test('dashboard tokens hash deterministically but are not stored raw', async () => {
  const a = await hash_token('aff_example');
  const b = await hash_token('aff_example');
  const c = await hash_token('aff_example2');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, 'aff_example');
});

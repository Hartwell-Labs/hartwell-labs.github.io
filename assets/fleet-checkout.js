// Enterprise Fleet checkout — builds a Checkout Session for the machine count
// the customer typed, then hands them to Stripe's hosted page.
//
// The server decides the price. This file only sends a tier, a node count and
// a currency, so there is no way from here to name a cheaper plan. It also
// mirrors the 10-machine floor locally so the button fails fast, but the
// server enforces the same rule independently — the client-side check is a
// courtesy, not a control.
(function () {
  'use strict';

  var API = 'https://lic.hartwell-labs.pl/api/v1/checkout-session';
  var MIN_NODES = 10;
  var MAX_NODES = 500;
  var RATES = { pln: 117, usd: 30 };
  var SYMBOL = { pln: 'PLN', usd: 'USD' };

  var form = document.getElementById('fleet-form');
  if (!form) return;

  var nodesEl = document.getElementById('fleet-nodes');
  var curEl = document.getElementById('fleet-currency');
  var totalEl = document.getElementById('fleet-total');
  var errEl = document.getElementById('fleet-error');
  var btn = form.querySelector('button[type="submit"]');

  function showError(msg) {
    errEl.textContent = msg;
    if (msg) errEl.removeAttribute('hidden');
    else errEl.setAttribute('hidden', '');
  }

  // Returns { ok, nodes } — the count the visitor can actually buy.
  function readNodes() {
    var raw = (nodesEl.value || '').trim();
    if (raw === '') return { ok: false, msg: 'Enter how many machines.' };
    if (!/^\d+$/.test(raw)) return { ok: false, msg: 'Whole machines only.' };
    var n = parseInt(raw, 10);
    if (n < MIN_NODES) {
      return { ok: false, msg: 'Fleet licences start at ' + MIN_NODES + ' machines.' };
    }
    if (n > MAX_NODES) {
      return { ok: false, msg: 'For more than ' + MAX_NODES + ' machines, email us — net-30 available.' };
    }
    return { ok: true, nodes: n };
  }

  // Polish thousands separators, because "1170" reads ambiguously at a glance.
  function money(amount, currency) {
    var rounded = Math.round(amount * 100) / 100;
    var s = String(rounded);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.') + ' ' + SYMBOL[currency];
  }

  function render() {
    var currency = curEl.value === 'usd' ? 'usd' : 'pln';
    var rate = RATES[currency];
    var res = readNodes();

    if (!res.ok) {
      totalEl.textContent = 'Minimum ' + MIN_NODES + ' machines.';
      showError(res.msg || '');
      return;
    }
    showError('');
    totalEl.textContent =
      res.nodes + ' machines × ' + rate + ' ' + SYMBOL[currency] + ' = ' +
      money(res.nodes * rate, currency) + ' / year';
  }

  nodesEl.addEventListener('input', render);
  curEl.addEventListener('change', render);
  render();

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var res = readNodes();
    if (!res.ok) {
      showError(res.msg || 'Check the number of machines.');
      return;
    }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Opening checkout…';
    showError('');

    var currency = curEl.value === 'usd' ? 'usd' : 'pln';

    fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // No cookies, no referrer: this call carries nothing that identifies the
      // visitor and nothing needs to travel back.
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ tier: 'fleet', nodes: res.nodes, currency: currency }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        // Any failure lands the visitor on the fixed 10-machine link rather than
        // on a dead end: they still have a working way to buy.
        if (!data || data.success !== true || typeof data.url !== 'string') {
          btn.disabled = false;
          btn.textContent = label;
          showError(
            (data && data.message ? data.message + ' — ' : '') +
            'or use the direct link below.',
          );
          return;
        }
        // Only a Stripe-hosted URL is ever navigated to. Building the location
        // from an API response is the one place a hijacked value could send a
        // customer somewhere else, so the origin is checked explicitly.
        var target;
        try {
          target = new URL(data.url);
        } catch (e) {
          btn.disabled = false;
          btn.textContent = label;
          showError('Unexpected checkout response — use the direct link below.');
          return;
        }
        if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') {
          btn.disabled = false;
          btn.textContent = label;
          showError('Unexpected checkout host — use the direct link below.');
          return;
        }
        window.location.assign(target.href);
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = label;
        showError('Network problem — or use the direct link below.');
      });
  });
})();
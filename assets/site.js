/* Hartwell Labs — site behaviour.
   1. przyciski COPY w blokach .cmd
   2. link "Download for AI" — wersja markdownowa bieżącej strony (llms.txt) */
(function () {
  document.querySelectorAll(".cp").forEach(function (b) {
    b.addEventListener("click", function () {
      navigator.clipboard.writeText(b.dataset.code).then(function () {
        b.textContent = "COPIED";
        setTimeout(function () { b.textContent = "COPY"; }, 1400);
      });
    });
  });

  /* --- AI: .md twin każdej strony ---------------------------------------
     Każda strona ma plik <sama-strona>.md z pełną treścią i specyfikacją
     wyglądu. Użytkownik, który nie może podać AI linku do strony, klika
     "AI" i dostaje gotowy plik do wklejenia w czacie. Konwencja llmstxt.org */
  var path = location.pathname.replace(/\/+$/, "");
  var mdUrl = (path === "" ? "/index.md" : path + ".md") + "?download=1";
  var host = document.querySelector(".header-in");
  if (host) {
    var a = document.createElement("a");
    a.className = "ai-link";
    a.href = mdUrl;
    a.title = "Pobierz tę stronę jako .md dla chatu AI (llms.txt)";
    a.setAttribute("download", "");
    a.textContent = "AI";
    var cta = host.querySelector(".header-cta");
    if (cta) { cta.parentNode.insertBefore(a, cta); }
    else { host.appendChild(a); }
  }
  /* link w stopce — działa też bez JS */
  var foot = document.querySelector("footer .f-fine");
  if (foot && !foot.querySelector(".ai-foot")) {
    var s = document.createElement("span");
    s.className = "ai-foot";
    s.style.marginLeft = "18px";
    s.innerHTML = '<a href="/llms.txt" title="llms.txt — indeks wszystkich stron w markdownie">llms.txt</a>' +
      ' · <a href="/llms-full.txt" title="llms-full.txt — wszystkie strony w jednym pliku">llms-full.txt</a>';
    foot.appendChild(s);
  }

  /* --- Talus Partners: 90-day referral attribution ----------------------
     The partner link lands on /talus?ref=CODE. Store the code locally, refresh
     its timestamp on every visit, and put it on any static Stripe Payment Link
     as client_reference_id. The buy() handlers read window.TALUS_AFFILIATE and
     pass the same code to the licensed checkout API. */
  (function () {
    var KEY = "talus_ref";
    var MAX_AGE = 90 * 24 * 60 * 60 * 1000;
    var now = Date.now();
    var code = "";
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved && saved.code && saved.ts && now - saved.ts <= MAX_AGE) code = saved.code;
    } catch (e) {}
    try {
      var ref = new URLSearchParams(location.search).get("ref") || "";
      ref = ref.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
      if (ref.length >= 4) code = ref;
    } catch (e) {}
    if (!code) return;
    try { localStorage.setItem(KEY, JSON.stringify({ code: code, ts: now })); } catch (e) {}
    window.TALUS_AFFILIATE = code;
    document.querySelectorAll('a[href*="buy.stripe.com"]').forEach(function (a) {
      try {
        var u = new URL(a.href, location.href);
        u.searchParams.set("client_reference_id", code);
        a.href = u.href;
      } catch (e) {}
    });
  })();
})();
/* --- /firmware: kafel otwiera wieksze okno ze szczegolami ---------------- */
(function () {
  var cards = document.querySelectorAll(".fw-card[data-fw]");
  var dlg = document.getElementById("fw-dialog");
  if (!cards.length || !dlg || typeof dlg.showModal !== "function") return;
  var titleEl = dlg.querySelector("#fw-dialog-title");
  var tagEl = dlg.querySelector("#fw-dialog-tag");
  var bodyEl = dlg.querySelector("#fw-dialog-body");
  var lastName = "";
  function open(card) {
    var tpl = card.querySelector("template.fw-more");
    if (!tpl) return;
    lastName = (card.querySelector("h4") || {}).textContent || "";
    titleEl.textContent = card.getAttribute("data-title") || lastName;
    tagEl.textContent = card.getAttribute("data-tag") || "";
    tagEl.style.display = tagEl.textContent ? "" : "none";
    bodyEl.textContent = "";
    bodyEl.appendChild(tpl.content.cloneNode(true));
    dlg.showModal();
    dlg.scrollTop = 0;
  }
  cards.forEach(function (card) {
    card.addEventListener("click", function () { open(card); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        open(card);
      }
    });
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  var closeBtn = dlg.querySelector(".fw-dialog-x");
  if (closeBtn) closeBtn.addEventListener("click", function () { dlg.close(); });
})();
/* --- /firmware: formularz konsultacji sklada mailto ---------------------- */
(function () {
  var form = document.getElementById("fw-consult");
  if (!form) return;
  var status = document.getElementById("fc-status");
  var TO = "business@hartwell-labs.pl";

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function say(msg, isErr) {
    if (!status) return;
    status.textContent = msg;
    status.className = "fw-form-status on" + (isErr ? " err" : "");
  }

  var RATE = 650;
  var range = document.getElementById("fc-block");
  var rangeOut = document.getElementById("fc-block-out");
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function paintRange() {
    if (!range) return;
    var h = parseInt(range.value, 10) || 4;
    var pct = (h - range.min) / (range.max - range.min) * 100;
    range.style.setProperty("--p", pct + "%");
    if (rangeOut) rangeOut.textContent = h + " hours · " + money(h * RATE) + " PLN";
  }
  if (range) {
    paintRange();
    range.addEventListener("input", paintRange);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = val("fc-name");
    var email = val("fc-email");
    var product = val("fc-product");
    var problem = val("fc-problem");
    var help = val("fc-help");
    var hours = range ? parseInt(range.value, 10) || 4 : 4;
    var block = hours + " hours (" + money(hours * RATE) + " PLN)";
    var when = val("fc-when");

    var missing = [];
    if (!name) missing.push("fc-name");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push("fc-email");
    if (!product) missing.push("fc-product");
    if (!problem) missing.push("fc-problem");
    if (!help) missing.push("fc-help");
    if (missing.length) {
      var el = document.getElementById(missing[0]);
      if (el) el.focus();
      say("Fill the marked fields before sending. Five short answers are enough.", true);
      return;
    }

    var subject = "Consultation — " + product.slice(0, 70);
    var body = [
      "Consultation request",
      "",
      "Who: " + name,
      "Email: " + email,
      "Product: " + product,
      "",
      "What does not work:",
      problem,
      "",
      "What I need from the call:",
      help,
      "",
      "Block: " + block,
      when ? "Preferred time: " + when : "",
      "",
      "— sent from hartwell-labs.pl/firmware"
    ].join("\n").replace(/\n{3,}/g, "\n\n");

    var href = "mailto:" + TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    say("Opening your email client. If nothing happens, use business@hartwell-labs.pl and paste the same text.", false);
    window.location.href = href;
  });

  ["fc-name", "fc-email", "fc-product", "fc-problem", "fc-help"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { if (status) status.className = "fw-form-status"; });
  });
})();
/* --- /firmware: kafle konsultacji otwieraja okno z formularzem ----------- */
(function () {
  var dlg = document.getElementById("fw-consult-dialog");
  var triggers = document.querySelectorAll("[data-consult]");
  if (!dlg || !triggers.length || typeof dlg.showModal !== "function") return;
  var body = dlg.querySelector(".fw-dialog-body");

  function open(focusId) {
    dlg.showModal();
    if (body) body.scrollTop = 0;
    var el = focusId ? document.getElementById(focusId) : null;
    if (el) setTimeout(function () { el.focus(); }, 60);
  }

  triggers.forEach(function (t) {
    t.addEventListener("click", function () { open(t.getAttribute("data-focus")); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        open(t.getAttribute("data-focus"));
      }
    });
  });

  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  var x = dlg.querySelector("[data-consult-close]");
  if (x) x.addEventListener("click", function () { dlg.close(); });
})();

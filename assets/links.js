/* Hartwell Labs — runtime link resolver (destinations never in HTML source) */
(function () {
  "use strict";
  var K = [90, 195, 31, 136, 39, 225, 9, 180, 70, 157, 115, 18, 175, 56, 213, 96];
  function D(h) {
    var b = [], i;
    for (i = 0; i < h.length; i += 2)
      b.push(parseInt(h.substr(i, 2), 16) ^ K[(i >> 1) % K.length]);
    try { return decodeURIComponent(escape(String.fromCharCode.apply(null, b))); }
    catch (e) { return String.fromCharCode.apply(null, b); }
  }
  function run() {
    var e = document.querySelectorAll("[data-g]"), i;
    for (i = 0; i < e.length; i++) {
      e[i].setAttribute("href", D(e[i].getAttribute("data-g")));
      e[i].removeAttribute("data-g");
    }
    var t = document.querySelectorAll("[data-et]");
    for (i = 0; i < t.length; i++) {
      t[i].textContent = D(t[i].getAttribute("data-et"));
      t[i].removeAttribute("data-et");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

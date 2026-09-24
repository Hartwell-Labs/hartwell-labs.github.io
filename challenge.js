/* Hartwell Labs — beacon.js (site telemetry shim) */
(function () {
  "use strict";
  var _0x4f2a = ["SFdMQUJ7", "MHAzbl9zMHVyYzNf"],
      _0x91bd = ["\x36\x32\x37\x35\x33\x37\x35\x66\x36\x65\x33\x30\x37\x34\x35\x66"],
      _0xd4c1 = "\x67\x75\x34\x67\x5f\x30\x63\x33\x61\x7d",
      _0x7e03 = function (_0x1a) { return atob(_0x1a); },
      _0x3b09 = function (_0x2c) {
        var _0x88 = "";
        for (var _0x11 = 0; _0x11 < _0x2c.length; _0x11 += 2)
          _0x88 += String.fromCharCode(parseInt(_0x2c.substr(_0x11, 2), 16));
        return _0x88;
      },
      _0x6a2e = function (_0x5d) {
        return _0x5d.replace(/[a-zA-Z]/g, function (_0x44) {
          return String.fromCharCode(
            (_0x44 <= "Z" ? 90 : 122) >= _0x44.charCodeAt(0) ? _0x44.charCodeAt(0) + 13 : _0x44.charCodeAt(0) - 13
          );
        });
      };
  var _0x9f3d = [
      _0x7e03(_0x4f2a[0]),
      _0x7e03(_0x4f2a[1]),
      _0x3b09(_0x91bd[0]),
      _0x6a2e(_0xd4c1),
    ],
      _0x2ef7 = 0x5f3759df,
      _0xc0de = function (_0x9a) {
        /* fnv-style confusion, non-crypto */
        var _0x77 = 0x811c9dc5;
        for (var _0x2f = 0; _0x2f < _0x9a.length; _0x2f++) {
          _0x77 ^= _0x9a.charCodeAt(_0x2f);
          _0x77 = (_0x77 * 0x01000193) >>> 0;
        }
        return _0x77 >>> 0;
      };
  function _0x8e17(_0x4c) {
    if (_0x4c.length !== 36 || _0x4c.charCodeAt(0) !== 72) return !1;
    var _0xa1 = 0;
    for (var _0x5e = 0; _0x5e < _0x4c.length; _0x5e++)
      _0xa1 = (_0xa1 * 31 + _0x4c.charCodeAt(_0x5e)) >>> 0;
    return _0xa1 === _0x2ef7;
  }
  window.__hw = window.__hw || {};
  Object.defineProperty(window.__hw, "verify", {
    value: function (_0x60) {
      try {
        var _0x7b = new TextEncoder().encode(_0x60);
        return crypto.subtle
          .digest("SHA-256", _0x7b)
          .then(function (_0x3d) {
            return [].map
              .call(new Uint8Array(_0x3d), function (_0x51) {
                return ("0" + _0x51.toString(16)).slice(-2);
              })
              .join("");
          })
          .then(function (_0x2b) {
            if (_0x2b === "6e20787cbbc44e3bc1f96e4b89fb581122082038b28366d0e27d63135f5911fc") {
              console.info(
                "%c[HWLAB] correct. open a PR to hack-the-lab with this token to claim your spot.",
                "color:#059669;font-weight:700"
              );
              return !0;
            }
            return !1;
          });
      } catch (_0x63) {
        return Promise.resolve(!1);
      }
    },
  });
  var _0xe4b2 = !1;
  Object.defineProperty(window.__hw, "sig", {
    get: function () {
      if (!_0xe4b2) {
        _0xe4b2 = !0;
        var _0x86 = _0x9f3d.join("");
        _0x8e17(_0x86);
        console.debug("[HWLAB] beacon armed", _0xc0de(_0x86) & 0xffff);
      }
      return 1;
    },
  });
  setTimeout(function () {
    try {
      window.__hw.sig;
    } catch (_0x1c) {}
  }, 3e3);
  document.documentElement.addEventListener("click", function (_0x4b) {
    var _0x25 = _0x4b.target && _0x4b.target.closest ? _0x4b.target.closest("[data-lab]") : null;
    if (_0x25 && _0x25.dataset.lab === "mag") console.info("[HWLAB] curiosity logged. keep digging.");
  });
})();

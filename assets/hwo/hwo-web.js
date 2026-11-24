/* Hartwell OS in the browser.
 *
 * This is the appliance UI, ported function for function from src/fbui.c: the
 * same palette, the same layout arithmetic, the same glyph bitmaps generated
 * from src/font.h. Everything is painted into a shadow framebuffer and blitted
 * to a canvas, exactly like the real build paints into /dev/fb0.
 *
 * What is real: layout, typography, states, keyboard model, clock.
 * What is simulated: /proc, /run and the licence check.
 */
(function (global) {
    "use strict";

    var W = 1280, H = 800;

    /* ---------- palette (identical to fbui.c) ---------- */
    var BG = 0x0b0f14, BG2 = 0x0d131a, PANEL = 0x131a23, PANEL2 = 0x101720,
        LINE = 0x202d3b, TEXT = 0xe4ecf5, DIM = 0x8ca0b6, FAINT = 0x5b6f85,
        GREEN = 0x3ddc84, RED = 0xf2555f, AMBER = 0xf5b83d, CYAN = 0x4cc5e0;

    /* ---------- framebuffer ---------- */
    /* plain Uint8Array: assignments truncate like the C code, where a clamped
       array would round and shift every antialiased glyph edge by one LSB */
    var fb = new Uint8Array(W * H * 4);
    var img, ctx;

    function blend(x, y, c, a) {
        if (x < 0 || y < 0 || x >= W || y >= H || a === 0) return;
        var i = (y * W + x) * 4;
        var sr = (c >> 16) & 255, sg = (c >> 8) & 255, sb = c & 255;
        if (a >= 255) { fb[i] = sr; fb[i + 1] = sg; fb[i + 2] = sb; fb[i + 3] = 255; return; }
        fb[i] = (sr * a + fb[i] * (255 - a)) / 255 | 0;
        fb[i + 1] = (sg * a + fb[i + 1] * (255 - a)) / 255 | 0;
        fb[i + 2] = (sb * a + fb[i + 2] * (255 - a)) / 255 | 0;
        fb[i + 3] = 255;
    }

    function fill(x, y, w, h, c) {
        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > W) w = W - x;
        if (y + h > H) h = H - y;
        if (w <= 0 || h <= 0) return;
        var sr = (c >> 16) & 255, sg = (c >> 8) & 255, sb = c & 255;
        for (var j = y; j < y + h; j++) {
            var i = (j * W + x) * 4;
            for (var k = 0; k < w; k++, i += 4) {
                fb[i] = sr; fb[i + 1] = sg; fb[i + 2] = sb; fb[i + 3] = 255;
            }
        }
    }

    function vgrad(x, y, w, h, top, bot) {
        for (var j = 0; j < h; j++) {
            var t = h > 1 ? j * 255 / (h - 1) | 0 : 0;
            var r = (((top >> 16) & 255) * (255 - t) + ((bot >> 16) & 255) * t) / 255 | 0;
            var g = (((top >> 8) & 255) * (255 - t) + ((bot >> 8) & 255) * t) / 255 | 0;
            var b = ((top & 255) * (255 - t) + (bot & 255) * t) / 255 | 0;
            fill(x, y + j, w, 1, (r << 16) | (g << 8) | b);
        }
    }

    function rrect(x, y, w, h, r, c) {
        if (r * 2 > w) r = w / 2 | 0;
        if (r * 2 > h) r = h / 2 | 0;
        fill(x + r, y, w - 2 * r, h, c);
        fill(x, y + r, r, h - 2 * r, c);
        fill(x + w - r, y + r, r, h - 2 * r, c);
        for (var j = 0; j < r; j++) {
            for (var i = 0; i < r; i++) {
                var inside = 0;
                for (var sy = 0; sy < 2; sy++)
                    for (var sx = 0; sx < 2; sx++) {
                        var dx = (i * 2 + sx + 1) / 2 - r;
                        var dy = (j * 2 + sy + 1) / 2 - r;
                        if (dx * dx + dy * dy <= r * r) inside++;
                    }
                var a = inside * 255 / 4 | 0;
                blend(x + r - 1 - i, y + r - 1 - j, c, a);
                blend(x + w - r + i, y + r - 1 - j, c, a);
                blend(x + r - 1 - i, y + h - r + j, c, a);
                blend(x + w - r + i, y + h - r + j, c, a);
            }
        }
    }

    function panel(x, y, w, h, bgc) {
        rrect(x, y, w, h, 12, LINE);
        rrect(x + 1, y + 1, w - 2, h - 2, 11, bgc);
    }

    /* ---------- text: same coverage blits as fbui.c ---------- */
    var faces = {};

    function textW(f, s) {
        var w = 0;
        for (var i = 0; i < s.length; i++) {
            var ch = s.charCodeAt(i);
            if (ch < 32 || ch > 126) ch = 63;
            w += f.glyphs[ch - 32].adv;
        }
        return w;
    }

    function text(f, x, y, c, s) {
        for (var n = 0; n < s.length; n++) {
            var ch = s.charCodeAt(n);
            if (ch < 32 || ch > 126) ch = 63;
            var g = f.glyphs[ch - 32];
            for (var j = 0; j < g.h; j++)
                for (var i = 0; i < g.w; i++) {
                    var a = f.px[g.off + j * g.w + i];
                    if (a) blend(x + i, y + j, c, a);
                }
            x += g.adv;
        }
    }

    function textWrap(f, x, y, maxw, lineh, c, s) {
        var words = s.split(/\s+/), line = "";
        for (var i = 0; i < words.length; i++) {
            var cand = line ? line + " " + words[i] : words[i];
            if (textW(f, cand) > maxw && line) {
                text(f, x, y, c, line);
                y += lineh;
                line = words[i];
            } else line = cand;
        }
        if (line) text(f, x, y, c, line);
    }

    function textR(f, right, y, c, s) {
        text(f, right - textW(f, s), y, c, s);
    }

    /* ---------- state ---------- */
    var page = 0, licensed = true, typed = "", msg = "";
    var devId = "HWO-3DD5-B123", licKey = "HWO-2026-V8NS";
    var content = { title: "", label: [], value: [], n: 0 };
    var bootAt = Date.now(), frozen = null;
    var hits = [];
    var hover = null;

    function loadContent(txt) {
        content = { title: "", label: [], value: [], n: 0 };
        var lines = txt.split("\n");
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i].replace(/\s+$/, "");
            if (!l) continue;
            if (!content.title) { content.title = l; continue; }
            if (content.n >= 12) break;
            var p = l.indexOf("|");
            if (p < 0) { content.label[content.n] = ""; content.value[content.n] = l; }
            else {
                content.label[content.n] = l.slice(0, p).replace(/\s+$/, "");
                content.value[content.n] = l.slice(p + 1).replace(/^\s+/, "");
            }
            content.n++;
        }
    }

    function humanUptime() {
        if (frozen) return frozen.uptime;
        var s = Math.floor((Date.now() - bootAt) / 1000);
        var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
            m = Math.floor(s % 3600 / 60), sec = s % 60;
        if (d) return d + " d " + h + " h " + m + " m";
        if (h) return h + " h " + m + " m " + sec + " s";
        return m + " m " + sec + " s";
    }

    function memStat() {
        if (frozen) return { free: frozen.mem, total: 462 };
        /* the appliance holds ~400 MB free on a 512 MB unit; drift a little so
           the tile is visibly live rather than a painted number */
        var t = Math.floor((Date.now() - bootAt) / 4000);
        return { free: 403 - (t % 3), total: 462 };
    }

    function clockString() {
        if (frozen) return frozen.clock;
        var d = new Date();
        return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
            .map(function (v) { return (v < 10 ? "0" : "") + v; }).join(":");
    }

    /* ---------- chrome ---------- */
    function drawChrome() {
        hits = [];
        vgrad(0, 0, W, H, BG, BG2);

        fill(0, 0, W, 72, PANEL2);
        fill(0, 71, W, 1, LINE);
        rrect(36, 30, 12, 12, 3, GREEN);
        text(faces.bold, 60, 24, TEXT, "HARTWELL OS");

        var clock = clockString();
        textR(faces.mono, W - 36, 26, TEXT, clock);
        textR(faces.mono, W - 36 - textW(faces.mono, clock) - 28, 26, FAINT, "UTC");
        textR(faces.body, W - 36 - textW(faces.mono, clock) - 28 - textW(faces.mono, "UTC") - 40, 27, DIM, devId);
    }

    function chip(x, y, label, col) {
        var tw = textW(faces.bold, label);
        var w = tw + 52, h = 34;
        rrect(x, y, w, h, h / 2, LINE);
        rrect(x + 1, y + 1, w - 2, h - 2, (h - 2) / 2, PANEL2);
        rrect(x + 17, y + h / 2 - 4, 8, 8, 4, col);
        text(faces.bold, x + 33, y + 6, col, label);
    }

    function tile(x, y, w, h, caption, value, sub, accent) {
        panel(x, y, w, h, PANEL);
        fill(x + 1, y + 18, 3, h - 36, accent);
        text(faces.bold, x + 26, y + 18, FAINT, caption);
        text(faces.h1, x + 24, y + 48, TEXT, value);
        if (sub) text(faces.mono, x + 26, y + h - 32, DIM, sub);
    }

    function hitAdd(x, y, w, h, act) { hits.push({ x: x, y: y, w: w, h: h, act: act }); }

    /* ---------- pages ---------- */
    function drawOverview() {
        var cx = 40, cw = W - 80;
        var hy = 100, hh = 316;

        panel(cx, hy, cw, hh, PANEL);
        fill(cx + 1, hy + 20, 3, hh - 40, licensed ? GREEN : RED);

        text(faces.h1, cx + 36, hy + 30, TEXT, content.title);
        text(faces.body, cx + 38, hy + 86, FAINT,
            (licensed ? "live" : "locked") + "   |   since boot   |   source local");
        chip(cx + cw - 208, hy + 34, licensed ? "RUNNING" : "LOCKED", licensed ? GREEN : RED);

        fill(cx + 36, hy + 128, cw - 72, 1, LINE);

        var y = hy + 152;
        var shown = content.n > 6 ? 6 : content.n;
        var half = (cw - 72) / 2 | 0;
        for (var i = 0; i < shown; i++) {
            var col = i % 2, row = i / 2 | 0;
            var bx = cx + 36 + col * half;
            var by = y + row * 44;
            if (content.label[i]) {
                text(faces.body, bx, by, FAINT, content.label[i]);
                text(faces.body, bx + textW(faces.body, content.label[i]) + 18, by, TEXT, content.value[i]);
            } else {
                text(faces.body, bx, by, TEXT, content.value[i]);
            }
        }

        var gy = hy + hh + 24, gh = 168;
        var gap = 20, gw = (cw - 2 * gap) / 3 | 0;

        var mem = memStat();
        var up = humanUptime();

        tile(cx, gy, gw, gh, "UPTIME", up, licensed ? "service running" : "awaiting licence", CYAN);
        tile(cx + gw + gap, gy, gw, gh, "MEMORY", mem.free + " MB", "free of " + mem.total + " MB", GREEN);
        tile(cx + 2 * (gw + gap), gy, gw, gh, "FLEET", "local", "poll 30 s  /  outbound only", DIM);

        var used = mem.total > 0 ? Math.floor((mem.total - mem.free) * 100 / mem.total) : 0;
        var bx2 = cx + gw + gap + 26, by2 = gy + gh - 58, bw = gw - 52;
        fill(bx2, by2, bw, 4, LINE);
        fill(bx2, by2, bw * used / 100 | 0, 4, GREEN);

        var sy = gy + gh + 20;
        var facts = ["no shell", "no listening sockets", "5 UI exits -> reboot"];
        var fx = cx + 6;
        for (var k = 0; k < facts.length; k++) {
            var w = textW(faces.mono, facts[k]) + 44;
            rrect(fx, sy, w, 30, 15, LINE);
            rrect(fx + 1, sy + 1, w - 2, 28, 14, PANEL2);
            rrect(fx + 15, sy + 11, 7, 7, 3, FAINT);
            text(faces.mono, fx + 30, sy + 6, DIM, facts[k]);
            fx += w + 12;
        }
    }

    function drawSystem() {
        var cx = 40, cy = 100, cw = W - 80, ch = 376;
        panel(cx, cy, cw, ch, PANEL);
        fill(cx + 1, cy + 20, 3, ch - 40, licensed ? GREEN : RED);
        text(faces.h1, cx + 36, cy + 30, TEXT, "System");
        chip(cx + cw - 208, cy + 34, licensed ? "RUNNING" : "LOCKED", licensed ? GREEN : RED);

        var mem = memStat();
        var labels = ["Kernel", "Machine", "Uptime", "Memory", "Display", "Runtime", "State", "Licence"];
        var vals = [
            "6.12.118-0-lts", "x86_64", humanUptime(),
            mem.free + " MB free of " + mem.total + " MB",
            W + " x " + H + " @ 32 bpp", "hwo 1.0 / PID 1 supervisor",
            "RAM only, no HWO_CFG partition", licensed ? licKey : "none"
        ];

        fill(cx + 36, cy + 128, cw - 72, 1, LINE);
        var half = (cw - 72) / 2 | 0;
        for (var i = 0; i < 8; i++) {
            var col = i % 2, row = i / 2 | 0;
            var bx = cx + 36 + col * half;
            var by = cy + 152 + row * 44;
            text(faces.body, bx, by, DIM, labels[i]);
            text(faces.mono, bx + textW(faces.body, labels[i]) + 22, by - 2,
                i === 7 && !licensed ? RED : TEXT, vals[i]);
        }

        var gy = cy + ch + 24, gh = 150, gw = (cw - 24) / 2 | 0;
        panel(cx, gy, gw, gh, PANEL);
        panel(cx + gw + 24, gy, gw, gh, PANEL);

        text(faces.bold, cx + 28, gy + 22, FAINT, "SESSION");
        text(faces.mono, cx + 28, gy + 58, TEXT, "no shell / no login");
        text(faces.mono, cx + 28, gy + 88, DIM, "no listening sockets");
        text(faces.mono, cx + 28, gy + 118, DIM, "5 UI exits -> reboot");

        text(faces.bold, cx + gw + 52, gy + 22, FAINT, "AGENT");
        text(faces.mono, cx + gw + 52, gy + 58, TEXT, "local");
        text(faces.mono, cx + gw + 52, gy + 88, DIM, "endpoint not configured");
        text(faces.mono, cx + gw + 52, gy + 118, DIM, "poll 30 s / outbound only");
    }

    function drawLicense() {
        var cx = 40, cy = 100, cw = W - 80, ch = licensed ? 372 : 430;
        panel(cx, cy, cw, ch, PANEL);
        fill(cx + 1, cy + 20, 3, ch - 40, licensed ? GREEN : RED);
        text(faces.h1, cx + 36, cy + 30, TEXT, licensed ? "Licence" : "Activate this device");
        chip(cx + cw - 208, cy + 34, licensed ? "ACTIVE" : "UNLICENSED", licensed ? GREEN : RED);

        fill(cx + 36, cy + 126, cw - 72, 1, LINE);

        if (licensed) {
            text(faces.body, cx + 36, cy + 150, DIM, "Device id");
            text(faces.mono, cx + 300, cy + 150, TEXT, devId);
            text(faces.body, cx + 36, cy + 190, DIM, "Key");
            text(faces.mono, cx + 300, cy + 190, GREEN, licKey);
            text(faces.body, cx + 36, cy + 230, DIM, "Bound to");
            text(faces.mono, cx + 300, cy + 230, TEXT, "this machine's DMI UUID");
            text(faces.body, cx + 36, cy + 270, DIM, "Validated");
            text(faces.mono, cx + 300, cy + 270, TEXT, "offline / no activation server");
            text(faces.body, cx + 36, cy + 310, DIM, "Stored on");
            text(faces.mono, cx + 300, cy + 310, AMBER, "initramfs only, lost on reboot");

            var gy = cy + ch + 24, gh = 150;
            panel(cx, gy, cw, gh, PANEL);
            text(faces.bold, cx + 28, gy + 22, FAINT, "WHAT THIS LICENCE COVERS");
            text(faces.body, cx + 28, gy + 60, TEXT, "One machine, perpetual use. Updates for 12 months. Transfers with the DMI UUID.");
            text(faces.body, cx + 28, gy + 96, DIM, "Support: business@hartwell-labs.pl");
            return;
        }

        text(faces.body, cx + 36, cy + 146, DIM, "Send this device id to business@hartwell-labs.pl and type the key you get back.");
        text(faces.body, cx + 36, cy + 176, DIM, "Device id");
        text(faces.mono, cx + 300, cy + 176, AMBER, devId);
        text(faces.body, cx + 36, cy + 226, DIM, "Key");

        var bx = cx + 300, by = cy + 214, bw = 420, bh = 46;
        rrect(bx, by, bw, bh, 8, typed ? GREEN : LINE);
        rrect(bx + 1, by + 1, bw - 2, bh - 2, 7, PANEL2);
        text(faces.mono, bx + 16, by + 13, typed ? TEXT : FAINT, typed || "HWO-YYYY-XXXX");
        if (typed && (frozen || new Date().getSeconds() % 2 === 0)) {
            fill(bx + 17 + textW(faces.mono, typed), by + 12, 2, 22, GREEN);
        }
        hitAdd(bx, by, bw, bh, "field");

        var abx = bx + bw + 24, abw = 168;
        rrect(abx, by, abw, bh, 8, GREEN);
        text(faces.bold, abx + 36, by + 13, 0x08150d, "Activate");
        hitAdd(abx, by, abw, bh, "activate");

        var hint = msg || "Type the key, then ENTER to activate";
        text(faces.body, cx + 36, cy + 290, msg ? (msg.indexOf("Invalid") === 0 ? RED : GREEN) : FAINT, hint);
        text(faces.body, cx + 36, cy + 330, FAINT, "Offline check: the key only works on this machine");

        var gy2 = cy + ch + 24, gh2 = 150, gw2 = (cw - 48) / 3 | 0;
        var hdr = ["1  SEND THE ID", "2  GET THE KEY", "3  TYPE IT HERE"];
        var sub = [
            "This screen shows the machine's own id. Nothing else is needed.",
            "A key in the form HWO-YYYY-XXXX, valid only on this unit.",
            "The appliance starts working the moment the key checks out."
        ];
        for (var i = 0; i < 3; i++) {
            var x = cx + i * (gw2 + 24);
            panel(x, gy2, gw2, gh2, PANEL);
            text(faces.bold, x + 24, gy2 + 22, GREEN, hdr[i]);
            textWrap(faces.body, x + 24, gy2 + 60, gw2 - 48, 26, DIM, sub[i]);
        }
    }

    function drawMedia() {
        var cx = 40, cy = 100, cw = W - 80, ch = 430;
        panel(cx, cy, cw, ch, PANEL);
        text(faces.h1, cx + 36, cy + 34, TEXT, "Media");
        text(faces.body, cx + 36, cy + 90, FAINT, "no media on this unit   |   local files only, no network");
        fill(cx + 36, cy + 126, cw - 72, 1, LINE);

        text(faces.body, cx + 36, cy + 152, TEXT, "Copy PNG frames to the state partition and this screen plays them:");
        text(faces.mono, cx + 36, cy + 190, GREEN, "/state/media/frame0000.png ... frameNNNN.png");
        text(faces.mono, cx + 36, cy + 220, GREEN, "/state/media/fps        (1-60, default 10)");
        text(faces.mono, cx + 36, cy + 250, GREEN, "/state/media/poster.png (single still)");

        text(faces.body, cx + 36, cy + 296, DIM, "Convert a clip on any workstation:");
        text(faces.mono, cx + 36, cy + 326, TEXT, "ffmpeg -i clip.mp4 -vf scale=640:-2 -r 10 /run/media/frame%04d.png");
        text(faces.body, cx + 36, cy + 366, FAINT, "PNG 8-bit (RGB, RGBA, grey or palette), non-interlaced. Frames loop.");
    }

    function drawFooter() {
        var y = H - 64;
        fill(0, y, W, 64, PANEL2);
        fill(0, y, W, 1, LINE);

        var col = licensed ? GREEN : RED;
        var word = licensed ? "LICENSED" : "UNLICENSED";
        var pw = textW(faces.bold, word) + 44;
        rrect(36, y + 18, pw, 28, 14, col & 0xffffff);
        fill(36 + 1, y + 19, pw - 2, 26, PANEL2);
        fill(36 + 12, y + 28, 8, 8, col);
        text(faces.bold, 36 + 26, y + 22, col, word);

        var tabs = [licensed ? "1  Overview" : "F1 Overview",
                    licensed ? "2  System" : "F2 System",
                    "3  Licence", "4  Media"];
        var tw = [], total = 0;
        for (var i = 0; i < 4; i++) {
            tw[i] = textW(faces.body, tabs[i]);
            total += tw[i] + (i ? 40 : 0);
        }
        var tx = (W / 2 | 0) - (total / 2 | 0);
        for (var k = 0; k < 4; k++) {
            var c = page === k ? TEXT : FAINT;
            if (page === k) {
                fill(tx - 12, y + 22, tw[k] + 24, 22, PANEL);
                rrect(tx - 12, y + 54, tw[k] + 24, 3, 2, GREEN);
            }
            text(faces.body, tx, y + 24, c, tabs[k]);
            hitAdd(tx - 12, y + 14, tw[k] + 24, 44, "page" + k);
            tx += tw[k] + 40;
        }

        if (licensed) textR(faces.mono, W - 36, y + 24, FAINT, licKey);
        else if (page === 2) textR(faces.body, W - 36, y + 24, FAINT, "type the key, then ENTER");
        else textR(faces.body, W - 36, y + 24, FAINT, "no shell / no remote login");
    }

    function redraw() {
        drawChrome();
        if (page === 0) drawOverview();
        else if (page === 1) drawSystem();
        else if (page === 2) drawLicense();
        else drawMedia();
        drawFooter();
        img.data.set(fb);
        ctx.putImageData(img, 0, 0);
    }

    /* ---------- input, same keys as the appliance ---------- */
    function activate() {
        var key = typed.trim().toUpperCase();
        if (!/^HWO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
            msg = "Invalid key format - expected HWO-YYYY-XXXX";
            typed = "";
            redraw();
            return;
        }
        licKey = key;
        licensed = true;
        typed = "";
        msg = "";
        page = 0;
        redraw();
    }

    function key(c) {
        /* F1..F4 always navigate, even while the key field has focus */
        if (c >= "\u0001" && c <= "\u0004") { page = c.charCodeAt(0) - 1; redraw(); return; }

        var typing = page === 2 && !licensed;
        if (!typing) {
            if (c === "1") page = 0;
            else if (c === "2") page = 1;
            else if (c === "3") page = 2;
            else if (c === "4") page = 3;
            else return;
            redraw();
            return;
        }
        if (c === "\r" || c === "\n") { activate(); return; }
        if (c === "\b") { typed = typed.slice(0, -1); msg = ""; }
        else if (c.length === 1 && c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126 && typed.length < 20) {
            typed += c.toUpperCase();
            msg = "";
        }
        redraw();
    }

    function onClick(ev) {
        var r = ctx.canvas.getBoundingClientRect();
        var x = (ev.clientX - r.left) * W / r.width;
        var y = (ev.clientY - r.top) * H / r.height;
        for (var i = 0; i < hits.length; i++) {
            var h = hits[i];
            if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) {
                if (h.act.indexOf("page") === 0) page = +h.act.slice(4);
                else if (h.act === "activate") activate();
                else if (h.act === "field") ctx.canvas.focus();
                redraw();
                return;
            }
        }
    }

    function onKey(ev) {
        var k = ev.key;
        if (k === "F1" || k === "F2" || k === "F3" || k === "F4") {
            ev.preventDefault();
            key(String.fromCharCode(+k.slice(1)));
            return;
        }
        if (k === "1" || k === "2" || k === "3" || k === "4") { ev.preventDefault(); key(k); return; }
        if (k === "Enter") { ev.preventDefault(); key("\r"); return; }
        if (k === "Backspace") { ev.preventDefault(); key("\b"); return; }
        if (k.length === 1) { key(k); }
    }

    /* ---------- start ---------- */
    var fontPromise = null;
    function loadFont(url) {
        if (fontPromise) return fontPromise;
        /* the demo page ships the atlas as assets/hwo/font.js (window.HWO_FONT)
           so the first paint needs no extra round trip; the fetch path stays
           for the local test harness */
        if (global.HWO_FONT) fontPromise = Promise.resolve(global.HWO_FONT);
        else fontPromise = fetch(url).then(function (r) { return r.json(); });
        fontPromise = fontPromise.then(function (j) {
            Object.keys(j.faces).forEach(function (k) {
                var f = j.faces[k];
                var bin = atob(f.px);
                var px = new Uint8Array(bin.length);
                for (var i = 0; i < bin.length; i++) px[i] = bin.charCodeAt(i);
                faces[k] = { cell: f.cell, asc: f.asc, glyphs: f.glyphs, px: px };
            });
        });
        return fontPromise;
    }

    function start(canvas, opts) {
        opts = opts || {};
        return loadFont(opts.font || "web/font.json").then(function () {
            return run(canvas, opts);
        });
    }

    function run(canvas, opts) {
        ctx = canvas.getContext("2d", { alpha: false });
        canvas.width = W;
        canvas.height = H;
        img = ctx.createImageData(W, H);
        fill(0, 0, W, H, BG);

        if (opts.freeze) {
            /* deterministic snapshot for the pixel-diff check against the
               screenshot taken off the real framebuffer in QEMU */
            frozen = typeof opts.freeze === "object" ? opts.freeze
                : { clock: "14:18:27", uptime: "0 m 25 s", mem: 403 };
            bootAt = Date.now() - 25000;
        }
        licensed = opts.licensed !== false;
        if (!licensed) { page = 2; typed = ""; }
        loadContent(opts.content || "");
        if (opts.device) devId = opts.device;
        if (opts.key) licKey = opts.key;

        canvas.addEventListener("click", onClick);
        window.addEventListener("keydown", onKey);
        redraw();

        if (!frozen) setInterval(redraw, 1000);
        return { go: function (n) { page = n; redraw(); }, redraw: redraw, key: key };
    }

    global.HartwellOS = { start: start, W: W, H: H };
})(window);

/* the styling engine + every tool, registered into window.TOOLS */
(function () {
  "use strict";
  var NF = window.NF, FD = window.FD;
  var $ = NF.$, $$ = NF.$$;
  window.TOOLS = window.TOOLS || {};

  /* ---------------------------------------------------------------- engine */
  var maps = {};
  FD.styles.forEach(function (s) {
    maps[s.id] = {
      label: s.label,
      up: s.up ? NF.cp(s.up) : null,
      low: s.low ? NF.cp(s.low) : null,
      dig: s.dig ? NF.cp(s.dig) : null
    };
  });
  var comboIds = FD.combos.map(function (c) { return c.id; });
  var comboMark = {};
  FD.combos.forEach(function (c) { comboMark[c.id] = c.mark; });

  var ALL_IDS = FD.styles.map(function (s) { return s.id; }).concat(comboIds);
  var LABEL = {};
  FD.styles.forEach(function (s) { LABEL[s.id] = s.label; });
  FD.combos.forEach(function (c) { LABEL[c.id] = c.label; });
  FD.arStyles.forEach(function (a) { LABEL[a.id] = a.label; });

  function styleLatin(text, id) {
    if (comboMark[id]) {
      return NF.cp(text).map(function (c) { return c + comboMark[id]; }).join("");
    }
    var m = maps[id];
    if (!m) return text;
    var out = NF.cp(text).map(function (c) {
      var k = c.charCodeAt(0);
      if (k >= 65 && k <= 90 && m.up) return m.up[k - 65] || c;
      if (k >= 97 && k <= 122 && m.low) return m.low[k - 97] || c;
      if (k >= 48 && k <= 57 && m.dig) return m.dig[k - 48] || c;
      return c;
    }).join("");
    return id === "flip" ? NF.cp(out).reverse().join("") : out;
  }

  function styleArabic(text, id, seed) {
    var r = NF.rng((seed | 0) || 1);
    return NF.cp(text).map(function (c) {
      var n = r();
      if (c === " ") return " ";
      switch (id) {
        case "ar_harakat": return c + NF.pick(FD.arHarakat, n);
        case "ar_marks": return c + NF.pick(FD.arMarks, n);
        case "ar_sub":
          var a = FD.arSub[c];
          return a ? NF.cp(a)[n % NF.cp(a).length] : c;
        case "ar_tatweel": return c + "ـ";
        case "ar_spaced": return c + " ";
        case "ar_dotted": return c + "ۛ";
        case "ar_shadow": return c + "ٕٓ";
        default:
          var b = FD.arSub[c];
          var base = b ? NF.cp(b)[n % NF.cp(b).length] : c;
          return base + NF.pick(FD.arMarks, n);
      }
    }).join("");
  }

  function applyStyle(text, id, seed) {
    if (id.indexOf("ar_") === 0) return styleArabic(text, id, seed);
    return styleLatin(text, id);
  }
  function styleIdsFor(text) {
    return NF.isArabic(text)
      ? FD.arStyles.map(function (a) { return a.id; })
      : ALL_IDS;
  }
  function frame(text, i) {
    return FD.templates[i % FD.templates.length].replace("{n}", text);
  }

  /* one decorated nickname, matching fancy.py::nickname() */
  function nickname(word, i) {
    if (NF.isArabic(word)) {
      var a = FD.arStyles[i % FD.arStyles.length].id;
      return frame(styleArabic(word, a, i * 7 + 3), i * 5 + 3);
    }
    return frame(styleLatin(word, ALL_IDS[i % ALL_IDS.length]), i * 5);
  }

  NF.engine = {
    applyStyle: applyStyle, styleIdsFor: styleIdsFor, frame: frame,
    nickname: nickname, label: LABEL, allIds: ALL_IDS
  };

  /* ------------------------------------------------------- shared UI pieces */
  function fontRows(box, text) {
    if (!text) { box.innerHTML = '<p class="grid-hint">اكتب اسماً في الحقل أعلاه لعرض النتائج.</p>'; return; }
    var ar = NF.isArabic(text);
    var ids = styleIdsFor(text);
    box.innerHTML = ids.map(function (id, i) {
      var out = applyStyle(text, id, i * 11 + 5);
      return '<div class="font-row' + (ar ? " rtl" : "") + '">' +
        '<span class="fname">' + NF.esc(LABEL[id] || id) + "</span>" +
        '<span class="fout">' + NF.esc(out) + "</span>" +
        '<button type="button" class="btn alt sm" data-copy data-copy-text="' +
        NF.esc(out) + '">نسخ</button></div>';
    }).join("");
  }

  function framedList(text, count, offset) {
    var out = [], ids = styleIdsFor(text);
    for (var i = 0; i < count; i++) {
      var k = i + (offset || 0);
      var body = applyStyle(text, ids[k % ids.length], k * 7 + 3);
      out.push(frame(body, k * 5 + (NF.isArabic(text) ? 3 : 0)));
    }
    return out;
  }

  /* ---------------------------------------------------------------- tools */

  /* زخرفة الأسماء — the big editor */
  TOOLS["fancy-text"] = function (root) {
    var inp = $("#ft-name", root), fonts = $("#ft-fonts", root),
      framed = $("#ft-framed", root), syms = $("#ft-symbols", root),
      cats = $("#ft-cats", root), pad = $("#ft-pad", root),
      note = $("#ft-note", root);

    function run() {
      var v = inp.value.trim();
      fontRows(fonts, v);
      NF.grid(framed, v ? framedList(v, 36, 0) : []);
      if (!v) framed.innerHTML = "";
    }
    inp.addEventListener("input", run);
    $("#ft-go", root).addEventListener("click", run);
    $("#ft-clear", root).addEventListener("click", function () {
      inp.value = ""; run(); inp.focus();
    });

    /* symbol palette */
    function showCat(id) {
      var set = FD.symbols.filter(function (s) { return s.id === id; })[0];
      if (!set) return;
      syms.innerHTML = set.chars.map(function (c) {
        return '<button type="button" class="sym" data-sym>' + NF.esc(c) + "</button>";
      }).join("");
      $$(".chip", cats).forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-cat") === id);
      });
    }
    cats.innerHTML = FD.symbols.map(function (s) {
      return '<button type="button" class="chip" data-cat="' + s.id + '">' +
        NF.esc(s.label) + "</button>";
    }).join("");
    cats.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (b) showCat(b.getAttribute("data-cat"));
    });
    syms.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sym]");
      if (!b) return;
      pad.value += b.textContent;
      pad.focus();
    });
    showCat(FD.symbols[0].id);

    $("#ft-pad-copy", root).addEventListener("click", function () {
      if (!pad.value) return;
      NF.copy(pad.value);
      note.textContent = "تم نسخ النص ✓";
      setTimeout(function () { note.textContent = ""; }, 1800);
    });
    $("#ft-pad-clear", root).addEventListener("click", function () {
      pad.value = ""; pad.focus();
    });
    $("#ft-pad-send", root).addEventListener("click", function () {
      if (inp.value.trim()) pad.value += inp.value.trim();
      pad.focus();
    });
    run();
  };

  /* مولد الأسماء العشوائي */
  TOOLS["name-generator"] = function (root) {
    var out = $("#ng-out", root), letters = $("#ng-letters", root),
      lang = $("#ng-lang", root), seed = Date.now() % 100000;

    function build() {
      var pre = (letters.value || "").trim();
      var isAr = lang.value === "ar";
      var r = NF.rng(seed++);
      var list = [];
      for (var i = 0; i < 24; i++) {
        var n = r(), word;
        if (isAr) {
          word = NF.pick(FD.baseAr, n);
          if (n % 3 === 0) word = NF.pick(FD.arPre, n >> 3) + " " + NF.pick(FD.arSec, n >> 5);
        } else {
          word = NF.pick(FD.baseLatin, n);
          if (n % 3 === 0) word += NF.pick(FD.sufLatin, n >> 4);
        }
        if (pre) word = pre + (isAr ? "" : "") + word;
        list.push(nickname(word, (n >> 2) % 400));
      }
      NF.grid(out, list);
    }
    $("#ng-go", root).addEventListener("click", build);
    lang.addEventListener("change", build);
    build();
  };

  /* مزج اسمين */
  TOOLS["mix-names"] = function (root) {
    var a = $("#mx-a", root), b = $("#mx-b", root), out = $("#mx-out", root);

    function parts(w) {
      var v = NF.cp(w.trim());
      if (v.length < 2) return [w, w];
      var h = Math.max(1, Math.round(v.length / 2));
      return [v.slice(0, h).join(""), v.slice(h).join("")];
    }
    function build() {
      var x = a.value.trim(), y = b.value.trim();
      if (!x || !y) {
        out.innerHTML = '<p class="grid-hint">اكتب اسمين لعرض الدمج.</p>';
        return;
      }
      var pa = parts(x), pb = parts(y), combos = [];
      var raw = [pa[0] + pb[1], pb[0] + pa[1], pa[0] + pb[0], pa[1] + pb[1],
      x + pb[1], pb[0] + y, pa[0] + "-" + pb[1], pb[0] + "_" + pa[1],
      x + " " + y, y + " " + x, pa[0] + pb[1] + pa[1], pb[0] + pa[1] + pb[1]];
      raw.forEach(function (w, i) {
        combos.push(w);
        combos.push(nickname(w, i * 3 + 1));
        combos.push(nickname(w, i * 3 + 7));
      });
      NF.grid(out, combos);
    }
    $("#mx-go", root).addEventListener("click", build);
    a.addEventListener("input", build);
    b.addEventListener("input", build);
    build();
  };

  /* تحويل الاسم إلى رموز */
  TOOLS["symbols-name"] = function (root) {
    var inp = $("#sn-name", root), out = $("#sn-out", root);
    function build() {
      var v = inp.value.trim();
      if (!v) { out.innerHTML = '<p class="grid-hint">اكتب اسمك لعرض النتائج.</p>'; return; }
      var list = [], ids = styleIdsFor(v);
      for (var i = 0; i < 48; i++) {
        var body = applyStyle(v, ids[i % ids.length], i * 9 + 2);
        var pre = NF.pick(FD.prefix, i * 3), suf = NF.pick(FD.suffix, i * 3 + 1);
        list.push(i % 2 ? frame(body, i * 7) : pre + body + suf);
      }
      NF.grid(out, list);
    }
    inp.addEventListener("input", build);
    $("#sn-go", root).addEventListener("click", build);
    build();
  };

  /* مولد النصوص المزخرفة (نص طويل) */
  TOOLS["cool-text"] = function (root) {
    var inp = $("#ct-text", root), out = $("#ct-out", root);
    function build() { fontRows(out, inp.value.trim()); }
    inp.addEventListener("input", build);
    $("#ct-go", root).addEventListener("click", build);
    build();
  };

  /* مولد كلمات المرور */
  TOOLS["password-generator"] = function (root) {
    var len = $("#pw-len", root), out = $("#pw-out", root),
      bar = $("#pw-bar", root), lbl = $("#pw-strength", root),
      lenv = $("#pw-lenv", root);
    var sets = {
      "pw-lower": "abcdefghijkmnopqrstuvwxyz",
      "pw-upper": "ABCDEFGHJKLMNPQRSTUVWXYZ",
      "pw-dig": "23456789",
      "pw-sym": "!@#$%^&*()-_=+[]{};:,.?/"
    };
    function rand(max) {
      if (window.crypto && window.crypto.getRandomValues) {
        var a = new Uint32Array(1);
        window.crypto.getRandomValues(a);
        return a[0] % max;
      }
      return Math.floor(Math.random() * max);
    }
    function build() {
      var pool = "", n = parseInt(len.value, 10) || 16;
      lenv.textContent = n;
      Object.keys(sets).forEach(function (k) {
        var el = $("#" + k, root);
        if (el && el.checked) pool += sets[k];
      });
      if (!pool) pool = sets["pw-lower"];
      var pw = "";
      for (var i = 0; i < n; i++) pw += pool.charAt(rand(pool.length));
      out.textContent = pw;
      var bits = Math.round(n * Math.log2(pool.length));
      var pct = Math.min(100, Math.round(bits / 128 * 100));
      bar.style.width = pct + "%";
      bar.style.background = bits < 50 ? "#f87171" : bits < 80 ? "#fbbf24" : "#34d399";
      lbl.textContent = "قوة التشفير التقديرية: " + bits + " بت — " +
        (bits < 50 ? "ضعيفة" : bits < 80 ? "متوسطة" : bits < 110 ? "قوية" : "قوية جداً");
    }
    len.addEventListener("input", build);
    $$("input[type=checkbox]", root).forEach(function (c) {
      c.addEventListener("change", build);
    });
    $("#pw-go", root).addEventListener("click", build);
    $("#pw-copy", root).addEventListener("click", function () {
      NF.copy(out.textContent, out);
    });
    build();
  };

  /* أسماء مواقع ونطاقات */
  TOOLS["domain-names"] = function (root) {
    var kw = $("#dn-kw", root), out = $("#dn-out", root);
    var pre = ["my", "the", "go", "get", "try", "best", "top", "pro", "arab", "saudi"];
    var suf = ["hub", "zone", "lab", "spot", "base", "kit", "ly", "io", "now", "app",
      "store", "world", "point", "gate", "line"];
    var tld = [".com", ".net", ".bio", ".online", ".sa", ".store", ".site", ".app"];
    function build() {
      var v = kw.value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!v) { out.innerHTML = '<p class="grid-hint">اكتب كلمة إنجليزية لتوليد أسماء نطاقات.</p>'; return; }
      var list = [];
      for (var i = 0; i < 30; i++) {
        var n = i * 37 + 11;
        var base = i % 3 === 0 ? NF.pick(pre, n) + v
          : i % 3 === 1 ? v + NF.pick(suf, n) : NF.pick(pre, n) + v + NF.pick(suf, n + 3);
        list.push(base + NF.pick(tld, n));
      }
      NF.grid(out, list);
    }
    kw.addEventListener("input", build);
    $("#dn-go", root).addEventListener("click", build);
    build();
  };

  /* وجوه يابانية */
  TOOLS["kaomoji"] = function (root) {
    var out = $("#km-out", root);
    NF.grid(out, FD.kaomoji);
  };

  /* صفحات الأسماء الجاهزة — مولّد مصغّر */
  TOOLS["kwtool"] = function (root) {
    var inp = $("#kw-name", root), out = $("#kw-out", root);
    function build() {
      var v = inp.value.trim();
      if (!v) { out.innerHTML = '<p class="grid-hint">اكتب اسمك لتوليد نسخ مزخرفة.</p>'; return; }
      NF.grid(out, framedList(v, 30, 0));
    }
    inp.addEventListener("input", build);
    $("#kw-go", root).addEventListener("click", build);
    build();
  };

  /* صفحات قوائم الأسماء (أولاد/بنات) — زخرفة سريعة لأي اسم */
  TOOLS["namelist"] = TOOLS["kwtool"];
})();

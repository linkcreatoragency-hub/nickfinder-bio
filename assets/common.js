/* shared helpers — loads before everything else */
(function () {
  "use strict";

  window.NF = window.NF || {};
  var NF = window.NF;

  NF.$ = function (sel, root) { return (root || document).querySelector(sel); };
  NF.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* deterministic PRNG so server-rendered and client-rendered output can match */
  NF.rng = function (seed) {
    var n = (seed | 0) || 1;
    return function () {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      return n;
    };
  };
  NF.pick = function (arr, n) { return arr[n % arr.length]; };

  /* split a string into code points — required because most style maps are astral */
  NF.cp = function (s) { return Array.from(s); };

  NF.isArabic = function (s) { return /[؀-ۿݐ-ݿ]/.test(s); };

  NF.copy = function (text, el) {
    var done = function () {
      if (!el) return;
      el.classList.add("copied");
      setTimeout(function () { el.classList.remove("copied"); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        NF.fallbackCopy(text); done();
      });
    } else { NF.fallbackCopy(text); done(); }
  };

  NF.fallbackCopy = function (text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  };

  NF.esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  /* renders an array of strings into a .nick-grid */
  NF.grid = function (box, items) {
    box.innerHTML = items.map(function (t) {
      return '<button type="button" class="nick" data-copy>' +
        '<span class="nick-t">' + NF.esc(t) + "</span></button>";
    }).join("");
  };

  /* global click delegation: anything with [data-copy] copies its text */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-copy]") : null;
    if (!el) return;
    var txt = el.getAttribute("data-copy-text") || el.textContent.trim();
    if (txt) NF.copy(txt, el);
  });

  /* mobile nav */
  document.addEventListener("DOMContentLoaded", function () {
    var btn = NF.$(".nav-toggle"), nav = NF.$("#mainnav");
    if (btn && nav) {
      btn.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
      });
    }
  });
})();

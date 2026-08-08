/* loads LAST — dispatches every [data-tool] block to its handler.
   Deferred scripts run when document.readyState is already "interactive", so a
   shared ready() helper would fire before tools.js finished registering.  This
   file exists purely to guarantee ordering. */
(function () {
  "use strict";
  function boot() {
    var blocks = document.querySelectorAll("[data-tool]");
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i], name = el.getAttribute("data-tool");
      var fn = window.TOOLS && window.TOOLS[name];
      if (typeof fn !== "function") continue;
      try { fn(el); } catch (e) {
        if (window.console) console.error("tool " + name + " failed:", e);
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();

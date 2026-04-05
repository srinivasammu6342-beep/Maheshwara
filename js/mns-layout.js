/**
 * Breaking ticker (Supabase via /api/news/ticker) + premium header scroll solid state.
 * Requires: #mns-ticker-track, optional #mns-premium-header
 */
(function () {
  function apiBase() {
    var cfg = window.MNS_CONFIG || {};
    return typeof cfg.apiBase === "string" ? cfg.apiBase.replace(/\/$/, "") : "";
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  async function loadTicker() {
    var el = document.getElementById("mns-ticker-track");
    if (!el) return;
    el.classList.add("mns-ticker-text");
    var fallback =
      '<span class="pr-12 font-sans font-bold tracking-tight text-white">Maheshwara Nexlify Nucleus</span>' +
      '<span class="pr-14 font-telugu font-bold text-white">ముతరం · పెద్దపల్లి జిల్లా, తెలంగాణ — 505184</span>';
    try {
      var r = await fetch(apiBase() + "/api/flash-news/ticker");
      var j = await r.json();
      var items = (j.items || []).map(function (x) {
        return x.message;
      }).filter(Boolean);
      if (!items.length) {
        var r2 = await fetch(apiBase() + "/api/news/ticker");
        var j2 = await r2.json();
        items = (j2.items || []).map(function (x) {
          return x.title;
        }).filter(Boolean);
      }
      if (!items.length) {
        el.innerHTML = fallback;
        return;
      }
      el.classList.add("mns-marquee-smooth");
      var dup = items.concat(items);
      el.innerHTML = dup
        .map(function (t) {
          return (
            '<span class="inline-flex items-center gap-2 pr-10 font-telugu font-bold tracking-wide text-white">' +
            '<span class="shrink-0 text-white" aria-hidden="true">●</span>' +
            escapeHtml(t) +
            "</span>"
          );
        })
        .join("");
    } catch (e) {
      el.innerHTML = fallback;
    }
  }

  function headerScroll() {
    var h = document.getElementById("mns-premium-header");
    if (!h) return;
    var scroll = window.scrollY || document.documentElement.scrollTop;
    if (scroll > 20) h.classList.add("mns-header-solid");
    else h.classList.remove("mns-header-solid");
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadTicker();
    headerScroll();
    window.addEventListener("scroll", headerScroll, { passive: true });
  });
})();

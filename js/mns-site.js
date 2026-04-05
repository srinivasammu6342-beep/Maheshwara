/**
 * Telangana clock (#mns-header-clock), visitor ping + #mns-visitor-total / #mns-visitor-today.
 * Requires config.js (MNS_CONFIG.apiBase).
 */
(function () {
  function apiBase() {
    var cfg = window.MNS_CONFIG || {};
    return typeof cfg.apiBase === "string" ? cfg.apiBase.replace(/\/$/, "") : "";
  }

  function startClock() {
    var el = document.getElementById("mns-header-clock");
    if (!el) return;
    function tick() {
      var now = new Date();
      var dateStr = now.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      var timeStr = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
      el.textContent = dateStr + " · " + timeStr + " IST";
    }
    tick();
    setInterval(tick, 1000);
  }

  async function loadVisitorDisplay() {
    var totalEl = document.getElementById("mns-visitor-total");
    var todayEl = document.getElementById("mns-visitor-today");
    if (!totalEl && !todayEl) return;

    try {
      var r = await fetch(apiBase() + "/api/stats/public");
      var j = await r.json();
      if (totalEl) totalEl.textContent = j.total != null ? String(j.total) : "—";
      if (todayEl) todayEl.textContent = j.today != null ? String(j.today) : "—";
    } catch (e) {
      if (totalEl) totalEl.textContent = "—";
      if (todayEl) todayEl.textContent = "—";
    }

    try {
      if (sessionStorage.getItem("mns_visit_ping") === "1") return;
      var pr = await fetch(apiBase() + "/api/stats/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      var pj = await pr.json();
      sessionStorage.setItem("mns_visit_ping", "1");
      if (pj && pj.ok) {
        if (totalEl) totalEl.textContent = pj.total != null ? String(pj.total) : totalEl.textContent;
        if (todayEl) todayEl.textContent = pj.today != null ? String(pj.today) : todayEl.textContent;
      }
    } catch (e2) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    startClock();
    loadVisitorDisplay();
  });
})();

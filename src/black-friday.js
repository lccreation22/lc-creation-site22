(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root && root.document) { root.LCBlackFriday = api; api.mount(root, root.document); }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var id = 'black-friday-2026';
  // Midnight in Belgium on 1 December: no active offer from this instant.
  var expiresAt = Date.parse('2026-11-30T23:00:00Z');
  var condition = 'Doseur automatique offert, pose comprise — valeur 1 600 €. Pour tout projet avec devis signé au plus tard le 30 novembre 2026 inclus, heure de Bruxelles. Les devis déjà remis et non signés sont également concernés. L’envoi de ce formulaire ne constitue pas une signature. L’application de l’avantage sur un équipement déjà prévu est précisée dans votre devis actualisé.';
  function isActive(now) { return Number(now === undefined ? Date.now() : now) < expiresAt; }
  function decorateSubmission(payload, rows) {
    var marker = 'OFFRE BLACK FRIDAY 2026', suffix = marker + '\n' + condition;
    var cleanRows = (rows || []).filter(function (row) { return row[0] !== 'Offre Black Friday'; });
    if (payload.promotion && payload.promotion.id === id) {
      delete payload.promotion;
      if (String(payload.message || '').endsWith(suffix)) payload.message = payload.message.slice(0, -suffix.length).trimEnd();
    }
    if (!isActive()) return { rows: cleanRows, promotion: null };
    var promotion = { id: id, label: 'Black Friday — dosage automatique', value: 1600, placementIncluded: true, deadline: '2026-11-30', timezone: 'Europe/Brussels', status: 'Application à confirmer au devis signé', condition: condition };
    payload.promotion = promotion;
    if (String(payload.message || '').indexOf(marker) < 0) payload.message = [payload.message, suffix].filter(Boolean).join('\n\n');
    return { rows: cleanRows.concat([['Offre Black Friday', condition]]), promotion: promotion };
  }
  function mount(w, d) {
    var lastActive, timer;
    function refresh() {
      var active = isActive();
      d.querySelectorAll('[data-bf-active]').forEach(function (node) { node.hidden = !active; });
      d.querySelectorAll('[data-bf-ended]').forEach(function (node) { node.hidden = active; });
      var fromOffer = new URLSearchParams(w.location.search).get('offre') === id || d.body.dataset.page === 'black-friday.html';
      d.querySelectorAll('a[href*="configurateur"],a[href*="configurer.html"],a[data-preserve-serenite],a[href*="piscine-bali.html#"]').forEach(function (link) {
        var url = new URL(link.href, w.location.href);
        if (url.origin !== w.location.origin) return;
        if (active && fromOffer) url.searchParams.set('offre', id);
        if (!active && url.searchParams.get('offre') === id) url.searchParams.delete('offre');
        link.href = url.pathname.split('/').pop() + url.search + url.hash;
      });
      if (lastActive !== undefined && lastActive !== active) w.dispatchEvent(new w.CustomEvent('lc:black-friday-change'));
      lastActive = active;
      if (timer) w.clearTimeout(timer);
      if (active) timer = w.setTimeout(refresh, Math.min(expiresAt - Date.now() + 10, 2147483647));
    }
    refresh();
    d.addEventListener('visibilitychange', function () { if (!d.hidden) refresh(); });
    w.addEventListener('pageshow', refresh);
  }
  return { id: id, expiresAt: expiresAt, condition: condition, isActive: isActive, decorateSubmission: decorateSubmission, mount: mount };
});

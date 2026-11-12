(function (w, d) {
  'use strict';
  var production = /^(www\.)?lc-creation\.be$/i.test(w.location.hostname);
  var active = new WeakSet();
  var completed = new WeakSet();

  function track(method, data) {
    if (!production) return null;
    try { return w.LCTracking && w.LCTracking[method](data); } catch (_) { return null; }
  }
  function money(amount) {
    return Number(amount).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  }
  function status(node, message, kind) {
    node.replaceChildren();
    node.className = 'lc-form-status' + (kind ? ' is-' + kind : '');
    node.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
    node.textContent = message;
  }
  function recap(node, rows) {
    var list = d.createElement('dl');
    list.className = 'lc-local-recap';
    rows.forEach(function (row) {
      var term = d.createElement('dt'), value = d.createElement('dd');
      term.textContent = row[0]; value.textContent = row[1] || 'À préciser';
      list.appendChild(term); list.appendChild(value);
    });
    node.appendChild(list);
  }
  function valid(form) {
    form.querySelectorAll('input[required], textarea[required]').forEach(function (input) {
      if (input.type !== 'checkbox' && input.type !== 'radio') input.setCustomValidity(input.value.trim() ? '' : 'Merci de compléter ce champ.');
    });
    return form.reportValidity();
  }
  function clearCustomValidation(form) {
    form.addEventListener('input', function (event) {
      if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
      if (event.target.hasAttribute('aria-invalid')) event.target.removeAttribute('aria-invalid');
    });
  }
  async function send(payload, options) {
    var button = options.button, node = options.status;
    if (active.has(button) || completed.has(button)) return false;
    var originalLabel = button.textContent;
    if (!production) {
      status(node, 'Prévisualisation : demande non envoyée.', 'preview');
      var note = d.createElement('p');
      note.textContent = 'Voici votre récapitulatif local. Aucune demande ni donnée de suivi n’a été transmise.';
      node.appendChild(note);
      recap(node, options.rows || []);
      node.focus();
      return false;
    }
    active.add(button); button.disabled = true; button.textContent = 'Envoi en cours…';
    status(node, 'Transmission de votre projet…', 'pending');
    var tracking = track('prepare');
    if (tracking) {
      if (options.sourceOffer) tracking.source_offer = options.sourceOffer;
      payload.tracking = tracking;
    }
    try {
      var response = await w.fetch('/api/send-piscine-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      var data = await response.json();
      if (!response.ok || data.ok !== true || data.skipped || (options.requireId && !data.id)) throw new Error('Envoi non confirmé');
      completed.add(button);
      track('complete', data);
      button.textContent = 'Demande envoyée';
      status(node, options.successText || 'Votre demande a bien été envoyée. LC Création vous recontactera pour étudier votre projet.', 'success');
      node.focus();
      if (options.saveEstimate) {
        try { w.sessionStorage.setItem('lc-estimation', JSON.stringify({ montant: payload.estimationText, date: Date.now() })); } catch (_) {}
      }
      if (options.successUrl) w.setTimeout(function () { w.location.href = options.successUrl; }, 600);
      return true;
    } catch (_) {
      status(node, 'L’envoi n’a pas été confirmé. Réessayez ou appelez le 0474 69 38 00.', 'error');
      button.disabled = false; button.textContent = 'Réessayer l’envoi'; node.focus();
      return false;
    } finally {
      active.delete(button);
      if (!completed.has(button) && button.textContent === 'Envoi en cours…') button.textContent = originalLabel;
    }
  }
  w.LCForms = { isProduction: production, track: track, money: money, status: status, recap: recap, valid: valid, bindValidation: clearCustomValidation, send: send };
})(window, document);

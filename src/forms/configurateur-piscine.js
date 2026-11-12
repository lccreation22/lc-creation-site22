(function (w, d) {
  'use strict';
  var form = d.getElementById('config-form'), api = w.LCForms, pricing = w.LCPoolPricing;
  if (!form || !api || !pricing) return;
  var currentStep = 1, unlocked = false, evacManual = false, terraceManual = false;
  var previousPack = null, saved = {}, configuration, estimate;
  var steps = form.querySelectorAll('[data-step]'), pills = form.querySelectorAll('[data-step-pill]');
  var next = d.getElementById('config-next'), back = d.getElementById('config-back'), status = d.getElementById('config-status');
  function el(id) { return d.getElementById(id); }
  function value(id) { return el(id).value.trim(); }
  function checked(name) { var input = form.querySelector('input[name="' + name + '"]:checked'); return input ? input.value : ''; }
  function setRadio(name, value) {
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (input) { input.checked = input.value === value; });
  }
  function text(id, value) { el(id).textContent = value; }
  function selectedLeisure() { return Array.from(form.querySelectorAll('input[name="loisir"]:checked')).map(function (input) { return input.value; }); }
  function toggleInclusion(name, included, selectedValue) {
    var inputs = Array.from(form.querySelectorAll('input[name="' + name + '"]'));
    var wasIncluded = Object.prototype.hasOwnProperty.call(saved, name);
    if (included && !wasIncluded) saved[name] = inputs.map(function (input) { return input.checked; });
    inputs.forEach(function (input, index) {
      if (included) input.checked = input.type === 'checkbox' || input.value === selectedValue;
      else if (wasIncluded) input.checked = saved[name][index];
      input.disabled = included;
    });
    if (!included && wasIncluded) delete saved[name];
  }
  function applyInclusions(pack) {
    toggleInclusion('chauffage', pack !== 'Essentiel', 'Pompe à chaleur');
    toggleInclusion('entretien', pack === 'Luxe', 'Avec robot nettoyeur');
    toggleInclusion('serenite', pack === 'Luxe');
    var rgb = form.querySelector('input[name="loisir"][value="Spot LED couleur (RGB)"]');
    if (pack === 'Luxe' && previousPack !== 'Luxe') { saved.rgb = rgb.checked; rgb.checked = true; }
    if (pack !== 'Luxe' && previousPack === 'Luxe') { rgb.checked = saved.rgb || false; delete saved.rgb; }
    rgb.disabled = pack === 'Luxe';
    var manual = form.querySelector('input[name="traitement"][value="Traitement manuel"]');
    if (pack === 'Luxe' && previousPack !== 'Luxe') {
      saved.traitement = checked('traitement');
      if (checked('traitement') === 'Traitement manuel') setRadio('traitement', 'Pompe doseuse');
    }
    if (pack !== 'Luxe' && previousPack === 'Luxe') {
      if (checked('traitement') === 'Pompe doseuse' && saved.traitement === 'Traitement manuel') setRadio('traitement', saved.traitement);
      delete saved.traitement;
    }
    manual.disabled = pack === 'Luxe'; previousPack = pack;
  }
  function read() {
    return {
      typeProjet: checked('type_projet'), terrain: value('config-terrain'), codePostal: value('config-code-postal'),
      taille: checked('taille'), pack: checked('pack'), pose: checked('pose'), liner: checked('liner_color'),
      chauffage: checked('chauffage'), traitement: checked('traitement'), entretien: checked('entretien'), loisirs: selectedLeisure(),
      evacuation: checked('evacuation'), evacuationM3: Number(value('config-evac-m3')) || 0,
      terrasseMateriau: checked('plage_materiau'), terrasseM2: Number(value('config-plage-surface')) || 0,
      serenite: form.querySelector('input[name="serenite"]').checked
    };
  }
  function update() {
    var pack = checked('pack'); applyInclusions(pack);
    var c = read(), needsTerrace = c.typeProjet !== 'Piscine seule';
    el('config-plage-block').hidden = !needsTerrace;
    el('config-plage-block').style.display = needsTerrace ? '' : 'none';
    if (!needsTerrace) { setRadio('plage_materiau', 'Aucune'); el('config-plage-surface').value = '0'; terraceManual = false; }
    if (c.evacuation === 'Oui') {
      if (!evacManual) el('config-evac-m3').value = pricing.defaultEvacuation(c.taille, c.pose);
      el('config-evac-volume-row').style.display = 'block';
    } else {
      el('config-evac-volume-row').style.display = 'none'; el('config-evac-m3').value = '0'; evacManual = false;
    }
    if (needsTerrace && checked('plage_materiau') !== 'Aucune') {
      if (!terraceManual) el('config-plage-surface').value = pricing.defaultTerrace(c.taille);
    } else { el('config-plage-surface').value = '0'; terraceManual = false; }
    el('config-plage-surface').disabled = checked('plage_materiau') === 'Aucune';
    c = read(); configuration = c; estimate = pricing.calculate(c);
    form.querySelectorAll('.config-radio-option,.config-check-option').forEach(function (label) {
      var input = label.querySelector('input');
      label.classList.toggle('active', input.checked); label.classList.toggle('is-included', input.disabled);
    });
    text('summary-type-projet', c.typeProjet);
    text('summary-terrain', 'Terrain : ' + c.terrain);
    text('summary-code-postal', 'Code postal : ' + (c.codePostal || 'à préciser'));
    text('summary-pose', 'Pose : ' + c.pose);
    text('summary-pack', c.pack);
    text('summary-taille', 'Taille : ' + c.taille);
    text('summary-margelles', 'Margelles : ' + (c.pack === 'Luxe' ? 'bois exotique' : 'bois'));
    text('summary-budget', 'Budget envisagé : ' + el('config-budget').selectedOptions[0].textContent);
    text('summary-chauffage', 'Chauffage : ' + c.chauffage + (c.pack !== 'Essentiel' ? ' (inclus)' : ''));
    text('summary-traitement', 'Traitement : ' + c.traitement + (c.pack === 'Luxe' && c.traitement === 'Pompe doseuse' ? ' (inclus)' : ''));
    text('summary-couverture', 'Couverture : ' + ({ Essentiel: 'bâche à bulles + enrouleur inclus', Confort: 'volet manuel à lames PVC inclus', Luxe: 'volet motorisé à lames polycarbonate inclus' })[c.pack]);
    text('summary-entretien', 'Entretien : ' + c.entretien + (c.pack === 'Luxe' ? ' (inclus)' : ''));
    text('summary-loisir', 'Loisirs : ' + (c.loisirs.length ? c.loisirs.join(', ') : c.pack === 'Confort' ? 'LED blanches incluses' : 'aucun équipement spécifique'));
    text('summary-liner', 'Couleur du liner : ' + c.liner + (c.liner !== 'Blue' ? ' (+' + api.money(pricing.LINER_SURCHARGE) + ')' : ' (inclus)'));
    text('summary-evac', c.evacuation === 'Oui' ? 'Évacuation : oui — ' + (c.evacuationM3 > 0 ? c.evacuationM3 + ' m³ estimés' : 'volume à confirmer') : 'Évacuation : non');
    text('summary-serenite', 'Pack Sérénité : ' + (c.pack === 'Luxe' ? 'inclus dans Luxe' : c.serenite ? api.money(pricing.SERENITE_ANNUAL) + '/an' : 'non sélectionné'));
    text('summary-plage', 'Plage / terrasse : ' + (c.terrasseMateriau === 'Aucune' ? 'aucune' : c.terrasseMateriau + ' — ' + c.terrasseM2 + ' m² estimés'));
    text('summary-delai', 'Délai souhaité : ' + value('config-delai'));
    text('summary-contact-pref', 'Contact : ' + value('config-contact-pref'));
    text('summary-price', unlocked ? api.money(estimate.rounded) : 'Après validation');
    text('summary-annual', estimate.annual ? '+ ' + api.money(estimate.annual) + '/an pour le Pack Sérénité (hors montant du chantier).' : c.pack === 'Luxe' ? 'Pack Sérénité inclus dans Luxe.' : '');
    var halo = c.loisirs.indexOf('Bandeau LED sous margelles (Halo)') >= 0;
    var hint = el('halo-hint');
    if (halo && !hint) {
      hint = d.createElement('p'); hint.id = 'halo-hint'; hint.className = 'config-hint';
      hint.textContent = 'Bandeau LED Signature : chiffrage personnalisé selon longueur, câblage et alimentation. Non inclus dans cette estimation.';
      el('config-loisir').appendChild(hint);
    } else if (!halo && hint) hint.remove();
  }
  function showStep(number, focus) {
    currentStep = number;
    steps.forEach(function (step) { var active = Number(step.dataset.step) === number; step.hidden = !active; step.classList.toggle('active', active); });
    pills.forEach(function (pill) {
      var active = Number(pill.dataset.stepPill) === number;
      pill.classList.toggle('active', active); if (active) pill.setAttribute('aria-current', 'step'); else pill.removeAttribute('aria-current');
    });
    text('config-step-current', number); back.disabled = number === 1;
    next.textContent = number === 4 ? 'Envoyer ma configuration et voir l’estimation' : 'Étape suivante';
    api.track('step', number);
    if (focus) {
      var section = form.querySelector('[data-step="' + number + '"]'); section.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: w.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  function validStep(number) {
    var inputs = form.querySelector('[data-step="' + number + '"]').querySelectorAll('input,select,textarea');
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      if (input.required && !input.value.trim()) input.setCustomValidity('Merci de compléter ce champ.');
      if (!input.checkValidity()) {
        showStep(number, false); input.setAttribute('aria-invalid', 'true'); input.reportValidity(); input.focus();
        api.status(status, 'Vérifiez le champ indiqué pour continuer.', 'error'); return false;
      }
    }
    return true;
  }
  function summaryText(id) { return el(id).textContent; }
  function buildPayload() {
    var c = configuration;
    var additions = ['summary-pose', 'summary-liner', 'summary-evac', 'summary-plage', 'summary-serenite'].map(summaryText);
    if (c.typeProjet === 'Piscine + réaménagement complet du jardin') additions.push('Aménagement complet : implantation, terrasses, circulations et plantations à étudier et à chiffrer.');
    if (c.loisirs.indexOf('Bandeau LED sous margelles (Halo)') >= 0) additions.push('Bandeau LED Halo : chiffrage personnalisé en supplément, hors estimation.');
    return {
      prenom: value('config-prenom'), nom: value('config-nom'), emailClient: value('config-email'), tel: value('config-tel'),
      message: [value('config-message'), 'DÉTAILS DE LA CONFIGURATION\n' + additions.join('\n')].filter(Boolean).join('\n\n'),
      codePostal: c.codePostal, terrain: c.terrain, typeProjet: c.typeProjet, pack: c.pack, taille: c.taille,
      budgetText: summaryText('summary-budget'), chauffageTxt: summaryText('summary-chauffage'), traitementTxt: summaryText('summary-traitement'),
      couvertureTxt: summaryText('summary-couverture'), entretienTxt: summaryText('summary-entretien'), loisirsTxt: summaryText('summary-loisir'),
      delaiTxt: summaryText('summary-delai'), contactPrefTxt: summaryText('summary-contact-pref'), estimationText: summaryText('summary-price'), website: '',
      pose: c.pose, liner: c.liner, linerColor: c.liner, linerSupplement: c.liner === 'Blue' ? 0 : pricing.LINER_SURCHARGE,
      evacuation: c.evacuation, evacuationM3: c.evacuationM3, terrasseMateriau: c.terrasseMateriau, terrasseM2: c.terrasseM2,
      evacChoice: c.evacuation, evacM3: c.evacuationM3, plageMateriau: c.terrasseMateriau, plageSurface: c.terrasseM2,
      serenite: c.serenite, sereniteInclus: estimate.sereniteIncluded, sereniteAnnuel: estimate.annual,
      configurationDetails: additions.join('\n')
    };
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (next.disabled || !validStep(currentStep)) return;
    if (currentStep < 4) { api.status(status, '', ''); showStep(currentStep + 1, true); return; }
    for (var number = 1; number <= 4; number++) if (!validStep(number)) return;
    unlocked = true; update();
    var payload = buildPayload();
    await api.send(payload, {
      button: next, status: status, successUrl: '/merci-configurateur.html', saveEstimate: true,
      rows: [['Projet', payload.typeProjet], ['Format et pack', payload.taille + ' — ' + payload.pack], ['Options', [payload.chauffageTxt, payload.traitementTxt, payload.entretienTxt, payload.loisirsTxt].join('\n')], ['Configuration', payload.configurationDetails], ['Estimation indicative TVAC', payload.estimationText], ['Votre message', value('config-message')]]
    });
  });
  back.addEventListener('click', function () { if (currentStep > 1 && !next.disabled) showStep(currentStep - 1, true); });
  pills.forEach(function (pill) { pill.addEventListener('click', function () { if (!next.disabled) showStep(Number(pill.dataset.stepPill), true); }); });
  el('config-cancel').addEventListener('click', function () {
    if (next.disabled) return;
    form.reset(); unlocked = false; evacManual = false; terraceManual = false; saved = {}; previousPack = null;
    api.status(status, '', ''); update(); showStep(1, true);
  });
  form.addEventListener('input', function (event) {
    if (event.target.id === 'config-evac-m3') evacManual = true;
    if (event.target.id === 'config-plage-surface') terraceManual = true;
    update();
  });
  // Native label activation is the only source of checked state: one click, one toggle.
  form.addEventListener('change', update);
  api.bindValidation(form);
  d.querySelectorAll('[data-liner-price]').forEach(function (node) { node.textContent = api.money(pricing.LINER_SURCHARGE); });
  d.querySelectorAll('[data-serenite-price]').forEach(function (node) { node.textContent = api.money(pricing.SERENITE_ANNUAL); });
  var query = new URLSearchParams(w.location.search), scope = query.get('scope');
  if (query.get('serenite') === '1') form.querySelector('input[name="serenite"]').checked = true;
  if (scope === 'terrace') setRadio('type_projet', 'Piscine + terrasse / plage');
  if (scope === 'complete') setRadio('type_projet', 'Piscine + réaménagement complet du jardin');
  update(); showStep(1, false);
})(window, document);

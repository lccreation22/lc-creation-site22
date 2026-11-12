(function (w, d) {
  'use strict';
  var form = d.getElementById('lc-project-form'), api = w.LCForms;
  if (!form || !api) return;
  function field(id) { return d.getElementById('project-' + id); }
  function value(id) { return field(id).value.trim(); }
  function options() { return Array.from(form.querySelectorAll('input[name="project-option"]:checked')).map(function (input) { return input.value; }).filter(function (name) { return !(offer.value === 'LC_6_3' && name === 'Pompe à chaleur'); }); }
  function promotionActive() { return !!(w.LCBlackFriday && w.LCBlackFriday.isActive()); }
  function optionLabel(name) { return promotionActive() && name === 'Traitement automatique' ? 'Dosage automatique — offert sous conditions Black Friday' : name; }
  var offer = field('offer'), previousOffer = '', savedPac = false;
  function update() {
    var concrete = offer.value === 'concrete', lc63 = offer.value === 'LC_6_3';
    var pac = field('pac');
    if (lc63 && previousOffer !== 'LC_6_3') { savedPac = pac.checked; pac.checked = true; }
    if (!lc63 && previousOffer === 'LC_6_3') pac.checked = savedPac;
    pac.disabled = lc63; field('pac-help').textContent = lc63 ? 'Incluse dans la LC 6.3' : 'À chiffrer dans votre étude';
    previousOffer = offer.value;
    d.getElementById('lc63-details').hidden = offer.value !== 'LC_6_3';
    d.getElementById('concrete-details').hidden = !concrete;
    var dimensions = d.getElementById('concrete-dimensions'); dimensions.hidden = !concrete; dimensions.disabled = !concrete;
    if (!field('submit').disabled) field('submit').textContent = offer.value === 'LC_6_3' ? 'Envoyer ma configuration LC 6.3' : 'Envoyer mon projet';
    field('summary-offer').textContent = offer.value ? concrete ? 'Piscine béton sur mesure' : 'LC 6.3 — 6 × 3 m' : 'À choisir';
    field('summary-equipment').textContent = lc63 ? 'Volet PVC manuel et pompe à chaleur inclus' : 'À définir dans votre étude';
    field('summary-scope').textContent = value('scope');
    field('summary-serenite').textContent = field('serenite').checked ? 'Pack Sérénité : 399 €/an, hors montant du chantier' : 'Pack Sérénité non sélectionné';
    field('serenite-help').hidden = !lc63;
    field('summary-options').textContent = options().map(optionLabel).join(', ') || 'À préciser ensemble';
    field('summary-price').textContent = offer.value ? concrete ? 'Sur étude personnalisée' : '25 900 € TVAC + options à chiffrer' : 'Choisissez une piscine';
    form.querySelectorAll('.lc-option').forEach(function (label) { label.classList.toggle('active', label.querySelector('input').checked); });
  }
  if (w.location.hash === '#lc-6-3') offer.value = 'LC_6_3';
  if (w.location.hash === '#beton') offer.value = 'concrete';
  var query = new URLSearchParams(w.location.search), scope = query.get('scope');
  field('serenite').checked = query.get('serenite') === '1';
  if (scope === 'terrace') field('scope').value = 'Piscine + terrasse';
  if (scope === 'complete') field('scope').value = 'Piscine + aménagement complet';
  update(); form.addEventListener('change', update); form.addEventListener('input', update); api.bindValidation(form);
  if (typeof w.addEventListener === 'function') w.addEventListener('lc:black-friday-change', update);
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); if (field('submit').disabled || !api.valid(form)) return;
    var concrete = offer.value === 'concrete', amount = Number(value('budget')), selected = options();
    var promotional = promotionActive(), chargeable = selected.filter(function (name) { return !(promotional && name === 'Traitement automatique'); });
    var additional = (concrete ? '' : 'LC 6.3 : volet PVC manuel et pompe à chaleur inclus dans 25 900 € TVAC.\n') + 'Périmètre souhaité : ' + value('scope') + '\n' + (promotional ? 'Autres options souhaitées (à chiffrer)' : 'Options souhaitées (à chiffrer)') + ' : ' + (chargeable.join(', ') || 'aucune autre option sélectionnée');
    if (promotional && selected.indexOf('Traitement automatique') >= 0) additional += '\nDosage automatique sélectionné : offert, pose comprise, sous conditions Black Friday précisées au devis.';
    additional += '\nPack Sérénité : ' + (field('serenite').checked ? '399 €/an, hors montant du chantier' : 'non sélectionné');
    if (!concrete) additional += '\nLe suivi annuel Sérénité est distinct du premier contrôle LC 6.3.';
    var payload = {
      source: 'configurateur-projet', projet: concrete ? 'Piscine béton sur mesure' : 'LC 6.3', poolType: concrete ? 'concrete' : 'wood',
      prenom: value('first'), nom: value('last'), emailClient: value('email'), tel: value('phone'), codePostal: value('postal'), terrain: value('terrain'),
      typeProjet: concrete ? 'Piscine béton sur mesure' : 'Piscine bois premium LC 6.3', pack: concrete ? 'Béton sur mesure — étude personnalisée' : 'LC 6.3',
      taille: concrete ? value('length') + ' × ' + value('width') + ' m' : 'LC 6.3 — 6 × 3 m', length: concrete ? Number(value('length')) : 6, width: concrete ? Number(value('width')) : 3,
      budgetAmount: amount, budgetText: 'Budget envisagé : ' + amount.toLocaleString('fr-BE') + ' € TVAC', delaiTxt: 'Délai souhaité : ' + value('timing'),
      chauffageTxt: concrete ? 'Chauffage : à définir dans l’étude' : 'Pompe à chaleur incluse',
      couvertureTxt: concrete ? 'Couverture : à définir dans l’étude' : 'Volet PVC manuel inclus',
      estimationText: concrete ? 'Sur étude personnalisée — aucun prix calculé' : '25 900 €',
      message: [value('message'), additional].filter(Boolean).join('\n\n'), website: value('website'),
      projectScope: value('scope'), serenite: field('serenite').checked, sereniteAnnuel: field('serenite').checked ? 399 : 0, selectedOptions: selected, includedEquipment: concrete ? [] : ['Volet PVC manuel', 'Pompe à chaleur'], optionsPricing: promotional ? 'Dosage automatique offert sous conditions Black Friday ; autres options sur étude, en supplément du prix de base.' : 'Sur étude, en supplément du prix de base'
    };
    await api.send(payload, {
      button: field('submit'), status: field('status'), requireId: true, sourceOffer: offer.value,
      rows: [['Piscine', payload.taille], ['Équipements inclus', concrete ? 'À définir dans l’étude' : 'Volet PVC manuel et pompe à chaleur'], ['Périmètre', payload.projectScope], [promotional ? 'Envies sélectionnées' : 'Options à chiffrer', selected.map(optionLabel).join(', ') || 'À préciser ensemble'], ['Base de l’offre', concrete ? 'Sur étude personnalisée' : '25 900 € TVAC, volet PVC manuel et PAC inclus, conditions standards, autres options et adaptations en supplément'], ['Suivi annuel', field('serenite').checked ? 'Pack Sérénité — 399 €/an, hors montant du chantier' : 'Non sélectionné'], ['Budget global envisagé', api.money(amount)], ['Délai', value('timing')], ['Votre message', value('message')]]
    });
  });
})(window, document);

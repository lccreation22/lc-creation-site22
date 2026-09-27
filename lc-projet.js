(function () {
  'use strict';
  var form = document.getElementById('lc-project-form');
  if (!form) return;
  function field(id) { return document.getElementById('project-' + id); }
  function value(id) { return field(id).value.trim(); }
  var offer = field('offer'), sent = false, busy = false;
  function selectOffer() {
    var concrete = offer.value === 'concrete';
    document.getElementById('lc63-details').hidden = offer.value !== 'LC_6_3';
    document.getElementById('concrete-details').hidden = !concrete;
    var dimensions = document.getElementById('concrete-dimensions');
    dimensions.hidden = !concrete; dimensions.disabled = !concrete;
    if (!busy && !sent) field('submit').textContent = offer.value === 'LC_6_3' ? 'Demander mon étude LC 6.3' : 'Envoyer mon projet';
  }
  if (location.hash === '#lc-6-3') offer.value = 'LC_6_3';
  if (location.hash === '#beton') offer.value = 'concrete';
  selectOffer(); offer.addEventListener('change', selectOffer);
  function safeTrack(method, data) { try { return window.LCTracking && window.LCTracking[method](data); } catch (_) { return null; } }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy || sent || !form.reportValidity()) return;
    busy = true; field('submit').disabled = true; field('submit').textContent = 'Envoi en cours…'; field('status').textContent = '';
    var concrete = offer.value === 'concrete';
    var amount = Number(value('budget'));
    var payload = {
      source: 'configurateur-projet', projet: concrete ? 'Piscine béton sur mesure' : 'LC 6.3',
      poolType: concrete ? 'concrete' : 'wood',
      prenom: value('first'), nom: value('last'), emailClient: value('email'), tel: value('phone'),
      codePostal: value('postal'), terrain: value('terrain'),
      typeProjet: concrete ? 'Piscine béton sur mesure' : 'Piscine bois premium LC 6.3',
      pack: concrete ? 'Béton sur mesure — étude personnalisée' : 'LC 6.3',
      taille: concrete ? value('length') + ' × ' + value('width') + ' m' : 'LC 6.3 — 6 × 3 m',
      length: concrete ? Number(value('length')) : 6, width: concrete ? Number(value('width')) : 3,
      budgetAmount: amount, budgetText: 'Budget envisagé : ' + amount.toLocaleString('fr-BE') + ' € TVAC',
      delaiTxt: 'Délai souhaité : ' + value('timing'),
      chauffageTxt: concrete ? 'Chauffage : à définir dans l’étude' : 'Pompe à chaleur : en option, en supplément',
      couvertureTxt: concrete ? 'Couverture : à définir dans l’étude' : 'Volet solaire inclus',
      estimationText: concrete ? 'Sur étude personnalisée — aucun prix calculé' : '25 900 €',
      message: value('message'), website: value('website')
    };
    var tracking = safeTrack('prepare');
    if (tracking) { tracking.source_offer = offer.value; payload.tracking = tracking; }
    try {
      var response = await fetch('/api/send-piscine-lead', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      var data = await response.json();
      if (!response.ok || data.ok !== true || !data.id || data.skipped) throw new Error('Envoi non confirmé');
      sent = true; safeTrack('complete', data);
      field('submit').textContent = 'Demande envoyée';
      field('status').textContent = 'Votre demande a bien été envoyée. LC Création vous recontactera pour étudier votre projet.';
      field('status').focus();
    } catch (_) {
      field('status').textContent = 'L’envoi n’a pas été confirmé. Réessayez ou appelez le 0474 69 38 00.';
      field('submit').disabled = false; field('submit').textContent = 'Réessayer l’envoi';
    } finally { busy = false; }
  });
})();

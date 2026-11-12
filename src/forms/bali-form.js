(function (w, d) {
  'use strict';
  var form = d.getElementById('bali-form'), api = w.LCForms;
  if (!form || !api) return;
  function field(id) { return d.getElementById('bali-' + id); }
  function value(id) { return field(id).value.trim(); }
  var query = new URLSearchParams(w.location.search), scope = query.get('scope');
  field('serenite').checked = query.get('serenite') === '1';
  function updateSerenite() { field('serenite').closest('label').classList.toggle('active', field('serenite').checked); }
  field('serenite').addEventListener('change', updateSerenite); updateSerenite();
  if (scope === 'terrace') field('scope').value = 'Piscine + terrasse';
  if (scope === 'complete') field('scope').value = 'Piscine + aménagement complet';
  api.bindValidation(form);
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); if (field('submit').disabled || !api.valid(form)) return;
    var payload = {
      source: 'page-bali', projet: 'Piscine Bali', prenom: value('prenom'), nom: value('nom'), emailClient: value('email'), tel: value('telephone'),
      adresse: value('adresse'), codePostal: value('code-postal'), ville: value('ville'), distance: value('distance'), budgetText: value('budget'),
      delaiTxt: value('disponibilite'), terrain: value('terrain'), engagement: value('engagement'),
      message: [value('message'), 'Périmètre souhaité : ' + value('scope') + '\nPlanning souhaité, à confirmer après étude : ' + value('disponibilite') + '\nPack Sérénité : ' + (field('serenite').checked ? '399 €/an, hors montant du chantier' : 'non sélectionné')].filter(Boolean).join('\n\n'),
      estimationText: 'Piscine Bali à partir de 29 990€ TVAC', pack: 'Bali', taille: 'Base 6 x 3 m', projectScope: value('scope'), serenite: field('serenite').checked, sereniteAnnuel: field('serenite').checked ? 399 : 0
    };
    await api.send(payload, {
      button: field('submit'), status: field('status'), successUrl: '/merci-bali.html',
      rows: [['Piscine', 'Bali — base 6 × 3 m'], ['Offre', 'À partir de 29 990 € TVAC, adaptations et aménagement à étudier'], ['Périmètre', payload.projectScope], ['Suivi annuel', payload.serenite ? 'Pack Sérénité — 399 €/an, hors montant du chantier' : 'Non sélectionné'], ['Terrain', payload.terrain], ['Période souhaitée', payload.delaiTxt], ['Budget', field('budget').selectedOptions[0].textContent], ['Votre message', value('message')]]
    });
  });
})(window, document);

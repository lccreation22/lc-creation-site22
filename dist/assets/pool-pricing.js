(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LCPoolPricing = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Tarifs de l’ancien configurateur conservés ; un seul tarif de liner pour l’interface et le calcul.
  var LINER_SURCHARGE = 175;
  var SERENITE_ANNUAL = 399;
  var GRID = {
    Compacte: { Essentiel: 15990, Confort: 23290, Luxe: 28290 },
    Familiale: { Essentiel: 18990, Confort: 26990, Luxe: 31990 },
    Grande: { Essentiel: 21990, Confort: 30990, Luxe: 36990 }
  };
  var TERRACE = { Bois: 140, Composite: 190, 'Gres cerame': 150 };
  var SIZES = { Compacte: [5, 3.2], Familiale: [6, 4.2], Grande: [8.35, 4.9] };
  var EVAC = {
    Compacte: { 'Hors-sol': 0, 'Semi-enterrée': 18, Enterrée: 30 },
    Familiale: { 'Hors-sol': 0, 'Semi-enterrée': 22, Enterrée: 38 },
    Grande: { 'Hors-sol': 0, 'Semi-enterrée': 30, Enterrée: 55 }
  };
  function positive(value) { return Math.max(0, Number(value) || 0); }
  function calculate(c) {
    var base = GRID[c.taille] && GRID[c.taille][c.pack];
    if (!base) throw new Error('Pack ou taille inconnus');
    var luxe = c.pack === 'Luxe';
    var options = (c.liner === 'Sand' || c.liner === 'Grey') ? LINER_SURCHARGE : 0;
    if (c.pack === 'Essentiel' && c.chauffage === 'Pompe à chaleur') options += 3500;
    // La valeur HTML historique est « Électrolyseur sel » ; l’ancien calcul attendait « au sel ».
    if (c.traitement === 'Électrolyseur sel' || c.traitement === 'Électrolyseur au sel') options += 1800;
    if (c.traitement === 'Électrolyseur + régulation pH') options += 3200;
    if (!luxe && c.traitement === 'Pompe doseuse') options += 1800;
    if (!luxe && c.entretien === 'Avec robot nettoyeur') options += 1800;
    (c.loisirs || []).forEach(function (value) {
      if (value === 'Spot LED couleur (RGB)' && !luxe) options += 600;
      if (value === 'Douche solaire extérieure') options += 800;
      if (value === 'Nage à contre-courant') options += 6500;
    });
    var pose = c.pose === 'Semi-enterrée' ? 1.1 : c.pose === 'Enterrée' ? 1.2 : 1;
    var terrace = positive(c.terrasseM2) * (TERRACE[c.terrasseMateriau] || 0);
    var evacuation = c.evacuation === 'Oui' ? positive(c.evacuationM3) * 80 * 1.21 : 0;
    var total = base * pose + options + terrace + evacuation;
    return { base: base, pose: base * (pose - 1), options: options, terrace: terrace, evacuation: evacuation, total: total, rounded: Math.round(total), annual: !luxe && c.serenite ? SERENITE_ANNUAL : 0, sereniteIncluded: luxe };
  }
  function defaultEvacuation(size, pose) { return EVAC[size] && EVAC[size][pose] || 0; }
  function defaultTerrace(size) { var s = SIZES[size]; return s ? Math.round(((s[0] + 2) * (s[1] + 2) - s[0] * s[1]) * 10) / 10 : 0; }
  return { LINER_SURCHARGE: LINER_SURCHARGE, SERENITE_ANNUAL: SERENITE_ANNUAL, calculate: calculate, defaultEvacuation: defaultEvacuation, defaultTerrace: defaultTerrace };
});

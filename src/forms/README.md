# Formulaires LC Création — intégration

## Fichiers à publier

Le build `node build.mjs --production` intègre les fragments aux pages et copie les CSS/JS de ce dossier dans `dist/assets`, sauf ce README et `forms-tests.cjs`. Les fonctions serveur restent dans le dossier racine `api/` du dépôt.

| Page | Fragment | Scripts après le runtime |
|---|---|---|
| `configurateur-projet.html` | `configurateur-projet.fragment.html` | `configurateur-projet.js` |
| `configurateur-piscine.html` | `configurateur-piscine.fragment.html` | `pool-pricing.js`, puis `configurateur-piscine.js` |
| `piscine-bali.html` | `bali-form.fragment.html` | `bali-form.js` |

Les fragments projet et bois contiennent un `<main id="contenu" class="lc-form-page …">`. Ne pas les imbriquer dans un autre `main` : conserver ses classes lors de l’intégration. Le fragment Bali est une section autonome `#formulaire`, à placer dans le `main` de la page.

Charger `forms.css` après le CSS global. Tous ses sélecteurs sont limités à `.lc-form-page`. Les boutons utilisent aussi `.btn` / `.btn-primary`. Pas de dépendance externe.

Ordre recommandé, avec `defer` sur les scripts :

```html
<link rel="stylesheet" href="./forms.css">
<script src="./lc-tracking-production.js" defer></script>
<script src="./forms-runtime.js" defer></script>
<!-- puis les scripts propres à la page, dans l’ordre du tableau -->
```

**Remplacer** l’ancien script tracking par `lc-tracking-production.js` ; ne pas charger les deux et ne pas conserver de pixel `fbq` direct dans les pages. Le script garde les consentements et les identifiants historiques du source.

## Liens et présélections

- LC 6.3 : `configurateur-projet.html#lc-6-3`.
- Béton : `configurateur-projet.html#beton`.
- Projet complet : ajouter `?scope=complete` **avant** l’ancre.
- Piscine + terrasse : `?scope=terrace` ; piscine seule : `?scope=pool` ou aucun paramètre.
- Sérénité présélectionné : `?serenite=1`.
- Combinaison : `configurateur-projet.html?scope=complete&serenite=1#lc-6-3`.
- Bali : `piscine-bali.html?scope=complete&serenite=1#formulaire`.
- Autres bois : `configurateur-piscine.html?scope=complete&serenite=1`.

Le portail doit transférer les paramètres reconnus dans ses liens vers chaque offre. Les formulaires et le nettoyage d’URL du tracking conservent `scope` parmi `pool`, `terrace`, `complete` et `serenite=1`.

## Offre LC 6.3 actualisée sur instruction utilisateur

Prix : **25 900 € TVAC**, **volet PVC manuel + pompe à chaleur inclus**. Le volet solaire et la PAC en supplément ont été retirés de tous les textes de cette offre dans ces fragments.

La PAC est cochée et désactivée pour LC 6.3, signalée incluse ; elle reste un souhait à chiffrer pour le béton. Les options supplémentaires LC 6.3 excluent la PAC. Payload :

```json
{
  "chauffageTxt": "Pompe à chaleur incluse",
  "couvertureTxt": "Volet PVC manuel inclus",
  "estimationText": "25 900 €",
  "includedEquipment": ["Volet PVC manuel", "Pompe à chaleur"]
}
```

Sérénité vaut **399 €/an**, hors montant du chantier, distinct du premier contrôle LC 6.3. Il reste inclus dans le pack Luxe du configurateur bois historique. Le pack n’est pas présenté comme une garantie globale.

## Transmission et sécurité de la prévisualisation

Un seul transport, dans `forms-runtime.js` : `POST /api/send-piscine-lead`, JSON. Hors **exactement** `lc-creation.be` et `www.lc-creation.be`, le runtime retourne avant tout `prepare`, `fetch`, `complete`, stockage d’estimation ou redirection. Il affiche le récapitulatif local et **« Prévisualisation : demande non envoyée. »**. Le tracking lui-même retourne dès sa première garde sur ces domaines de prévisualisation, sans consentement, identifiant, événement local ou balise externe.

En production, le bouton est verrouillé pendant l’envoi et après succès ; un deuxième clic ne génère pas de deuxième demande. Il faut une réponse HTTP positive, `data.ok === true`, sans `data.skipped`. Comme le source existant, le formulaire LC 6.3/béton exige également un `data.id`. `LCTracking.complete(data)` n’est appelé qu’après confirmation. Le tracking commun exige lui-même un identifiant serveur pour la conversion et déduplique par événement.

Le suivi historique envoie `configurator_complete` et `generate_lead` dans GA4, mais un seul événement Lead Meta : vérifier dans la configuration GA4/Ads qu’un seul événement correspond à la conversion principale. Aucun ajout de `fbq('track','Lead')` dans les formulaires.

Succès bois : conservation du seul montant en session, puis `/merci-configurateur.html`. Succès Bali : `/merci-bali.html`. Le projet LC 6.3/béton confirme sur place. Le parent doit publier/conserver les deux pages de remerciement. Aucun envoi n’a été réalisé contre le vrai serveur pendant les vérifications.

## Compatibilité et corrections

Les clés historiques des trois payloads et les IDs des champs sont conservés. Les 12 champs requis Bali restent requis ; les 11 champs projet restent requis, dont longueur/largeur uniquement en béton ; les 3 coordonnées requises du bois restent requises. Code postal belge de quatre chiffres, limites de longueur et retours accessibles ajoutés.

Bois : `pose`, `liner`/`linerColor`, `evacuation`, `evacuationM3`, `terrasseMateriau`, `terrasseM2`, `serenite`, `sereniteInclus`, `sereniteAnnuel` et `configurationDetails` sont ajoutés. Ces choix sont aussi joints au `message` existant pour qu’un backend ignorant les nouvelles clés conserve l’information. Les alias historiques `evacChoice`, `evacM3`, `plageMateriau` et `plageSurface` transmettent les mêmes valeurs : le handler existant les utilise pour les rubriques principales Évacuation et Plage/terrasse de l’e-mail.

Projet et Bali : `projectScope`, `serenite` et `sereniteAnnuel` sont ajoutés et repris dans `message`. Le projet ajoute `selectedOptions`, `includedEquipment` et `optionsPricing` sans chiffrer artificiellement l’extérieur.

Les labels utilisent le comportement natif des cases et un événement `change` : plus de double inversion. Le supplément liner a une seule source, `LCPoolPricing.LINER_SURCHARGE = 175`, pour affichage et calcul. L’estimation est arrondie à l’euro afin que le total affiché augmente lui aussi de 175 € ; l’ancien arrondi par 10 € pouvait afficher +180 €. La valeur HTML historique `Électrolyseur sel` est reconnue et ajoute les 1 800 € prévus dans l’ancien calcul, qui ne fonctionnait qu’avec un autre libellé. Les volumes saisis manuellement sont préservés ; le choix Luxe synchronise les équipements inclus et évite leur double facturation.

Bali propose 2027 ou une date à définir, avec confirmation du planning après étude, et ne prétend plus réserver un créneau de 2026.

## Vérifications

Commande locale : `node src/forms/forms-tests.cjs`. **23 groupes** : 9 tarifs de base, liner, électrolyse, inclusions Luxe, Sérénité séparée, pose/terrasse/évacuation, gardes de domaines, réponses serveur simulées, déduplication, payloads projet/Bali et contrats supplémentaires bois. Tous les transports sont simulés ; aucune requête réseau réelle. Syntaxe JS vérifiée ; fragments contrôlés sans IDs dupliqués et avec balises équilibrées.

Dernière vérification visuelle conseillée après intégration parent : grand écran et 390 px, changement LC 6.3/béton, présélections du portail, un clic sur texte de checkbox, modification du volume d’évacuation, soumission locale complète des trois formulaires et message de prévisualisation. Les tests Node ne remplacent pas cette vérification de la page composée.

## Intégration au backend de production

Le handler existant `api/send-piscine-lead.js` a été inspecté et testé localement par `node qa/production-handler-contract.mjs`. Ce test exécute le vrai handler avec des variables d’environnement factices et un `fetch` simulé ; les transports HTTP/HTTPS sont bloqués. Le backend, ses noms de variables d’environnement et son routage Resend avec copie Vertuoza sont conservés.

Les parcours LC 6.3, béton, Bali et bois passent ce contrôle. Le handler ne filtre pas les disponibilités Bali par une liste de valeurs : `Été 2027 — à confirmer` et `Date à définir` sont acceptés et repris dans le texte de l’e-mail. Il n’impose pas de limite applicative à `message` et ne rejette pas les clés supplémentaires ; le test vérifie qu’un message client de 3 000 caractères accompagné de la synthèse est conservé intégralement. Cela ne supprime pas les limites de taille de requête propres à l’hébergement ou au fournisseur d’e-mail.

Le test vérifie également les alias bois dans les rubriques du message (`Évacuation : Oui (38 m³)` et `Plage/terrasse : Composite (30 m²)`), les identifiants `id` et `event_id`, la qualification LC 6.3, la revue manuelle du budget béton et le retrait de l’attribution publicitaire sans consentement marketing. Les réponses au honeypot, à une requête GET et à un rejet simulé du fournisseur restent compatibles avec le runtime.

Ces vérifications établissent la compatibilité locale du frontend et du backend. Aucune réception d’e-mail réelle ni conversion publicitaire réelle n’a été testée.

# LC Création — site public

Refonte validée le 12 novembre 2026, intégrée au dépôt existant de `www.lc-creation.be`.

## Construction et publication

`node build.mjs --production` construit les 16 pages dans `dist/`. Vercel utilise ce dossier pour les fichiers publics et conserve les fonctions du dossier racine `api/`.

Les sources éditables sont dans `src/`. Les photographies, leurs variantes et le manifeste sont suivis dans `dist/assets/` : ne pas supprimer ce répertoire avant la construction. Le mode sans `--production` sert uniquement aux présentations privées et désactive l'indexation.

`vercel.json` conserve les URL historiques `.html`, accepte aussi les chemins sans extension et redirige l'ancienne page `piscine-urbaine-form.html` vers le nouveau parcours.

## Contrôles

```sh
node build.mjs --production
python qa/validate.py
node src/forms/forms-tests.cjs
node qa/production-handler-contract.mjs
```

Les tests du service d'envoi utilisent exclusivement un transport simulé : aucun e-mail de test ni conversion réelle n'est envoyé.

## Demandes clients

Les formulaires utilisent `POST /api/send-piscine-lead`. Resend transmet les demandes uniquement au destinataire LC Création défini par `RESEND_TO`, sans copie vers Vertuoza. La liaison automatique entre configurateur et Vertuoza a été retirée à la demande de LC Création le 12 novembre 2026 ; l'entrée dans le CRM intervient à une étape ultérieure. Les noms de variables d'environnement restent identiques. Les nouveaux champs de configuration sont également repris dans `message`. Le configurateur bois transmet les anciens noms de champs pour l'évacuation et la terrasse afin de garder le récapitulatif serveur exact.

Les envois et le suivi fonctionnent exclusivement sur `lc-creation.be` et `www.lc-creation.be`. Les domaines de prévisualisation affichent un récapitulatif sans transmission. Le suivi existant conserve les identifiants GA4 et Meta, avec consentement.

## Offre validée

LC 6.3 : 25 900 € TVAC, volet PVC manuel et pompe à chaleur inclus. Premier contrôle Sérénité offert ; abonnement Sérénité distinct à 399 €/an. Terrasses, jardin et adaptations du terrain sont chiffrés selon le projet. La garantie fabricant de dix ans concerne la structure bois selon ses conditions.

## Historique de production

Version publique précédant cette refonte : `195e781c9b798963b16f43f19370a3a9712b3931`. Les anciennes sources racine restent dans l'historique ; seul le dossier `dist` est publié pour la nouvelle présentation.

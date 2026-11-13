# Copie de secours des formulaires

Le serveur continue l'envoi Resend habituel, puis enregistre indépendamment une copie dans la file authentifiée Make. Les quatre parcours (bois, LC 6.3, béton, Bali) utilisent ce même serveur. Une panne d'un transport n'annule pas le succès de l'autre. Si aucun transport ne confirme la prise en charge, le visiteur peut réessayer.

Variables exclusivement serveur : `LEAD_BACKUP_URL` et `LEAD_BACKUP_KEY`. Ne jamais les inclure dans les fichiers publics, les journaux, le dépôt ou un blueprint partagé. Sans ces deux variables, le mail conserve son fonctionnement habituel. Le retour `backup_status: queued` signifie accepté dans la file Make, pas encore écrit dans Sheets. `email_status: accepted` signifie accepté par Resend, pas livré à Outlook.

Scénario Make : « LC Création — Secours configurateur vers Sheets ». Déclenchement immédiat, traitement séquentiel, stockage des exécutions incomplètes activé. Il recherche `submission_id` en colonne S de l'onglet « Secours configurateur » et ajoute une ligne uniquement si cet identifiant est absent. L'écriture utilise RAW pour conserver les téléphones et ne pas interpréter les valeurs comme des formules. Une nouvelle tentative du même projet garde son identifiant ; un projet modifié en reçoit un nouveau.

Cet onglet est une archive indépendante. Il ne déclenche pas les réponses commerciales J0 ni les relances. En cas d'incident Outlook, consulter les demandes dans cet onglet et contrôler les exécutions incomplètes Make. Lorsque le mail arrive plus tard, rapprocher les coordonnées et l'identifiant avant tout traitement manuel afin d'éviter une double prise de contact.

Tests : `node qa/lead-backup.mjs`, tests formulaires et contrat du handler, construction de production. Le 13 novembre 2026, quatre demandes fictives ont traversé le vrai handler et le vrai webhook jusqu'au tableau, sans mail réel. Une répétition n'a pas ajouté de ligne. Un appel sans clé a été refusé (401). Le cas Bali a aussi vérifié un échec mail simulé avec sauvegarde réussie.

Retour arrière : retirer les deux variables de secours et redéployer, ou rétablir le déploiement précédent. Conserver l'onglet et les éléments en attente pour ne pas perdre les demandes déjà reçues.

# Environnements mikconnect

## Développement

- PostgreSQL, Redis et FreeRADIUS peuvent tourner via Docker Compose.
- Les adaptateurs MikroTik, CinetPay et SMS peuvent être simulés.
- Copier les fichiers `.env.example`, puis lancer `pnpm db:generate`, les migrations et `pnpm dev`.
- La file de synchronisation est optionnelle avec `TICKET_SYNC_QUEUE_ENABLED=false`.

## Test et CI

- Utiliser une base et un Redis jetables, sans données de production.
- La commande de référence est `pnpm verify` : format, lint, types, tests, build, puis les E2E séparément lorsque les services sont démarrés.
- Le build web utilise `NEXT_PUBLIC_API_URL=https://api.build.mikconnect.invalid` : cette URL sert uniquement au prerender et ne doit jamais être déployée.

## Staging

- Configuration identique à la production, avec comptes CinetPay/SMS de recette et routeur pilote isolé.
- `MIKROTIK_MOCK=false`, TLS RouterOS activé, Redis persistant et migrations appliquées avant le trafic.
- Valider génération, export PDF 1 000 tickets, reprise de synchronisation, paiement et SMS.

## Production

- Toutes les variables validées par `assertProductionConfiguration` sont obligatoires.
- URLs publiques HTTPS, origines CORS explicites et secrets distincts du staging.
- `TICKET_SYNC_QUEUE_ENABLED=true`; PostgreSQL et Redis doivent être sauvegardés et supervisés.
- Appliquer les migrations avant le déploiement, puis vérifier `/health` et exécuter le parcours critique Android.
- Ne jamais journaliser les codes de ticket, mots de passe RouterOS, jetons ou secrets de paiement.

## Déploiement sûr

1. Sauvegarder PostgreSQL et tester régulièrement une restauration.
2. Appliquer les migrations sur staging, puis exécuter `pnpm verify` et les E2E critiques.
3. Déployer progressivement l’API, les workers, puis le web.
4. Contrôler les lots en attente, la dead-letter queue et les erreurs de paiement/SMS.
5. Prévoir un retour applicatif sans annuler une migration de données déjà utilisée.

### Sauvegardes PostgreSQL

Planifier quotidiennement `scripts/backup-postgres.ps1` vers un volume chiffré distinct, puis copier la sauvegarde hors site. Le script produit un dump PostgreSQL et son empreinte SHA-256. Exécuter au moins chaque mois `scripts/test-postgres-restore.ps1` avec une URL d’administration dédiée ; la base temporaire créée porte obligatoirement le préfixe `mikconnect_restore_test_` et est supprimée après contrôle.

# Validation du pilote réel — mikconnect

Ce document est la porte de sortie du mode démonstration. Le pilote ne passe en
production que lorsque tous les critères **bloquants** sont validés sur staging.

## 1. Environnement staging

- [ ] Domaine HTTPS pour le web et l'API.
- [ ] PostgreSQL avec un rôle propriétaire réservé aux migrations.
- [ ] Rôle applicatif non propriétaire, sans `BYPASSRLS`.
- [ ] Rôle FreeRADIUS limité à la lecture de `radcheck` / `radreply` et à
      l'écriture de `radacct`.
- [ ] Migration `0005_radius_credentials_rls` appliquée.
- [ ] Secrets JWT, MikroTik, CinetPay et SMS stockés hors du dépôt.
- [ ] `CORS_ORIGIN` limité aux domaines staging attendus.

**Preuve :** sortie des migrations, noms des rôles sans mots de passe, capture
des variables masquées et test cross-tenant refusé.

## 2. Matrice MikroTik — bloquant

Tester au minimum un routeur RouterOS 6 LTS et un routeur RouterOS 7 stable.

| Test | RouterOS 6 | RouterOS 7 | Critère d'acceptation |
| --- | --- | --- | --- |
| API 8728 | [ ] | [ ] | Pairing en moins de 10 s |
| API-SSL 8729 | [ ] | [ ] | Certificat valide accepté |
| Push d'un lot de 10 tickets | [ ] | [ ] | 10/10 comptes créés une seule fois |
| Connexion Hotspot | [ ] | [ ] | Ticket accepté et durée appliquée |
| Lecture des sessions | [ ] | [ ] | IP, MAC, durée et trafic visibles |
| Déconnexion | [ ] | [ ] | Session supprimée en moins de 5 s |
| Blocage MAC | [ ] | [ ] | Reconnexion refusée |
| Routeur indisponible | [ ] | [ ] | Erreur isolée, dashboard toujours utilisable |

Variables staging : `MIKROTIK_MOCK=false`, TLS vérifié et timeout réseau à
10 secondes. Ne jamais enregistrer le mot de passe du routeur dans les preuves.

## 3. FreeRADIUS et accounting — bloquant

- [ ] Achat d'un ticket puis authentification via le portail captif.
- [ ] Réception d'Accounting-Start.
- [ ] Réception d'au moins deux Interim-Update.
- [ ] Réception d'Accounting-Stop ou fermeture correcte après timeout.
- [ ] Volume montant/descendant cohérent avec RouterOS.
- [ ] Un ticket expiré ou désactivé est refusé.
- [ ] Aucun credential d'un autre tenant n'est lisible via l'API applicative.
- [ ] Le rapprochement `généré → vendu → utilisé` se met à jour sans doublon.

**Preuve :** identifiants de session anonymisés, timestamps et résultat du
rapprochement. Les mots de passe RADIUS ne doivent jamais être exportés.

## 4. CinetPay et livraison — bloquant

- [ ] `CINETPAY_MOCK=false` avec les clés staging officielles.
- [ ] Paiement réussi par chaque opérateur réellement proposé au pays pilote.
- [ ] Paiement refusé, annulé et expiré correctement affiché.
- [ ] Webhook dupliqué traité une seule fois.
- [ ] Webhook avec signature invalide refusé.
- [ ] Code livré par SMS une seule fois après confirmation.
- [ ] Échec SMS journalisé et retenté sans recréer la vente.
- [ ] Montant CinetPay, vente et ticket réconciliés.

**Preuve :** identifiant de transaction masqué, statut opérateur, vente créée,
SMS livré et absence de doublon.

## 5. Exploitation — bloquant avant ouverture publique

- [ ] Alertes sur erreurs API, webhooks, synchronisation RADIUS et routeurs.
- [ ] Logs centralisés sans secrets ni mots de passe.
- [ ] Sauvegarde PostgreSQL quotidienne.
- [ ] Restauration testée sur une base vide.
- [ ] Procédure de rotation des secrets.
- [ ] Runbook : routeur hors ligne, paiement sans ticket, SMS en échec,
      saturation DB et retour arrière de migration.
- [ ] Test de charge : génération de 10 000 tickets et 100 sessions simultanées.

## Décision go / no-go

Le pilote est **GO** uniquement si les sections 1 à 4 sont entièrement vertes,
qu'aucune fuite cross-tenant n'est possible et qu'une restauration DB a été
exécutée avec succès. Toute anomalie de paiement, d'isolation ou de création de
credential est **NO-GO**.

# FreeRADIUS mikconnect

Ce service authentifie les codes de tickets stockés dans `RadiusCredential`
et écrit les paquets Accounting Start / Interim / Stop dans `radacct`.

1. Appliquer les migrations Prisma de l’API.
2. Créer un utilisateur PostgreSQL dédié avec lecture sur les vues `radcheck`
   et `radreply`, puis lecture/écriture sur `radacct` et `nasreload`.
3. Copier `.env.example` vers `.env` et remplacer tous les secrets.
4. Lancer `docker compose up -d` depuis ce dossier.
5. Configurer le routeur MikroTik avec le même secret et un intervalle
   d’accounting de 5 minutes maximum.

Ne jamais exposer UDP 1812/1813 à Internet sans filtrage réseau. Limiter
`RADIUS_CLIENT_NETWORK` aux adresses privées ou au VPN des routeurs.

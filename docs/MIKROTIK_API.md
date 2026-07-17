# Intégration RouterOS API

mikconnect utilise l’API native RouterOS pour créer les utilisateurs Hotspot et
lire les sessions présentes dans `/ip/hotspot/active`. Le service API écoute par
défaut sur `8728`, et API-SSL sur `8729`.

Références officielles :

- https://manual.mikrotik.com/docs/developer-guides/api/
- https://manual.mikrotik.com/docs/cli-reference/ip/hotspot/
- https://help.mikrotik.com/docs/spaces/ROS/pages/103841820/Services

## Préparer le routeur

### Diagnostic et smoke test réels

Avant d'importer un script de configuration, exécuter le diagnostic sans effet
de bord depuis le terminal RouterOS :

```routeros
/import file-name=diagnostic-readonly.rsc
```

Le fichier `scripts/mikrotik/diagnostic-readonly.rsc` affiche la version, l'état
des services `api`/`api-ssl`, la présence du compte dédié et les sessions
Hotspot. Il ne contient aucune commande `add`, `set` ou `remove`.

Une fois le service et le compte validés, le smoke test Node réutilise
directement `MikrotikConnectorService`, donc le même chemin que l'API du SaaS.
Les identifiants sont lus depuis l'environnement et ne sont jamais affichés :

```powershell
$env:MIKROTIK_SMOKE_HOST = "192.168.88.1"
$credential = Get-Credential -UserName "mikconnect" -Message "Compte API RouterOS"
$env:MIKROTIK_SMOKE_USER = $credential.UserName
$env:MIKROTIK_SMOKE_PASSWORD = $credential.GetNetworkCredential().Password
$env:MIKROTIK_SMOKE_PORT = "8729"
$env:MIKROTIK_SMOKE_TLS = "true"
pnpm --filter @mikconnect/api mikrotik:smoke
Remove-Item Env:MIKROTIK_SMOKE_PASSWORD
```

Le test est volontairement en lecture seule : identité, version et
`/ip/hotspot/active`. Les essais destructifs (déconnexion, blocage) et la
création d'un ticket éphémère ne doivent être lancés qu'après ce premier succès.

Deux scripts RouterOS prêts à importer sont fournis :

- `scripts/mikrotik/setup-api.rsc` pour un LAN privé, VPN ou tunnel chiffré ;
- `scripts/mikrotik/setup-api-tls.rsc` pour API-SSL avec un certificat installé.

Avant l’import, remplacer le mot de passe, le préfixe autorisé et, pour TLS, le
nom du certificat. Charger ensuite le fichier dans RouterOS et exécuter :

```routeros
/import file-name=setup-api-tls.rsc
```

Le groupe créé ne reçoit que `api`, `read` et `write`. Le droit `write` est
nécessaire pour pousser les tickets dans `/ip/hotspot/user`; aucun droit
`sensitive`, `policy`, `reboot`, Winbox ou SSH n’est accordé.

L’adresse autorisée doit correspondre à l’IP ou au réseau depuis lequel l’API
mikconnect atteint le routeur. Pour une exposition Internet, ajouter aussi une
règle firewall limitant le port à cette source. Une restriction `/ip service
address` refuse la session, mais ne remplace pas le filtrage firewall.

## Configuration de l’API mikconnect

```env
MIKROTIK_MOCK="false"
MIKROTIK_API_TIMEOUT_SECONDS="10"
MIKROTIK_TLS_REJECT_UNAUTHORIZED="true"
```

Conserver la validation TLS en production. Pour un laboratoire avec certificat
auto-signé, `MIKROTIK_TLS_REJECT_UNAUTHORIZED="false"` est possible, mais ne doit
pas être utilisé sur Internet.

Lors de l’appairage, choisir le transport sécurisé et le port `8729` pour
API-SSL. Le port et le transport sont persistés avec le routeur ; le mot de passe
reste chiffré en AES-256-GCM dans PostgreSQL.

## Données synchronisées

`GET /routers/online-users` agrège tous les routeurs du tenant. Le backend ne
demande que la `.proplist` suivante afin de limiter le coût de la commande :

```text
.id, server, user, address, mac-address, login-by, uptime,
session-time-left, idle-time, bytes-in, bytes-out,
packets-in, packets-out, radius, blocked
```

Une erreur sur un routeur ne bloque pas les autres. Chaque interrogation met à
jour `status` et `lastSeenAt`. Le frontend rafraîchit la vue toutes les 15
secondes lorsque l’onglet est actif.

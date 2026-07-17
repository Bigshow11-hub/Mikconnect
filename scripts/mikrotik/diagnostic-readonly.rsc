# mikconnect — diagnostic RouterOS strictement en lecture seule.
# Ce script n'ajoute, ne modifie et ne supprime aucune configuration.

:put "=== mikconnect / identité et version ==="
/system/identity/print
/system/resource/print

:put "=== mikconnect / services API ==="
/ip/service/print detail where name="api"
/ip/service/print detail where name="api-ssl"

:put "=== mikconnect / compte et groupe dédiés ==="
:put ("groupe mikconnect-api présent: " . [:len [/user/group/find where name="mikconnect-api"]])
:put ("utilisateur mikconnect présent: " . [:len [/user/find where name="mikconnect"]])
/user/group/print detail where name="mikconnect-api"

:put "=== mikconnect / Hotspot ==="
:put ("serveurs Hotspot: " . [:len [/ip/hotspot/find]])
:put ("profils Hotspot: " . [:len [/ip/hotspot/profile/find]])
:put ("utilisateurs Hotspot: " . [:len [/ip/hotspot/user/find]])
:put ("sessions Hotspot actives: " . [:len [/ip/hotspot/active/find]])
/ip/hotspot/active/print detail

:put "=== diagnostic terminé, aucune modification effectuée ==="

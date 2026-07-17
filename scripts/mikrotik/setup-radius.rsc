# mikconnect — authentification et accounting FreeRADIUS pour Hotspot.
# Modifier les valeurs avant l'import sur chaque routeur.
:local radiusAddress "10.0.0.10"
:local radiusSecret "CHANGE-ME-WITH-A-LONG-RANDOM-SECRET"
:local hotspotProfile "default"
:local interimUpdate "5m"

:local existing [/radius/find where address=$radiusAddress and service~"hotspot"]
:if ([:len $existing] = 0) do={
  /radius/add service=hotspot address=$radiusAddress secret=$radiusSecret authentication-port=1812 accounting-port=1813 timeout=2s comment="mikconnect FreeRADIUS"
} else={
  /radius/set $existing secret=$radiusSecret authentication-port=1812 accounting-port=1813 timeout=2s disabled=no
}

:local profile [/ip/hotspot/profile/find where name=$hotspotProfile]
:if ([:len $profile] = 0) do={
  :error ("Profil Hotspot introuvable: " . $hotspotProfile)
}

/ip/hotspot/profile/set $profile use-radius=yes radius-accounting=yes radius-interim-update=$interimUpdate

:put ("mikconnect: RADIUS actif sur " . $radiusAddress . " pour le profil " . $hotspotProfile)
:put ("Accounting Start/Interim/Stop configuré, intervalle " . $interimUpdate)


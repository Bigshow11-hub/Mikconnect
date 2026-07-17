# mikconnect — RouterOS API sur réseau privé ou tunnel chiffré.
# Modifier ces trois valeurs avant l'import.
:local apiUser "mikconnect"
:local apiPassword "CHANGE-ME-WITH-A-LONG-RANDOM-PASSWORD"
:local allowedAddress "192.168.88.0/24"
:local apiPort 8728

:if ([:len [/user/group/find where name="mikconnect-api"]] = 0) do={
  /user/group/add name="mikconnect-api" policy=api,read,write
} else={
  /user/group/set [find where name="mikconnect-api"] policy=api,read,write
}

:if ([:len [/user/find where name=$apiUser]] = 0) do={
  /user/add name=$apiUser password=$apiPassword group="mikconnect-api" address=$allowedAddress
} else={
  /user/set [find where name=$apiUser] password=$apiPassword group="mikconnect-api" address=$allowedAddress disabled=no
}

/ip/service/set [find where name="api"] disabled=no port=$apiPort address=$allowedAddress

:put ("mikconnect: API active sur le port " . $apiPort . " pour " . $allowedAddress)
:put "Utiliser ce mode uniquement sur un LAN privé, un VPN ou un tunnel chiffré."

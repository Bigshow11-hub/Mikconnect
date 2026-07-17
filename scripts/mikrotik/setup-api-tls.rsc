# mikconnect — RouterOS API-SSL avec certificat déjà installé.
# Le certificat doit avoir l'usage tls-server et une chaîne approuvée par l'API mikconnect.
:local apiUser "mikconnect"
:local apiPassword "CHANGE-ME-WITH-A-LONG-RANDOM-PASSWORD"
:local allowedAddress "192.168.88.0/24"
:local certificateName "mikconnect-api"
:local apiPort 8729

:if ([:len [/certificate/find where name=$certificateName]] = 0) do={
  :error ("Certificat introuvable: " . $certificateName)
}

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

/ip/service/set [find where name="api-ssl"] disabled=no port=$apiPort certificate=$certificateName address=$allowedAddress tls-version=only-1.2
/ip/service/set [find where name="api"] disabled=yes

:put ("mikconnect: API-SSL active sur le port " . $apiPort . " pour " . $allowedAddress)

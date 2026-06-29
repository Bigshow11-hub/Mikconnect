@echo off
cd /d "C:\Users\BIG\Desktop\TESTING\mikconnect\backend"
set DATABASE_URL=file:./dev.db
start /B node ..\node_modules\tsx\dist\cli.mjs src\index.ts > C:\Users\BIG\Desktop\TESTING\mikconnect\srv4.log 2>&1
echo Waiting for server...
:waitloop
timeout /t 1 /nobreak >nul
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -UseBasicParsing; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" && goto ready
goto waitloop
:ready
echo Server ready!
powershell -Command "$init = Invoke-RestMethod -Uri 'http://localhost:3001/api/payments/initiate' -Method Post -Body (@{amount=500;method='WAVE';phoneNumber='+22177000000'} | ConvertTo-Json) -ContentType 'application/json'; Write-Host ('Created: ' + $init.transaction.reference); $w = Invoke-RestMethod -Uri 'http://localhost:3001/api/payments/webhook/momo' -Method Post -Body (@{reference=$init.transaction.reference;status='SUCCESS'} | ConvertTo-Json) -ContentType 'application/json'; Write-Host ('Webhook: ' + ($w | ConvertTo-Json -Compress))"
echo Done!
pause

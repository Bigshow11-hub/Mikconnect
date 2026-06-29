$env:DATABASE_URL="file:./dev.db"
$p = Start-Process -PassThru -FilePath "node" -WindowStyle Hidden -ArgumentList "..\node_modules\tsx\dist\cli.mjs","src\index.ts" -WorkingDirectory "C:\Users\BIG\Desktop\TESTING\mikconnect\backend"
$p.Id | Out-File "C:\Users\BIG\Desktop\TESTING\mikconnect\server.pid"
Write-Host "Started PID=$($p.Id)"

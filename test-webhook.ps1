$ErrorActionPreference = "Stop"

# Start server
$env:DATABASE_URL = "file:./dev.db"
$job = Start-Job -Name "test-srv" -ScriptBlock {
    param($d)
    Set-Location $d
    $env:DATABASE_URL = "file:./dev.db"
    node ..\node_modules\tsx\dist\cli.mjs src\index.ts
} -ArgumentList "C:\Users\BIG\Desktop\TESTING\mikconnect\backend"

# Wait for server
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -UseBasicParsing
        if ($r.status -eq "ok") { Write-Host "Server ready"; break }
    } catch {}
}

# Test initiate payment
$init = Invoke-RestMethod -Uri "http://localhost:3001/api/payments/initiate" -Method Post -Body (@{amount=500;method="WAVE";phoneNumber="+22177000000"} | ConvertTo-Json) -ContentType "application/json"
Write-Host "1. Created: $($init.transaction.reference)"

# Test webhook
$w = Invoke-RestMethod -Uri "http://localhost:3001/api/payments/webhook/momo" -Method Post -Body (@{reference=$init.transaction.reference;status="SUCCESS"} | ConvertTo-Json) -ContentType "application/json"
Write-Host "2. Webhook: $($w.received) $($w.note)"

# Check transactions
$token = (Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body (@{email="test@mikconnect.com";password="123456"} | ConvertTo-Json) -ContentType "application/json").token
$txs = Invoke-RestMethod -Uri "http://localhost:3001/api/transactions" -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "3. Transactions: $($txs.Count)"
if ($txs.Count -gt 0) { Write-Host "   Latest: $($txs[0].reference) = $($txs[0].status)" }

# Check vouchers
$v = Invoke-RestMethod -Uri "http://localhost:3001/api/vouchers" -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "4. Vouchers: $($v.Count)"

# Cleanup
Stop-Job $job
Remove-Job $job
Write-Host "Done!"

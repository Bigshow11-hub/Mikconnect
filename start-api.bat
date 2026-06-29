@echo off
cd /d "C:\Users\BIG\Desktop\TESTING\mikconnect\backend"
set DATABASE_URL=file:./dev.db
node ..\node_modules\tsx\dist\cli.mjs src\index.ts

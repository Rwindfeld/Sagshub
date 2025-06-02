@echo off
title SagsHub Klient
echo.
echo ========================================
echo          SagsHub Klient
echo ========================================
echo.

REM Spørg efter server IP hvis ikke angivet
set /p server_ip="Indtast server IP-adresse (eller tryk Enter for localhost): "
if "%server_ip%"=="" set server_ip=localhost

echo.
echo Forbinder til SagsHub server på: %server_ip%:3000
echo.

REM Test forbindelse til server
echo Tester forbindelse...
ping -n 1 %server_ip% >nul 2>&1
if errorlevel 1 (
    echo ⚠ Kan ikke pinge server %server_ip%
    echo Tjek at:
    echo - Server IP-adressen er korrekt
    echo - Serveren kører
    echo - Netværksforbindelsen virker
    echo.
    pause
    exit /b 1
)

echo ✓ Server kan kontaktes
echo.

REM Åbn SagsHub i standard browser
echo Åbner SagsHub i browser...
start http://%server_ip%:3000

echo.
echo SagsHub skulle nu være åbnet i din browser.
echo.
echo Hvis siden ikke indlæses:
echo 1. Tjek at SagsHub serveren kører på %server_ip%
echo 2. Tjek firewall indstillinger
echo 3. Prøv at gå til http://%server_ip%:3000 manuelt
echo.
echo Tryk en tast for at afslutte...
pause >nul 
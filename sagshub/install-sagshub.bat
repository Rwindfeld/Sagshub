@echo off
setlocal enabledelayedexpansion
title SagsHub Installer
echo.
echo ========================================
echo          SagsHub Installer
echo ========================================
echo.

REM Tjek om Node.js er installeret
echo Tjekker Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo FEJL: Node.js er ikke installeret!
    echo.
    echo Download og installer Node.js fra: https://nodejs.org
    echo Vælg LTS version og genstart derefter denne installer.
    echo.
    pause
    exit /b 1
)

echo ✓ Node.js er installeret:
node --version
echo.

REM Installer dependencies
echo Installerer SagsHub dependencies...
echo Dette kan tage et par minutter...
echo.
npm install
if errorlevel 1 (
    echo.
    echo FEJL: Kunne ikke installere dependencies!
    echo Tjek din internetforbindelse og prøv igen.
    echo.
    pause
    exit /b 1
)

echo ✓ Dependencies installeret
echo.

REM Byg backend
echo Bygger SagsHub backend...
npm run build
if errorlevel 1 (
    echo.
    echo FEJL: Kunne ikke bygge backend!
    echo Der kan være TypeScript fejl der skal rettes.
    echo.
    pause
    exit /b 1
)

echo ✓ Backend bygget
echo.

REM Opret .env fil hvis den ikke eksisterer
if not exist ".env" (
    echo Opretter .env konfigurationsfil...
    copy "config.example.env" ".env" >nul
    echo ✓ .env fil oprettet
    echo.
    echo VIGTIGT: Rediger .env filen og opdater database indstillinger!
    echo.
)

REM Find netværks IP
echo Finder netværks IP-adresse...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    if not "!ip!"=="127.0.0.1" (
        if not "!ip!"=="169.254" (
            echo Din netværks IP: !ip!
            set "network_ip=!ip!"
        )
    )
)
echo.

REM Opret firewall regel
echo Opretter Windows Firewall regel...
netsh advfirewall firewall add rule name="SagsHub Server" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
if errorlevel 1 (
    echo ⚠ Kunne ikke oprette firewall regel automatisk
    echo Du skal manuelt tillade port 3000 i Windows Firewall
) else (
    echo ✓ Firewall regel oprettet for port 3000
)
echo.

echo ========================================
echo          Installation Færdig!
echo ========================================
echo.
echo Næste trin:
echo 1. Rediger .env filen med dine database indstillinger
echo 2. Sørg for PostgreSQL database kører
echo 3. Kør 'start-sagshub.bat' for at starte serveren
echo.
if defined network_ip (
    echo Andre computere kan tilgå SagsHub på:
    echo http://!network_ip!:3000
    echo.
)
echo Tryk en tast for at afslutte...
pause >nul 
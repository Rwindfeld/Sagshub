@echo off
title SagsHub Server
echo.
echo ========================================
echo          SagsHub Server Starter
echo ========================================
echo.

REM Tjek om Node.js er installeret
node --version >nul 2>&1
if errorlevel 1 (
    echo FEJL: Node.js er ikke installeret!
    echo Download og installer Node.js fra: https://nodejs.org
    pause
    exit /b 1
)

REM Vis Node.js version
echo Node.js version:
node --version
echo.

REM Tjek om npm dependencies er installeret
if not exist "node_modules" (
    echo Installerer dependencies...
    npm install
    if errorlevel 1 (
        echo FEJL: Kunne ikke installere dependencies!
        pause
        exit /b 1
    )
)

REM Byg backend hvis dist mappen ikke eksisterer
if not exist "dist" (
    echo Bygger backend...
    npm run build
    if errorlevel 1 (
        echo FEJL: Kunne ikke bygge backend!
        pause
        exit /b 1
    )
)

REM Find netværks IP-adresse
echo Finder netværks IP-adresse...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    if not "!ip!"=="127.0.0.1" (
        echo Netværks IP: !ip!
    )
)
echo.

REM Start serveren
echo Starter SagsHub server...
echo.
echo ========================================
echo Server kører på:
echo - Lokal adgang: http://localhost:3000
echo - Netværks adgang: http://[DIN-IP]:3000
echo ========================================
echo.
echo Tryk Ctrl+C for at stoppe serveren
echo.

REM Start serveren
npm start

REM Hvis serveren stopper
echo.
echo Server stoppet.
pause 
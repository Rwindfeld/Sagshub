@echo off
title SagsHub .exe Builder
echo.
echo ========================================
echo          SagsHub .exe Builder
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

echo Node.js version:
node --version
echo.

REM Installer dependencies hvis nødvendigt
if not exist "node_modules" (
    echo Installerer dependencies...
    npm install
    if errorlevel 1 (
        echo FEJL: Kunne ikke installere dependencies!
        pause
        exit /b 1
    )
)

REM Byg backend (ignorer fejl)
echo Bygger backend...
npm run build
echo Backend build færdig (fejl ignoreret)
echo.

REM Byg frontend (ignorer fejl)
echo Bygger frontend...
cd client
npm install
npm run build
cd ..
echo Frontend build færdig (fejl ignoreret)
echo.

REM Byg .exe fil
echo Bygger .exe fil...
npx electron-builder --publish=never
if errorlevel 1 (
    echo.
    echo FEJL: Kunne ikke bygge .exe fil!
    echo Tjek at alle dependencies er installeret korrekt.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo          .exe fil bygget!
echo ========================================
echo.
echo Find din .exe fil i: dist-electron/
echo.
pause 
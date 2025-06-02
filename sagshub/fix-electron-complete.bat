@echo off
title Fix SagsHub Electron - Komplet
echo.
echo ========================================
echo     Fix SagsHub Electron - Komplet
echo ========================================
echo.

REM Tjek om dist-electron findes
if not exist "dist-electron\win-unpacked" (
    echo FEJL: Electron app ikke bygget endnu!
    echo Kør først: npm run dist-portable
    pause
    exit /b 1
)

echo Kopierer alle nødvendige filer til Electron app...

REM Kopiér opdateret Electron main fil
echo Kopierer electron-standalone.cjs...
copy "electron-standalone.cjs" "dist-electron\win-unpacked\" /Y

REM Kopiér .env fil (VIGTIGT!)
echo Kopierer .env fil...
copy ".env" "dist-electron\win-unpacked\" /Y

REM Kopiér loading.html
echo Kopierer loading.html...
copy "loading.html" "dist-electron\win-unpacked\" /Y

REM Kopiér start-sagshub.bat (backup)
echo Kopierer start-sagshub.bat...
copy "start-sagshub.bat" "dist-electron\win-unpacked\" /Y

REM Kopiér dist mappe hvis den findes
if exist "dist" (
    echo Kopierer backend dist...
    xcopy "dist\*" "dist-electron\win-unpacked\dist\" /E /I /Y
)

REM Kopiér client dist hvis den findes
if exist "client\dist" (
    echo Kopierer frontend dist...
    xcopy "client\dist\*" "dist-electron\win-unpacked\client\dist\" /E /I /Y
)

REM Kopiér shared mappe
if exist "shared" (
    echo Kopierer shared...
    xcopy "shared\*" "dist-electron\win-unpacked\shared\" /E /I /Y
)

REM Kopiér server mappe
if exist "server" (
    echo Kopierer server...
    xcopy "server\*" "dist-electron\win-unpacked\server\" /E /I /Y
)

REM Kopiér package.json
echo Kopierer package.json...
copy "package.json" "dist-electron\win-unpacked\" /Y

echo.
echo ========================================
echo         ALLE FILER KOPIERET!
echo ========================================
echo.
echo Nu kan du teste Electron appen:
echo cd dist-electron\win-unpacked
echo SagsHub.exe
echo.
echo Eller test serveren direkte:
echo cd dist-electron\win-unpacked
echo node dist/index.js
echo.
pause 
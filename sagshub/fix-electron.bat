@echo off
title Fix SagsHub Electron
echo.
echo ========================================
echo        Fix SagsHub Electron
echo ========================================
echo.

REM Tjek om dist-electron findes
if not exist "dist-electron\win-unpacked" (
    echo FEJL: Electron app ikke bygget endnu!
    echo Kør først: npm run dist-portable
    pause
    exit /b 1
)

echo Kopierer nødvendige filer til Electron app...

REM Kopiér alle nødvendige filer direkte til app directory
copy "start-sagshub.bat" "dist-electron\win-unpacked\"
copy "loading.html" "dist-electron\win-unpacked\"
copy ".env" "dist-electron\win-unpacked\"

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
copy "package.json" "dist-electron\win-unpacked\"

echo.
echo ========================================
echo           FILER KOPIERET!
echo ========================================
echo.
echo Nu kan du teste Electron appen:
echo cd dist-electron\win-unpacked
echo SagsHub.exe
echo.
pause 
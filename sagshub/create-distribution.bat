@echo off
title SagsHub Distribution Creator
echo.
echo ========================================
echo      SagsHub Distribution Creator
echo ========================================
echo.

REM Tjek om .exe filen findes
if not exist "dist-electron\win-unpacked\SagsHub.exe" (
    echo FEJL: SagsHub.exe ikke fundet!
    echo Kør først: npm run dist-portable
    pause
    exit /b 1
)

echo Opretter distribution mappe...
if exist "SagsHub-Distribution" rmdir /s /q "SagsHub-Distribution"
mkdir "SagsHub-Distribution"

echo Kopierer filer...
xcopy "dist-electron\win-unpacked\*" "SagsHub-Distribution\" /E /I /H /Y
copy "start-sagshub.bat" "SagsHub-Distribution\"
copy "loading.html" "SagsHub-Distribution\"
copy ".env" "SagsHub-Distribution\"
copy "README-ELECTRON-SUCCESS.md" "SagsHub-Distribution\README.md"

echo.
echo ========================================
echo           DISTRIBUTION KLAR!
echo ========================================
echo.
echo Mappe: SagsHub-Distribution\
echo Hovedfil: SagsHub-Distribution\SagsHub.exe
echo.
echo For at dele med andre:
echo 1. Pak 'SagsHub-Distribution' mappen til ZIP
echo 2. Send ZIP filen til andre
echo 3. De skal bare udpakke og dobbeltklikke på SagsHub.exe
echo.
echo Tryk en tast for at åbne distribution mappen...
pause >nul
explorer "SagsHub-Distribution" 
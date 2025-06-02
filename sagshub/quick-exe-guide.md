# Hurtig .exe Guide

## Metode 1: Online Batch til EXE Converter (Hurtigst)

### Trin 1: Gå til online converter
1. Åbn browser og gå til: https://www.battoexeconverter.com/
2. Eller brug: https://convertio.co/bat-exe/

### Trin 2: Upload og konverter
1. Upload `sagshub-launcher.bat` filen
2. Klik "Convert" eller "Konverter"
3. Download den genererede `SagsHub.exe` fil

### Trin 3: Test .exe filen
1. Placer `SagsHub.exe` i samme mappe som `start-sagshub.bat`
2. Dobbeltklik på `SagsHub.exe`
3. SagsHub skulle starte automatisk

## Metode 2: Brug Windows indbyggede værktøjer

### Opret en Windows Shortcut:
1. Højreklik på `start-sagshub.bat`
2. Vælg "Create shortcut"
3. Omdøb til "SagsHub"
4. Højreklik på shortcut → Properties
5. Skift ikon hvis ønsket
6. Kopiér shortcut til andre computere

## Distribution

### Pak til ZIP:
1. Vælg hele `sagshub` mappen
2. Højreklik → "Send to" → "Compressed folder"
3. Omdøb til `SagsHub-v1.0.zip`
4. Send til andre computere

### Installation på andre computere:
1. Udpak ZIP filen
2. Dobbeltklik på `SagsHub.exe` eller shortcut
3. Følg instruktioner i terminalen

## Fordele ved denne metode:
- ✅ Meget hurtig at implementere
- ✅ Ingen komplekse dependencies
- ✅ Virker på alle Windows computere
- ✅ Nem at distribuere
- ✅ Automatisk installation af Node.js dependencies

## Ulemper:
- ❌ Ikke en "rigtig" .exe applikation
- ❌ Kræver stadig Command Prompt vindue
- ❌ Mindre professionelt udseende

## Hvis du vil have en rigtig .exe:
Se `README-EXE.md` for Electron build instruktioner (kræver TypeScript fejl rettes først) 
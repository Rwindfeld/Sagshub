# SagsHub .exe Guide

## Metode 1: Brug Batch til EXE Converter (Anbefalet)

### Trin 1: Download Bat to Exe Converter
1. Gå til: https://www.f2ko.de/en/b2e.php
2. Download "Bat To Exe Converter"
3. Installer programmet

### Trin 2: Konverter batch fil til .exe
1. Åbn "Bat To Exe Converter"
2. Vælg `sagshub-launcher.bat` som input fil
3. Vælg output sti (f.eks. `SagsHub.exe`)
4. Klik "Compile"

### Trin 3: Distribuer .exe filen
1. Kopiér hele `sagshub` mappen til andre computere
2. Sørg for `SagsHub.exe` er i samme mappe som `start-sagshub.bat`
3. Dobbeltklik på `SagsHub.exe` for at starte

## Metode 2: Brug PowerShell (Avanceret)

### Opret .exe med PowerShell:
```powershell
# Installer ps2exe modul
Install-Module ps2exe -Force

# Konverter PowerShell script til .exe
ps2exe -inputFile sagshub-launcher.ps1 -outputFile SagsHub.exe -iconFile assets/icon.ico
```

## Metode 3: Electron (Kompleks)

Hvis du vil have en rigtig Electron app:

### Ret TypeScript fejl først:
1. Ret alle import fejl i `client/src/`
2. Opdater Drizzle ORM til nyeste version
3. Ret schema konflikter

### Byg Electron app:
```bash
npm run build
cd client && npm run build && cd ..
npx electron-builder --publish=never
```

## Distribution

### For .exe fil (Metode 1):
1. **Pak hele mappen** som ZIP fil
2. **Send til andre computere**
3. **Udpak og kør** `SagsHub.exe`

### Systemkrav:
- Windows 10/11
- Node.js 18+ (installeres automatisk hvis mangler)
- PostgreSQL database
- Netværksadgang (hvis bruges på netværk)

## Fejlfinding

### "Node.js ikke fundet"
- Download fra: https://nodejs.org
- Installer LTS version
- Genstart computer

### "Database fejl"
- Tjek PostgreSQL kører
- Verificer `.env` indstillinger
- Tjek database forbindelse

### "Port 3000 optaget"
- Luk andre programmer der bruger port 3000
- Eller ændr port i `.env` fil

## Support

Hvis du har problemer:
1. Tjek `start-sagshub.bat` virker først
2. Verificer alle filer er kopieret korrekt
3. Tjek Windows Firewall indstillinger
4. Se server logs for fejlmeddelelser 
# SagsHub Distribution Guide

## Oversigt
SagsHub kan distribueres på flere måder til andre computere på netværket.

## Metode 1: Batch Fil Distribution (Anbefalet)

### Fordele
- ✅ Simpel at distribuere
- ✅ Automatisk installation af dependencies
- ✅ Viser netværks IP-adresse
- ✅ Ingen Electron overhead

### Trin for distribution:

#### 1. Forbered server-computer
```bash
# Kopiér hele sagshub mappen til andre computere
# Eller pak den som ZIP fil
```

#### 2. På hver computer
1. **Installer Node.js** (hvis ikke allerede installeret)
   - Download fra: https://nodejs.org
   - Vælg LTS version

2. **Kopiér SagsHub mappen** til computeren

3. **Kør `start-sagshub.bat`**
   - Dobbeltklik på filen
   - Første gang installerer den automatisk dependencies
   - Viser netværks IP-adresse

#### 3. Netværksadgang
- **Server computer:** Kør `start-sagshub.bat`
- **Andre computere:** Åbn browser og gå til `http://[SERVER-IP]:3000`

## Metode 2: Electron .exe (Avanceret)

### Hvis du vil have en .exe fil:

#### 1. Ret TypeScript fejl først
```bash
cd sagshub/sagshub/client
# Ret import fejl i src/queries/cases.ts og andre filer
```

#### 2. Byg applikationen
```bash
npm run build
npm run build:frontend
npm run dist
```

#### 3. Distribuer .exe
- Find filen i `dist-electron/`
- Kopiér til andre computere
- Kør .exe filen

## Netværkskonfiguration

### Server-siden
1. **Kopiér `config.example.env` til `.env`**
2. **Find din IP-adresse:**
   ```cmd
   ipconfig
   ```
   Se efter "IPv4 Address"

3. **Opdater `.env`:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=sagshub
   DB_USER=postgres
   DB_PASSWORD=wa2657321
   
   PORT=3000
   HOST=0.0.0.0
   
   # Sæt til din computers IP
   EXTERNAL_HOST=192.168.1.100
   ```

### Firewall indstillinger
```cmd
# Tillad port 3000 gennem Windows Firewall
netsh advfirewall firewall add rule name="SagsHub" dir=in action=allow protocol=TCP localport=3000
```

## Test netværksadgang

### Fra server-computer:
1. Start `start-sagshub.bat`
2. Noter IP-adressen der vises

### Fra andre computere:
1. Åbn browser
2. Gå til `http://[SERVER-IP]:3000`
3. Log ind med dine credentials

## Fejlfinding

### "Kan ikke forbinde til server"
1. Tjek firewall indstillinger
2. Ping server IP: `ping [SERVER-IP]`
3. Test port: `telnet [SERVER-IP] 3000`

### "Database fejl"
1. Tjek PostgreSQL kører på server
2. Verificer database credentials i `.env`

### "Node.js ikke fundet"
1. Installer Node.js fra https://nodejs.org
2. Genstart Command Prompt
3. Test: `node --version`

## Sikkerhed

### Produktion anbefalinger:
1. **Ændr database password**
2. **Sæt stærk SESSION_SECRET** i `.env`
3. **Begræns netværksadgang** til kun nødvendige IP-adresser
4. **Brug VPN** for fjernforbindelser

### Netværkssikkerhed:
- Kun tillad adgang fra betroede netværk
- Overvej at bruge HTTPS (kræver SSL certifikat)
- Opdater passwords regelmæssigt

## Support

### Hvis du har problemer:
1. Tjek at PostgreSQL database kører
2. Verificer netværksforbindelse
3. Tjek firewall indstillinger
4. Se server logs for fejlmeddelelser 
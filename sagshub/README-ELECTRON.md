# SagsHub Electron App

## Oversigt
SagsHub kan nu køres som en standalone .exe applikation der inkluderer både backend server og frontend interface.

## Forudsætninger
- PostgreSQL database kørende (lokalt eller på netværk)
- Node.js installeret (kun for udvikling/bygning)

## Byg .exe fil

### 1. Byg applikationen
```bash
cd sagshub/sagshub
npm run build
npm run build:frontend
```

### 2. Opret .exe fil
```bash
npm run dist
```

Dette opretter en .exe fil i `dist-electron/` mappen.

## Konfiguration til netværksadgang

### Server-siden (din computer)
1. **Kopiér `config.example.env` til `.env`**
2. **Opdater `.env` filen:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=sagshub
   DB_USER=postgres
   DB_PASSWORD=wa2657321
   
   PORT=3000
   HOST=0.0.0.0
   
   # Vigtigt: Sæt til din computers IP-adresse
   EXTERNAL_HOST=192.168.1.100  # Erstat med din IP
   ```

3. **Find din IP-adresse:**
   - Windows: `ipconfig` i Command Prompt
   - Se efter "IPv4 Address" under dit netværkskort

### Klient-siden (andre computere)
1. **Installer .exe filen** på andre computere
2. **Sørg for netværksadgang:**
   - Samme netværk som serveren
   - Firewall tillader port 3000
   - Appen vil automatisk forbinde til serveren

## Firewall konfiguration

### Windows Firewall
1. Åbn "Windows Defender Firewall"
2. Klik "Allow an app or feature through Windows Defender Firewall"
3. Klik "Change Settings" → "Allow another app"
4. Tilføj SagsHub.exe
5. Sørg for både "Private" og "Public" er markeret

### Eller tilføj port regel:
```cmd
netsh advfirewall firewall add rule name="SagsHub" dir=in action=allow protocol=TCP localport=3000
```

## Brug

### Lokal brug
- Start .exe filen
- Appen åbner automatisk og forbinder til localhost:3000

### Netværksbrug
1. **Server computer:** Start .exe filen
2. **Andre computere:** Start deres .exe fil
3. Alle forbinder automatisk til server-computeren

## Fejlfinding

### Kan ikke forbinde fra andre computere
1. Tjek firewall indstillinger
2. Verificer IP-adresse i `.env` fil
3. Test forbindelse: `telnet [SERVER-IP] 3000`

### Database forbindelsesfejl
1. Tjek PostgreSQL kører
2. Verificer database credentials i `.env`
3. Tjek database er tilgængelig på netværket

### Port allerede i brug
- Ændr PORT i `.env` fil til f.eks. 3001
- Genstart applikationen

## Udvikling

### Kør i udviklings-mode
```bash
npm run electron-dev
```

### Test netværksadgang
1. Start server: `npm run dev`
2. Find din IP: `ipconfig`
3. Test fra anden computer: `http://[DIN-IP]:3000`

## Sikkerhed

### Produktion anbefalinger
1. **Ændr SESSION_SECRET** i `.env`
2. **Begræns netværksadgang** til kun nødvendige IP-adresser
3. **Brug HTTPS** i produktion (kræver SSL certifikat)
4. **Opdater database passwords** regelmæssigt

### Netværkssikkerhed
- Kun tillad adgang fra betroede netværk
- Overvej VPN for fjernforbindelser
- Brug stærke database passwords 
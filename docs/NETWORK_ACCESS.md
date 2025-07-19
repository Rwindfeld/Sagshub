# 🌐 SagsHub Netværksadgang

Denne guide hjælper dig med at gøre SagsHub tilgængelig for alle enheder på samme netværk.

## 📋 Oversigt

SagsHub kan tilgås fra andre enheder på samme WiFi/netværk ved at konfigurere serveren til at lytte på alle netværksinterfaces.

## ⚙️ Konfiguration

### Server (Allerede konfigureret)
Serveren lytter automatisk på `0.0.0.0:3000`, hvilket betyder:
- ✅ Accepterer forbindelser fra alle enheder på netværket
- ✅ Viser automatisk tilgængelige IP-adresser ved opstart
- ✅ CORS er konfigureret til at acceptere alle origins

### Client (Allerede konfigureret)
Clienten er konfigureret til automatisk at detektere den korrekte server:
- ✅ I udvikling: Bruger samme IP som browseren med port 3000
- ✅ I produktion: Bruger samme host som clienten
- ✅ WebSocket forbindelser følger samme mønster

## 🚀 Sådan bruger du det

### 1. Start serveren
```bash
cd sagshub/server
npm run dev
```

### 2. Se tilgængelige IP-adresser
Serveren viser automatisk alle tilgængelige adresser:
```
🚀 SagsHub Server Running!
========================================
Local access: http://localhost:3000
Network access: http://192.168.1.100:3000
Network WebSocket: ws://192.168.1.100:3000
========================================
```

Eller kør netværksinfo scriptet:
```bash
npm run network-info
```

### 3. Tilgå fra andre enheder
På andre enheder (telefon, tablet, andre computere), åbn en browser og gå til:
```
http://[IP-ADRESSE]:3000
```

For eksempel: `http://192.168.1.100:3000`

## 📱 Understøttede enheder

- 💻 **Computere** - Windows, Mac, Linux
- 📱 **Smartphones** - iOS, Android
- 📋 **Tablets** - iPad, Android tablets
- 🌐 **Alle browsere** - Chrome, Firefox, Safari, Edge

## 🔧 Fejlfinding

### Problem: "Siden kan ikke indlæses"

**Løsninger:**
1. **Kontroller firewall** - Sørg for at port 3000 er åben
2. **Samme netværk** - Begge enheder skal være på samme WiFi
3. **Korrekt IP** - Brug IP-adressen vist i server output

### Problem: "Forbindelse afvist"

**Løsninger:**
1. **Server kører** - Kontroller at serveren er startet
2. **Port ikke i brug** - En anden service bruger muligvis port 3000
3. **Netværksforbindelse** - Test at enheder kan pinge hinanden

### Windows Firewall
Hvis Windows blokerer forbindelser:
1. Gå til Windows Firewall indstillinger
2. Vælg "Tillad en app gennem firewall"
3. Tilføj Node.js eller tillad port 3000

### Problem: "API fejl" eller "Ikke autoriseret"

**Løsninger:**
1. **Cookies/Sessions** - Log ind igen på den nye enhed
2. **CORS fejl** - Dette burde ikke ske med vores konfiguration
3. **Cache** - Prøv at refreshe siden (Ctrl+F5)

## 🛡️ Sikkerhedshensyn

### Lokal netværkssikkerhed
- ⚠️ **Kun lokalt netværk** - SagsHub er kun tilgængelig på dit lokale netværk
- 🔒 **Login påkrævet** - Alle brugere skal stadig logge ind
- 🏠 **Ikke internetadgang** - Systemet er ikke eksponeret til internettet

### Anbefalinger
- 💡 Brug kun på betroede netværk (hjemme/kontor)
- 🔄 Overvej VPN for fjernadgang
- 📊 Monitorer adgang via server logs

## 📊 Testing netværksadgang

### 1. Test lokal forbindelse
```bash
curl http://localhost:3000/api/health
```

### 2. Test netværksforbindelse
Fra en anden enhed:
```bash
curl http://[SERVER-IP]:3000/api/health
```

### 3. Test i browser
Åbn browser på anden enhed og gå til server IP-adressen.

## 🔄 Automatisk start

### Windows opgavestyring
Opret en opgave der starter SagsHub automatisk ved boot.

### Systemd (Linux)
Opret en systemd service til automatisk start.

### PM2 (Alle platforme)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 💡 Tips og tricks

- 🔍 **QR koder** - Generer QR kode med IP-adresse for nem adgang fra mobil
- 📌 **Bogmærker** - Gem IP-adressen som bogmærke på ofte brugte enheder
- 🔄 **DHCP** - IP-adresser kan ændre sig, tjek server output efter genstart
- 📱 **PWA** - Tilføj til hjemmeskærm på mobil for app-lignende oplevelse 
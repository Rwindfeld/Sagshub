
# SagsHub - Digitalt Sagsstyringssystem

Et moderne, webbaseret sagsstyringssystem udviklet til små og mellemstore virksomheder. SagsHub erstatter manuelle processer og forældede systemer med en brugervenlig, type-sikker og skalerbar løsning.

## 🎯 Hvad er SagsHub?

SagsHub er et komplet digitalt sagsstyringssystem, der gør det nemt for virksomheder at holde styr på deres sager, reparationer, returvarer og garantisager. Systemet er bygget som en webapplikation med adgang via browser uden installation af software.

## ✨ Hovedfunktioner

### 🔐 Brugeradministration
- **Rollebaseret adgang**: Kunder, medarbejdere og administratorer med forskellige rettigheder
- **Kundelogin**: Simpel adgang via telefonnummer og sagsnummer
- **Medarbejderlogin**: Sikker autentificering med brugernavn og adgangskode
- **Session-håndtering**: Automatisk login-bevarelse og sikker logout

### 📋 Sagsstyring
- **Sagsoprettelse**: Automatisk generering af unikke sagsnumre
- **Kundehåndtering**: Komplet CRM med kunde-informationer
- **Statusopdateringer**: Real-time tracking af sagsforløb med historik
- **Behandlingstyper**: Støtte for forskellige sagstyper (reparation, RMA, fejlsøgning)
- **Tilbehørshåndtering**: Registrering af medbragt udstyr og tilbehør

### 🔄 RMA og Ordrestyring
- **RMA-modul**: Komplet håndtering af returvarer med fejlbeskrivelser
- **Delebestillinger**: Integration med leverandørsystem
- **Ordrehåndtering**: Fra tilbud til fakturering
- **Varenumre og serienumre**: Detaljeret produktsporing

### 📊 Dashboard og Rapporter
- **Medarbejderdashboard**: Oversigt over aktive sager, søgning og filtrering
- **Kundedashboard**: Selvbetjening med sagsstatusvisning
- **Statusovervågning**: Automatiske alarmer for sager uden opdateringer
- **Statistikmodul**: Nøgletal og trends for forretningsanalyse
- **Udskriftsfunktion**: Følgesedler og sagsoversigter

### ⚡ Performance og Brugeroplevelse
- **Live-opdateringer**: WebSocket forbindelse for real-time status
- **Pagination**: Effektiv håndtering af store datamængder
- **Søgefunktion**: Hurtig filtrering på tværs af sager og kunder
- **Responsivt design**: Fungerer på desktop, tablet og mobil
- **Error boundaries**: Elegant fejlhåndtering

## 🛠️ Teknologier

### Frontend
- **React** + **TypeScript** - Type-sikker UI udvikling
- **Vite** - Hurtig development server og bundling
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Tilgængelige UI-komponenter
- **React Query** - Datahentning og caching
- **Wouter** - Simpel routing
- **Lucide React** - Moderne ikoner

### Backend
- **Node.js** + **Express.js** - Server-side runtime og framework
- **TypeScript** - Type-sikkerhed på server-side
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Robust relationsdatabase
- **Passport.js** - Autentificering og session-håndtering
- **WebSocket (ws)** - Real-time kommunikation
- **Winston** - Struktureret logging
- **Zod** - Runtime type validation

### Database og Sikkerhed
- **PostgreSQL** - Primary database med ACID compliance
- **Express-session** - Sikker session-håndtering
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Connection pooling** - Optimeret database performance

## 🚀 Installation og Opsætning

### Forudsætninger
- Node.js (v18 eller nyere)
- PostgreSQL (v13 eller nyere)
- Git

### 1. Klon Repository
```bash
git clone https://github.com/Rwindfeld/Sagshub.git
cd sagshub
```

### 2. Database Opsætning
```bash
# Opret PostgreSQL database
createdb sagshub

# Kopier environment variabler
cp config.example.env .env

# Rediger .env filen med dine database credentials
```

### 3. Backend Installation
```bash
cd server
npm install

# Kør database migrationer
npm run migrate

# Start backend server
npm run dev
```

### 4. Frontend Installation
```bash
cd ../client
npm install

# Start frontend development server
npm run dev
```

### 5. Shared Dependencies
```bash
cd ../shared
npm install
```

## 🔧 Konfiguration

### Environment Variables (.env)
```env
DATABASE_URL=postgresql://bruger:password@localhost:5432/sagshub
SESSION_SECRET=dit-sikre-session-secret
PORT=3000
NODE_ENV=development
```

### Default Login Credentials
- **Administrator**: Rattana / password123
- **Medarbejder**: Chris / password123
- **Kunde**: Telefonnummer + Sagsnummer (se systemet for eksempler)

## 📁 Projektstruktur

```
sagshub/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI komponenter
│   │   ├── pages/       # Sider/routes
│   │   ├── hooks/       # Custom React hooks
│   │   ├── queries/     # React Query definitioner
│   │   └── types/       # TypeScript types
├── server/              # Node.js backend
│   ├── routes/          # API endpoints
│   ├── scripts/         # Database scripts
│   └── migrations/      # Database migrationer
├── shared/              # Delte typer og skemaer
└── docs/                # Dokumentation
```

## 🔍 Test og Kvalitetssikring

### Testdata
Systemet inkluderer automatisk generering af realistiske testdata:
```bash
cd server
npm run generate-test-data
```

### Performance Testing
- Testet med 3000+ sager og kunder
- Optimeret database queries med pagination
- Caching af ofte brugte data

### Fejlhåndtering
- Brugervenlige fejlbeskeder
- Struktureret server-side logging
- Automatic error boundaries i frontend

## 🚀 Deployment Muligheder

### Lokalt Netværk (Raspberry Pi)
- Backend og PostgreSQL i Docker på Raspberry Pi 5
- LAN/VPN adgang med HTTP/HTTPS
- SSH administration og GPIO integration

### Cloud Deployment
- Kompatibel med Heroku, DigitalOcean, AWS
- Docker support for containerized deployment
- Environment-baseret konfiguration

### Desktop App
- Electron/Tauri wrapping af frontend
- Offline sync funktionalitet
- OS-specifikke notifikationer

## 📈 Fremtidige Udvidelser

### Kort sigt
- E-mail og SMS notifikationer
- Avanceret rapportering og analytics
- Mobil app (React Native)
- API integration til tredjeparter

### Lang sigt
- Maskinlæring for automatisk kategorisering
- IoT integration via Raspberry Pi GPIO
- Blockchain-baseret sporbarhed
- AI-assisteret kundeservice

## 🤝 Bidrag

Dette er et åbent source projekt udviklet som afgangsprojekt. Bidrag er velkomne!

### Development Workflow
1. Fork repository
2. Opret feature branch
3. Implementer ændringer med tests
4. Submit pull request

## 📄 Licens

Dette projekt er udviklet som uddannelsesprojekt og er tilgængeligt under MIT licens.

## 📞 Support

For spørgsmål og support, kontakt projektudvikleren eller opret et issue på GitHub.

---

**SagsHub** - Moderne sagsstyring for den digitale tidsalder 🚀

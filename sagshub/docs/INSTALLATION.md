# 🚀 SagsHub Installation Guide til Rattana

## 📋 Forudsætninger
- Node.js installeret (download fra https://nodejs.org - vælg LTS version)
- PostgreSQL database kørende
- Windows computer

## 📦 Filer der skal opdateres

### 1. Frontend konfiguration
**Fil:** `client/src/config.ts`
```typescript
// Brug den lokale IP-adresse for at tillade netværksadgang
export const BASE_URL = "http://192.168.110.139:5174";
```

### 2. Backend CORS konfiguration
**Fil:** `server/index.ts`
```typescript
// CORS configuration - tillad alle origins for netværksadgang
app.use(cors({
  origin: ['http://localhost:5174', 'http://192.168.110.139:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));
```

### 3. Vite proxy konfiguration
**Fil:** `client/vite.config.ts`
```typescript
server: {
  port: 5174,
  strictPort: true,
  host: '0.0.0.0',
  proxy: {
    '/api': {
      target: 'http://192.168.110.139:3000',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path,
      configure: (proxy, options) => {
        proxy.on('proxyReq', (proxyReq, req, res) => {
          proxyReq.setHeader('origin', 'http://192.168.110.139:5174');
        });
      }
    }
  },
```

### 4. API kald opdateringer
**Fil:** `client/src/queries/customers.ts`
```typescript
// Linje 38 og 82
const response = await fetch(`http://192.168.110.139:3000/api/customers/search?q=${encodeURIComponent(searchTerm)}`, {
const res = await fetch("http://192.168.110.139:3000/api/customers?page=1&pageSize=5000", { credentials: "include" });
```

**Fil:** `client/src/queries/users.ts`
```typescript
// Linje 32
const response = await fetch(`http://192.168.110.139:3000/api/users?${queryString}`);
```

**Fil:** `client/src/queries/rma.ts`
```typescript
// Linje 33
const response = await fetch(`http://192.168.110.139:3000/api/rma?${queryString}`);
```

**Fil:** `client/src/components/global-search.tsx`
```typescript
// Linje 41
const url = `http://192.168.110.139:3000/api/search?q=${encodeURIComponent(trimmedSearch)}`;
```

## 🔧 Installation trin

### Trin 1: Opdater .env fil
**Fil:** `.env`
```env
# Database konfiguration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sagshub
DB_USER=postgres
DB_PASSWORD=ÆNDRE_DETTE_PASSWORD

# Server konfiguration
PORT=3000
HOST=0.0.0.0

# Session secret
SESSION_SECRET=your-super-secret-session-key-here

# Netværk konfiguration
EXTERNAL_HOST=192.168.110.139

# Frontend URL
FRONTEND_URL=http://192.168.110.139:5174

# Miljø
NODE_ENV=production
```

### Trin 2: Installer dependencies
```bash
npm install
```

### Trin 3: Byg backend
```bash
npm run build
```

### Trin 4: Start serveren
```bash
npm start
```

## 🌐 Netværksadgang

### Fra server computer:
- **Lokal:** http://localhost:3000
- **Netværk:** http://192.168.110.139:3000

### Fra andre computere på netværket:
- **Frontend:** http://192.168.110.139:5174
- **Backend API:** http://192.168.110.139:3000

## 🔐 Login information
- **Brugernavn:** admin
- **Adgangskode:** admin

## 🚨 Vigtige bemærkninger

1. **Firewall:** Sørg for at Windows Firewall tillader port 3000 og 5174
2. **Database:** PostgreSQL skal køre og være tilgængelig
3. **Netværk:** Alle enheder skal være på samme netværk
4. **IP-adresse:** 192.168.110.139 skal være din computers faktiske IP-adresse

## 🔧 Fejlfinding

### Hvis forbindelsen ikke virker:
1. Tjek at serveren kører: `npm start`
2. Ping IP-adressen: `ping 192.168.110.139`
3. Test port: `telnet 192.168.110.139 3000`
4. Tjek firewall indstillinger

### Hvis login ikke virker:
1. Ryd browser cache
2. Tjek at session cookies er tilladt
3. Verificer database forbindelse

## 📞 Support
Hvis du har problemer, kontakt mig med:
- Fejlbeskeder fra console
- Screenshots af problemet
- Hvilken browser du bruger 
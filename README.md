# SAGSHUB – Digitalt sagsstyringssystem

**SAGSHUB** er en moderne, webbaseret prototype på et digitalt sagsstyringssystem, udviklet til små og mellemstore virksomheder som *TJData*. Systemet understøtter effektiv håndtering af RMA-, retur- og værkstedssager, og er udviklet som afgangsprojekt på IT-teknologuddannelsen.

---

## 🎯 Formål

At erstatte manuelle processer og et forældet system med en brugervenlig, type-sikker og modulær løsning, der:
- Skaber bedre overblik over sager
- Øger effektiviteten i sagsbehandlingen
- Reducerer fejl og manuelle arbejdsgange

---

## ⚙️ Teknologistak

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Radix UI, React Query, Wouter
- **Backend:** Node.js, Express.js, TypeScript, Drizzle ORM
- **Database:** PostgreSQL
- **Autentificering:** Passport.js, express-session
- **Tests:** Unit- og integrationstests, seed-data, fejlhåndtering

---

## 🧩 Funktionalitet

- Login for både kunder og medarbejdere
- CRUD for kunder, sager, ordrer og RMA
- Statussystem med historik og alarmer
- Dashboard med filtrering og søgning
- Adgangsbegrænsning efter brugerrolle
- Udskriv-funktion og statistikmodul
- Automatisk testdatagenerering

---

## 🧪 Test og stabilitet

Systemet er testet med både automatiserede og manuelle tests, og har vist sig robust under belastning (testet med op til 3000 sager/kunder).

---

## 🛠️ Installation

```bash
git clone https://github.com/DIN-BRUGERNAVN/sagshub.git
cd sagshub
npm install
npm run dev

# Grisburgh — D&D Campaign Manager

Een lokaal draaiende web-app voor de Grisburgh D&D-campagne. De DM beheert personages, locaties, organisaties, voorwerpen en archief-documenten. Spelers krijgen een gefilterde read-only view via een gedeelde URL.

## Hoe het werkt

- **DM** logt in met een wachtwoord en kan alles aanmaken, bewerken en verbergen/onthullen
- **Spelers** openen dezelfde URL zonder login en zien alleen wat de DM zichtbaar heeft gemaakt
- **Server-side filtering** zorgt ervoor dat spelers nooit bij verborgen data kunnen (geen client-side trucjes mogelijk)
- **Real-time updates** via Socket.io — als de DM iets wijzigt, updaten de speler-browsers automatisch

### Drie secties

| Sectie | Wat |
|---|---|
| **Campagne** | Personages, locaties, organisaties, voorwerpen — met cross-referenties, stat blocks, afbeeldingen |
| **Archief** | Documenten (brieven, kaarten, codex, etc.) met 3-state onthulling: verborgen → wazig → onthuld |
| **Dashboard** | Read-only wiki-view van alle zichtbare entities |

### DM-features

- Zichtbaarheid togglen per entity/document
- Geheime velden die apart onthuld kunnen worden
- DM-notities (alleen voor DM zichtbaar)
- Perkament-tekst editor voor archief-documenten
- Verborgen connecties (selectief NPC/locatie-links verbergen op documenten)

## Installatie

### Vereisten

- **Node.js 24** (zie `.node-version`)
- **cloudflared** voor extern delen (optioneel)

### Setup

```bash
cd grisburgh
nvm use           # activeert Node 24 via .nvmrc
npm install
```

### Cloudflared installeren (eenmalig)

```bash
brew install cloudflared
```

## Opstarten

### 1. Server starten

```bash
npm run dev       # start met auto-reload bij code changes
# of
npm start         # zonder auto-reload
```

Server draait op http://localhost:3000

### 2. Extern delen via Cloudflare Tunnel

Open een tweede terminal:

```bash
cd grisburgh
npm run tunnel
```

Dit geeft een publieke URL (bijv. `https://iets-random.trycloudflare.com`). Deel die met je spelers. De URL verandert elke keer dat je de tunnel opnieuw start.

### 3. Inloggen als DM

Klik op "DM Login" in de header en gebruik wachtwoord: `grisburgh-dm`
(aanpasbaar in `config.js`)

## Verder werken

### Project structuur

```
grisburgh/
  server.js              # Express + Socket.io entry point
  config.js              # Poort, wachtwoord, session secret
  routes/
    api.js               # REST API + server-side filtering
    auth.js              # DM login + middleware
  lib/
    storage.js           # JSON file opslag + afbeeldingen
  public/
    index.html           # SPA shell (Tailwind CSS)
    js/
      app.js             # App shell, auth, modals
      render-campagne.js # Entity CRUD, cards, editor
      render-archief.js  # Documenten, onthulling, timeline
      render-dashboard.js# Read-only wiki view
      api.js             # Fetch wrapper
      socket-client.js   # Real-time updates
    css/
      theme.css          # Custom styles (scrollbar, stat blocks, etc.)
  data/                  # Persistent data (gitignored)
  tests/                 # Automatische tests
```

### Data

Alle data staat in `data/` als JSON-bestanden. Deze map is gitignored. Afbeeldingen staan in `data/files/`. Back-up = gewoon de `data/` map kopiëren.

### Tests draaien

```bash
nvm use
npm test
```

### Claude Code gebruiken

Om verder te werken met Claude Code, open een terminal in de `grisburgh/` map:

```bash
cd ~/apps/alan/grisburgh
claude
```

De plan-file (`zany-stirring-rose.md`) beschrijft de volledige architectuur en het implementatieplan.

## Scripts

| Script | Commando |
|---|---|
| `npm start` | Server starten |
| `npm run dev` | Server starten met auto-reload |
| `npm test` | Tests draaien |
| `npm run test:watch` | Tests draaien met auto-reload |
| `npm run tunnel` | Cloudflare Tunnel starten |

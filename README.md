# FiskeJournal 🎣

Privat fiskejournal-app til iOS for to brugere.

## Funktioner

- **Interaktivt kort** over Danmark – hold fingeren nede for at tilføje fiskepladser
- **Turregistrering** med dato, tid, vejr, fangster og billeder
- **Automatisk vejrhentning** fra yr.no (lufttemperatur, vind, lufttryk, vejrforhold)
- **Månefase** beregnes automatisk ud fra turens dato
- **Manuelt vejrinput**: vandtemperatur, tidevand, sigtbarhed, luftfugtighed
- **Fangstlog**: art, vægt, længde, tidspunkt, billede, genudsat-markering
- **Fangstgalleri** – se alle billeder samlet
- **Turhistorik** – kronologisk oversigt over alle ture

## Kom i gang

### Krav

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/go) på din iPhone

### Installation

```bash
npm install
npm start
```

Scan QR-koden med Expo Go-appen på din iPhone.

### Byg til iOS (TestFlight)

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

Kræver Apple Developer-konto.

## Tech Stack

- **Framework**: React Native + Expo SDK 51
- **Navigation**: Expo Router (filbaseret routing)
- **Kort**: react-native-maps (Apple Maps på iOS)
- **Lagring**: AsyncStorage + expo-file-system
- **Vejr**: yr.no LocationForecast API (gratis)
- **Billeder**: expo-image-picker

## Struktur

```
app/
  (tabs)/
    index.tsx      ← Kort (forside)
    trips.tsx      ← Alle ture
    gallery.tsx    ← Fangstgalleri
  spot/[id].tsx    ← Fiskeplads-detaljer + historik
  visit/[id].tsx   ← Tur-detaljer (vejr, fangster, billeder)
lib/
  types.ts         ← TypeScript-typer
  storage.ts       ← AsyncStorage CRUD
  weather.ts       ← yr.no API + månefase
  constants.ts     ← Farver, fiskearter, vejrtyper
```

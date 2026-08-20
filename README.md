# 🎮 Centro de Juegos

Portada (hub) con varios juegos idle que **coexisten**, cada uno en su ruta y con
su propio guardado. Mobile-first, estático (sin build), desplegable en Vercel.

## Juegos
- **🪙 Coin Rush** — `/coin-rush/` — monedas que caen por cintas y máquinas hasta el
  cofre; mejoras por partes (valor/cadencia/velocidad), tiers, diamantes y árbol.
- **🌱 Jardín Cósmico** — `/jardin/` — da vida a un planeta muerto; eras, prestigio
  (Florecer), árbol de semillas y 2º prestigio (Supernova).

La portada está en `/` (raíz). Cada juego tiene un botón para volver al centro.
Los guardados son independientes (claves distintas en `localStorage`, mismo origen).

## Estructura
```
index.html                 → hub (portada)
manifest.webmanifest       → PWA del hub
assets/  fonts/ (compartidas) · hub-icon.svg · icon-*.png
coin-rush/  index.html · css/ · js/ · assets/ · manifest.webmanifest
jardin/     index.html · css/ · js/ · assets/ · manifest.webmanifest
docs/GAME_DESIGN.md        → diseño de Coin Rush
vercel.json                → estático + cleanUrls
```

## Desarrollo
```bash
python3 -m http.server 8000   # abre http://localhost:8000
```

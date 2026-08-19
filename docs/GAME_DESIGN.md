# 🪙 Coin Rush — Documento de Diseño

> Juego 2D idle/automación. Genera monedas que **fluyen por un recorrido** pasando
> por **estaciones** que las potencian, hasta caer en el **cofre** y sumar a tu dinero.
> Mobile-first. Sustituye a Jardín Cósmico (archivado en `archive/jardin-cosmico/`).

## 1. Bucle principal
1. Un **generador** suelta monedas cada cierto tiempo.
2. Las monedas recorren un **camino 2D** pasando por **estaciones** que las modifican.
3. Al llegar al **cofre**, su valor **se suma a tu dinero**.
4. Gastas dinero en **subir el nivel del tablero** (más cadencia/valor) y en **cambiar estaciones**.
5. Al llenar la **meta del tier**, **Asciendes**: nuevo recorrido (más largo/mejor) + **💎 diamantes**.
6. Gastas 💎 en el **Árbol de Habilidades** (mejoras permanentes).

## 2. Monedas y tiers
- Tiers de moneda: 🟤 Bronce → ⚪ Plata → 🟡 Oro → 🔵 Platino → 💠 Diamante → 🔴 Rubí…
- Cada tier vale ×10 respecto al anterior. Color/brillo distinto.
- La **Forja** puede subir el tier de una moneda al pasar.
- El tier base de spawn sube en tiers de tablero altos (y con habilidades).

## 3. Estaciones (efecto al pasar una moneda)
- 💰 **Multiplicador** — `valor ×= power` (base ×2).
- ⚒️ **Forja** — con probabilidad `p`, sube el tier de la moneda (×10 valor).
- 🎰 **Casino** — con prob. `winChance` `valor ×= winMult`; si no, se pierde la moneda.
- 🔀 **Bifurcación** — divide la moneda en 2 (cada una vale ~0.6× → más caudal).

Las estaciones las **coloca el juego** al generar el recorrido. El jugador puede
**cambiar 1–2 estaciones por tier** (coste creciente; +swaps con habilidades).

## 4. Progresión
- **Dinero**: moneda gastable (niveles de tablero + cambios de estación).
- **Nivel de tablero**: se sube con dinero → más cadencia y valor base.
- **Meta de tier** (`bankedThisTier ≥ goal(tier)`): habilita **Ascender**.
- **Ascender**: tier++, +💎, **nuevo recorrido** (más slots, mejores estaciones),
  reinicia el progreso del tier (no el dinero). Cada pocos tiers sube el tier base de moneda.
- **💎 Diamantes**: recompensa por ascender. Se gastan en el **Árbol de Habilidades**.

## 5. Árbol de Habilidades (💎)
Ramas: **Producción** (valor base, cadencia), **Estaciones** (potencia de multiplicador,
prob. de forja, casino, bifurcación), **Meta** (+swaps/tier, tier de spawn, +💎 al ascender,
ganancias offline).

## 6. Técnica
- **Canvas 2D** para el recorrido, estaciones y monedas (animación fluida, muteable).
- HTML + CSS + JS vanilla + `localStorage`. Sin build. Mobile-first (portrait).
- Guardado robusto (autosave + al comprar) + **export/import** (código de copia).
- Progreso offline aproximado por tasa reciente de ganancia.

## 7. Estructura
```
index.html · css/style.css · manifest.webmanifest · vercel.json
js/  format · data · state · route · engine · render · ui · main
docs/GAME_DESIGN.md
archive/jardin-cosmico/   (juego anterior, jugable)
```

## 8. Roadmap
- **Fase 1 (MVP, esta):** bucle completo — recorrido, monedas fluyendo por 4 estaciones,
  cofre, dinero, nivel de tablero, meta+Ascender, 💎, árbol, cambio de estaciones, guardado.
- Siguientes: pulido visual/sonido, más estaciones, eventos (moneda dorada), balanceo fino.

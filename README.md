# 🪙 Coin Rush

Juego **2D idle/automación**. Un generador suelta **monedas** que recorren un
camino pasando por **estaciones** que las potencian (multiplican, suben de tier,
apuestan, dividen) hasta caer en el **cofre** y sumar a tu dinero.

Mobile-first. Sin instalación: solo abrir en el navegador.

## ▶️ Cómo jugar
- Las monedas fluyen solas por el recorrido y caen en el cofre 🧰.
- Gasta dinero en **subir el nivel del tablero** (más cadencia y valor).
- Toca una **estación** para cambiarla (1–2 veces por tier, con coste).
- Llena la **meta del tier** y pulsa **Ascender**: nuevo recorrido + **💎 diamantes**.
- Gasta 💎 en el **Árbol de Habilidades** (mejoras permanentes).

## 🧱 Stack
HTML + CSS + JavaScript vanilla + Canvas 2D + `localStorage`. Sin build.

```
index.html · css/style.css · manifest.webmanifest · vercel.json
js/  format · data · state · route · engine · render · ui · main
docs/GAME_DESIGN.md
archive/jardin-cosmico/   (juego anterior, jugable)
```

## 🚀 Despliegue
Sitio estático. `vercel.json` para desplegar en Vercel sin framework (Preset = *Other*).
También sirve con `python3 -m http.server`.

---
> El juego anterior, **Jardín Cósmico**, está archivado y jugable en
> [`archive/jardin-cosmico/`](archive/jardin-cosmico/).

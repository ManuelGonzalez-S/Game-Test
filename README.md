# 🌱 Jardín Cósmico

Juego **idle/interactivo** web. Das vida a un planeta muerto liberando *Esporas*
al tocarlo, cultivas formas de vida que producen solas, y haces crecer tu mundo.

Mobile-first (prioridad móvil), también funciona en portátil. Sin instalación:
solo abrir en el navegador.

## ▶️ Cómo jugar

Abre `index.html` en cualquier navegador (móvil o escritorio). O sírvelo:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

- **Toca el planeta** para liberar Esporas.
- Gasta Esporas en **Formas de Vida** (Musgo, Líquenes, Hongos...) para producir
  esporas automáticamente.
- El juego **autoguarda** y calcula el progreso mientras estás fuera.

## 🧱 Stack

HTML + CSS + JavaScript vanilla + `localStorage`. Sin build step.

```
index.html
css/style.css
js/  format.js · data.js · state.js · engine.js · ui.js · main.js
docs/GAME_DESIGN.md   <- diseño completo y roadmap por fases
```

## 🗺️ Estado

- ✅ **Fase 1 (MVP):** recurso, planeta tocable, 5 generadores, producción pasiva,
  autoguardado, progreso offline.
- ⏭️ Siguientes: mejoras y milestones, bloom visual, prestigio (Florecer), logros.

Ver [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) para el diseño y roadmap completos.

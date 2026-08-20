# 🌱 Jardín Cósmico — Documento de Diseño & Roadmap

> Juego idle/interactivo web. Das vida a un planeta muerto hasta convertirlo en
> un mundo próspero. Mobile-first (prioridad móvil), también en portátil.
> Adictivo a corto y largo plazo.

---

## 1. Fantasía / Pitch

Encuentras un planeta gris y sin vida. Con cada toque liberas **Esporas**, la
energía de la vida. Poco a poco cultivas musgo, hongos, bosques, criaturas...
hasta que el planeta **florece**. Cuando alcanza su esplendor, puedes dejarlo
madurar y **renacer** con **Semillas Estelares** que hacen crecer el siguiente
planeta mucho más rápido.

Tono: zen, relajante, muy visual. El planeta cambia de aspecto según tu progreso.

---

## 2. Bucle principal (core loop)

1. **Tocas el planeta** → liberas Esporas (producción manual).
2. **Gastas Esporas** en **Formas de Vida** (generadores) → producción pasiva.
3. **Compras Mejoras** → multiplican producción por toque y pasiva.
4. **Alcanzas hitos** → el planeta cambia visualmente y desbloquea nueva vida.
5. **Florecer (prestigio)** → reinicias a cambio de un multiplicador permanente.

---

## 3. Economía

- **Recurso base:** Esporas (🌱).
- **Recurso de prestigio:** Semillas Estelares (✨) — se ganan al Florecer.
- **Escalado de coste:** cada compra de un generador sube su coste ×1.15.
- **Escalado entre generadores:** cada nueva forma de vida ~un orden de magnitud
  más cara y productiva que la anterior (curva a afinar en balanceo).
- **Formato de números:** 1.23K, 4.56M, B, T, Qa, Qi... (sufijos), luego notación
  científica si hace falta.

### Formas de Vida (generadores) — orden de desbloqueo

| # | Nombre        | Emoji | Rol                                  |
|---|---------------|-------|--------------------------------------|
| 1 | Musgo         | 🦠    | Primer generador, baratísimo         |
| 2 | Líquenes      | 🌾    |                                      |
| 3 | Hongos        | 🍄    |                                      |
| 4 | Helechos      | 🌿    |                                      |
| 5 | Árboles       | 🌳    |                                      |
| 6 | Insectos      | 🐛    |                                      |
| 7 | Polinizadores | 🦋    |                                      |
| 8 | Aves          | 🐦    |                                      |
| 9 | Fauna         | 🦌    |                                      |
| 10| Consciencia   | 🧬    | Cierre de ciclo, prepara el Florecer |

### Mejoras (ejemplos)

- **Toque fértil:** +producción por toque (x2, x3...).
- **Simbiosis:** multiplica un generador concreto (x2 por hito de cantidad).
- **Fotosíntesis global:** multiplicador a toda la producción pasiva.
- **Milestones automáticos:** cada 10/25/50/100 de un generador → x2 su output.

---

## 4. Sistemas de retención

- **Progreso offline:** al volver, "mientras no estabas ganaste X Esporas"
  (con posible tope y/o tasa reducida para no romper balance).
- **Prestigio (Florecer):** reset por Semillas Estelares (`floor((total/1000)^(1/3))`,
  mín. 3 para el 1er Florecer). Las semillas se **gastan** en el **Árbol de Semillas**
  (nodos permanentes entre floradas), no dan bonus por acumularlas.
- **Árbol de Semillas (22 nodos, 5 ramas):**
  - 🌿 *Fertilidad* — ×prod global multiplicativo (rompe el muro de mediados).
  - 👆 *Vitalidad* — poder de toque y sinergia toque↔producción.
  - 🌙 *Letargo* — tasa y tope del progreso offline.
  - 🧬 *Sinergia* — multiplicadores por grupo de generadores (base/medio/avanzado).
  - ✨ *Cosecha* — meta: head-start (empezar con generadores/mejoras) y +% semillas.
- **2º prestigio (Supernova):** al acumular Semillas (500 por Núcleo, raíz cuadrada)
  puedes reiniciar TODA la capa de Semillas (semillas + árbol + floradas) a cambio de
  **Núcleos Estelares** (`floor((seedsDesdeSupernova/500)^0.5)`): cada Núcleo da **×3
  producción** (multiplicativo) y **+25% semillas**. Bucle meta que compone.
- **Compra en lote:** selector ×1 / ×10 / ×100 / Máx para comprar generadores.
- **Logros / hitos:** recompensas por totales, por generadores, por toques.
- **Bloom visual:** el planeta evoluciona (color, elementos, criaturas) según el
  total de Esporas producidas → recompensa visible al progreso.

---

## 5. UX / Diseño (mobile-first)

- **Vertical (portrait)** como diseño principal; portátil = versión centrada/anchura máx.
- **Layout:**
  - Arriba: contador de Esporas + producción/seg.
  - Centro: **planeta grande** (botón principal de toque, una mano).
  - Abajo: lista scrollable de generadores/mejoras (pestañas).
- Targets grandes (mín. 44px), sin elementos diminutos.
- Feedback "jugoso": números flotantes al tocar, partículas, micro-animaciones,
  vibración opcional (`navigator.vibrate`), sonido opcional muteable.
- Respeta `prefers-reduced-motion` y tema claro/oscuro.

---

## 6. Arquitectura técnica

- **Stack:** HTML + CSS + JavaScript vanilla (sin frameworks pesados). `localStorage`.
- **Sin build step** al principio (abrir `index.html` y funciona) → iteración rápida.
- **Game loop:** `requestAnimationFrame` para render + acumulador de tiempo para
  la lógica (tick fijo, p.ej. cada 100 ms) → estable en móvil.
- **Estado central** (`state`) serializable → guardar/cargar directo.
- **Autoguardado** cada pocos segundos + al `visibilitychange`/`beforeunload`.
- **Estructura de ficheros (propuesta):**
  ```
  index.html
  css/style.css
  js/
    state.js        # estado + save/load + offline
    data.js         # definición de generadores, mejoras, hitos
    engine.js       # game loop, producción, compras
    ui.js           # render, eventos, feedback visual
    format.js       # formato de números
    main.js         # arranque
  ```
- **Publicación:** GitHub Pages (rama), URL abrible en móvil y portátil.

---

## 7. Roadmap por fases

> Cada fase deja algo **jugable/probable**. Afinamos balanceo tras cada una.

### Fase 0 — Fundaciones
- Estructura de proyecto y shell HTML/CSS mobile-first.
- Game loop con tick fijo. Formato de números. Save/load en localStorage.

### Fase 1 — Núcleo jugable (MVP) ✅ HECHA
- Recurso Esporas + planeta tocable (producción manual).
- 3–4 generadores con compra y producción pasiva.
- Contador de Esporas y producción/seg. Autoguardado.
- **Objetivo:** divertido desde el minuto 1.

### Fase 2 — Progresión ✅ HECHA
- Los 10 generadores completos + escalado de costes.
- Mejoras comprables (toque, sinergia toque↔producción, global) + pestañas.
- Milestones automáticos (×2 por cantidad: 10/25/50/100/…).
- Progreso offline con tiempo ausente.

### Fase 3 — Vida visual (bloom) ✅ HECHA
- El planeta evoluciona visualmente por eras (SVG por capas).
- Feedback jugoso: partículas, ripples, celebración de era, sonido/vibración.

### Fase 4 — Prestigio (Florecer) ✅ HECHA
- Semillas Estelares (raíz cúbica de esporas totales), multiplicador permanente
  (+20%/semilla), flujo de reset con celebración. Pestaña dedicada.

### Fase 5 — Retención & pulido ✅ HECHA
- 13 logros con modal (bloqueados/desbloqueados), toasts al desbloquear.
- Progreso offline con tiempo ausente. Icono de sonido SVG.
- Pendiente futuro: balanceo fino, tema claro/oscuro, publicación.

---

## 8. Decisiones abiertas (a afinar sobre la marcha)

- Curva exacta de costes/producción (balanceo).
- Tope y tasa del progreso offline.
- Fórmula final de Semillas Estelares.
- Estilo visual del planeta (SVG dibujado vs. capas/emoji vs. canvas).
- ¿Sonido desde el principio o más adelante?

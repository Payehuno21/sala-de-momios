# CONTEXTO PARA CLAUDE CODE — Sala de Momios

Este archivo resume todo lo que ya se decidió, validó y corrigió en la sesión
anterior (vía claude.ai), para que Claude Code no tenga que redescubrirlo.
Bórralo cuando ya no lo necesites — no es parte del producto, es para retomar
el hilo del proyecto.

## Estado actual

- Repo en GitHub: `Payehuno21/sala-de-momios`
- Deploy en Vercel: `sala-de-momios.vercel.app`
- Stack: Vite + React + Tailwind, sin backend propio — usa Vercel Serverless
  Functions (`/api/odds.js`, `/api/football.js`) como proxy seguro para no
  exponer las API keys en el navegador.
- Variables de entorno YA configuradas en Vercel: `ODDS_API_KEY` (The Odds
  API, plan Professional, cuenta en **the-odds-api.com con guiones** — NO
  confundir con theoddsapi.com sin guiones, son productos distintos),
  `FOOTBALL_API_KEY` (api-football.com, plan directo no RapidAPI).

## Decisiones de producto ya tomadas (no las reabras sin razón nueva)

1. **Nunca usar la palabra "lock"** ni prometer apuestas seguras. Todo se
   comunica como "confianza relativa" con incertidumbre visible siempre.
2. **No incorporar bajas/lesiones** como dato — no hay fuente confiable y
   gratuita verificada para esto. Se decidió explícitamente no inventarlo.
3. **Motivación se calcula matemáticamente** (combinatoria de puntos
   posibles en la tabla), nunca se busca como dato externo ni se infiere.
4. **Rotación de alineación**: solo se cuenta cuántos titulares cambiaron
   vs. el 11 habitual reciente — no se intenta valorar qué jugador es
   "importante" (eso requeriría un rating individual que no existe en este
   proyecto).
5. **No usar XGBoost ni ML complejo**: 6 fuentes independientes revisadas
   confirman que con el volumen de datos de fútbol disponible, Elo bien
   calibrado iguala o supera a modelos más complejos.
6. Plan de expansión: **Mundial 2026 primero** (banco de pruebas, ya en
   curso, con momios/calendario reales), **Liga MX después** cuando arranque
   su temporada relevante, MLS más adelante.

## Bugs reales ya encontrados y corregidos (no los repitas)

1. **Fórmula `eloToLambdas` con exponente muy débil** (era 2.2, daba
   probabilidades demasiado planas en diferencias grandes de Elo) →
   corregido a exponente 2.5 con cap de lambda [0.2, 4.5]. Validado contra
   momios reales de mercado (Inglaterra-Ghana, Curazao-Costa de Marfil).
2. **Tabla `BASE_ELO` mal calibrada** en 15 de 48 equipos (los más débiles
   estaban sobrestimados) → reconstruida usando 21 valores reales de
   eloratings.net como anclas + interpolación para el resto. Ver
   `docs/MODELO.md` para el detalle completo y las fuentes.
3. **Lógica de `computeMotivation`** tuvo 3 iteraciones con bugs reales
   antes de quedar bien (contaba mal qué rivales amenazan el top-2). La
   versión actual está validada contra 4 casos de control — no la
   reescribas sin volver a correr esos casos.
4. **Error 422 en The Odds API**: el endpoint `/odds` solo acepta featured
   markets (h2h, totals, spreads) — `btts` lo rompía. Se quitó del default.
   BTTS en vivo (vía `/events/{id}/odds` por partido) sigue pendiente de
   implementar si se necesita.

## Pendiente de verificar con datos reales (aún no confirmado)

- La estructura exacta de la respuesta de lineups de API-Football
  (`src/useLineupRotation.js` asume `response[].startXI[].player.name` según
  la documentación pública, pero nunca se probó contra una respuesta real).
- Si vale la pena el costo de cuota de consultar BTTS por evento individual
  para el volumen de partidos del día.
- El motor en general fue validado con un backtest de solo ~30 partidos
  reales del Mundial — la muestra es pequeña (intervalo de confianza amplio,
  documentado en `docs/MODELO.md`). No sobre-interpretar el accuracy medido.

## Cómo correr y desplegar

```bash
npm install
npm run dev      # desarrollo local
npm run build    # probar que compile antes de cualquier push
```

Deploy: push a `main` en GitHub → Vercel redespliega solo. Para forzar
actualización del calendario manualmente: pestaña Actions en GitHub →
workflow "Actualizar calendario Mundial 2026" → Run workflow.

Lee `docs/MODELO.md` completo antes de tocar el motor — tiene el historial
de cada decisión y por qué se tomó, con honestidad sobre lo que no funcionó.

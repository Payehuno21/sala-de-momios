# Sala de Momios — Mundial 2026

Herramienta de análisis de value betting para el Mundial 2026. Calcula probabilidades reales (Elo + Dixon-Coles + Monte Carlo) y las compara contra los momios que tú ingreses, para detectar dónde el mercado y el modelo discrepan.

**No es un sistema de apuestas ganadoras garantizadas.** Es una calculadora de edge estadístico. Lee `docs/MODELO.md` antes de usarlo con dinero real.

## Stack

- React 18 + Vite
- Tailwind CSS
- Recharts (gráficos)
- flag-icons (banderas reales vía CDN)
- Sin backend — todo corre en el navegador, los datos vienen de un JSON estático actualizado por GitHub Actions

## Instalación local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Build de producción

```bash
npm run build
npm run preview   # para probar el build localmente antes de desplegar
```

El build sale en `dist/`.

## Actualizar el calendario manualmente

```bash
npm run update-data
```

Esto corre `scripts/update-data.mjs`, que trae el calendario oficial desde `openfootball/worldcup.json` (fuente pública, sin API key) y lo guarda en `public/data/matches.json`. En producción esto lo hace automáticamente el GitHub Action en `.github/workflows/update-data.yml` cada 15 minutos durante el horario de partidos.

## Desplegar a Vercel

1. Sube este repo a GitHub (ver `DEPLOY.md` para el paso a paso exacto).
2. En [vercel.com](https://vercel.com), `New Project` → importa el repo.
3. Vercel detecta Vite automáticamente. Framework Preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Deploy.

Después del primer deploy, ve a la pestaña **Actions** de tu repo en GitHub y corre el workflow `Actualizar calendario Mundial 2026` manualmente una vez (botón "Run workflow") para generar el primer `matches.json` real. Vercel se redeploya solo cada vez que el bot hace commit.

## Estructura

```
src/
  engine.js              # Motor estadístico (Elo, Dixon-Coles, Monte Carlo)
  useMatches.js          # Hook que carga public/data/matches.json
  App.jsx                # Componente raíz, navegación
  components/            # Logo, banderas, marcador, gráficos
  tabs/                  # Las 5 pantallas: Calculadora, Partidos, Grupos, Simular, Bitácora
scripts/
  update-data.mjs        # Pipeline de datos (corre en GitHub Actions)
docs/
  MODELO.md              # Documentación honesta de qué funciona y qué no
```

## Límites conocidos (ver docs/MODELO.md para el detalle)

- Validado contra ~30 partidos reales del torneo: el mercado 1X2 muestra señal, Over/Under y BTTS no.
- Con tan pocos partidos, cualquier accuracy medido tiene un intervalo de confianza muy amplio — no sobre-interpretar.
- No incorpora lesiones, alineaciones, clima.

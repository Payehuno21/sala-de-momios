# Documentación del modelo — honesta, sin maquillaje

## Fase 3 (25 de junio) — Motor multi-capa + APIs reales

Se agregó una nueva pestaña "Hoy" que combina:
1. **Momios en vivo multi-casa** vía The Odds API (proxy seguro en `/api/odds.js` — la key nunca llega al navegador).
2. **Motivación calculada matemáticamente** (`src/motivation.js`): clasificación/eliminación matemática real basada en combinatoria de puntos posibles, no en opinión. Validado contra 4 casos de control manuales antes de integrarse — el primer intento tenía un bug real (contaba mal qué rivales son "amenaza" para el top-2) y se corrigió antes de usarse en producción.
3. **Detector de rotación de alineaciones** (`src/lineupRotation.js`): compara el 11 confirmado de hoy contra el 11 más frecuente de los últimos partidos. No intenta valorar qué jugador es "importante" — solo cuenta cuántos cambios hay y avisa, sin pretender saber más de lo que sabe.
4. **Comparación cross-book**: cuando dos casas de apuestas distintas no coinciden en el mismo mercado, eso es señal real de incertidumbre del propio mercado — no una opinión nuestra.

**Decisión de diseño explícita**: la app NUNCA usa la palabra "lock" ni promete una apuesta segura. La pestaña "Hoy" muestra "mayor confianza relativa" — el candidato con menos señales de incertidumbre detectadas entre los disponibles ese día, siempre junto a su edge crudo y sus advertencias visibles.

## Corrección del 27 de junio — Error 422 en The Odds API

Al conectar la key real del usuario (plan Professional), `/api/odds` devolvía error 422. Diagnóstico real:
- **No era problema de plan**: según la documentación oficial confirmada de the-odds-api.com, todos los planes de pago dan acceso a todos los deportes, incluyendo el Mundial 2026 y Liga MX/MLS.
- **Causa real**: el código pedía `markets=h2h,totals,btts` al endpoint principal `/odds`, pero BTTS no es un "featured market" — ese endpoint solo acepta h2h, spreads y totals. BTTS solo se puede pedir vía `/events/{id}/odds` por partido individual (consume más cuota).
- **Corrección**: se quitó `btts` del default de `useLiveOdds` y de la llamada en `DailyPickTab`. Los candidatos de BTTS en la pestaña "Hoy" simplemente no aparecerán hasta que se implemente la consulta por evento individual — esto es una limitación conocida, no un bug oculto.
- Nota aparte: durante el diagnóstico se confundió brevemente con un sitio de nombre casi idéntico (`theoddsapi.com`, sin guiones) que es un producto distinto con su propia estructura de planes — el usuario confirmó que su cuenta es en `the-odds-api.com` (con guiones), que es al que apunta el código real.

**Pendiente de verificación real** (no se puede confirmar sin ejecutar contra las API keys reales del usuario):
- Los sport_keys exactos de Liga MX (`soccer_mexico_ligamx`) y MLS (`soccer_usa_mls`) en The Odds API.
- Si el market key `btts` existe tal cual en la respuesta real, o si The Odds API lo expone bajo otro nombre.
- La estructura exacta de la respuesta de lineups de API-Football (el código asume `response[].startXI[].player.name`, basado en su documentación pública, pero no se probó contra una respuesta real).

Estas piezas deben probarse y corregirse en cuanto el usuario conecte sus keys reales — no se afirma que funcionen sin haberlo verificado.

## Fase 2 — Corrección del 24 de junio — Curazao vs Costa de Marfil

El modelo mostró un edge de +154% en Curazao ML, comparado contra el consenso real del mercado (Kalshi: Curazao 6%, empate 11%, Costa de Marfil 84%). Investigamos a fondo y encontramos dos problemas reales, no uno:

1. **La tabla `BASE_ELO` estaba mal calibrada en 15 de 48 equipos** (los más débiles): comparada contra el ranking FIFA oficial de abril 2026, comprimía demasiado el rango bajo de la tabla (Nueva Zelanda, Curazao, Haití, Ghana eran los peores casos, con discrepancias de 27-37 posiciones de ranking). Se reconstruyó usando 21 valores **reales** de eloratings.net (confirmados vía Goldman Sachs/Infobae y fragmentos directos de búsqueda) como anclas, e interpolación lineal honesta para los 27 equipos restantes según su posición en el ranking FIFA oficial.

2. **La fórmula `eloToLambdas` seguía siendo insuficientemente agresiva** incluso usando Elo real: con los valores reales de Curazao (1453) y Costa de Marfil (1728), el exponente anterior (2.2) daba 11% al underdog cuando el mercado real da 6%. Se subió el exponente a 2.5 y se agregó un cap de lambda [0.2, 4.5] para evitar el problema inverso (probabilidades de 99.9%+ en diferencias extremas, que no son realistas en fútbol).

**Efecto medido en el backtest de 30 partidos**: el accuracy de 1X2 se mantuvo en 50% (dentro del margen de ruido esperado con esta muestra), pero el LogLoss empeoró de ~0.84-1.14 a 1.26. Esto es un trade-off real, no oculto: la fórmula nueva es más decisiva/confiada, lo cual es correcto para casos como Curazao-CdM, pero penaliza más fuerte cuando el modelo se equivoca con esa confianza. No se puede afirmar con esta muestra si el cambio neto es mejor o peor — se necesitan más partidos para saberlo con confianza estadística real.

## Qué hace el motor

1. **Elo dinámico**: cada selección parte de un rating reconstruido el 24 de junio (ver arriba). Cada resultado confirmado del torneo recalcula el Elo de ambos equipos.
2. **Dixon-Coles Poisson**: la diferencia de Elo se convierte en goles esperados por equipo (función `eloToLambdas`, exponente 2.5, cap [0.2, 4.5]), y se aplica la corrección Dixon-Coles (1997, rho = -0.11).
3. **Monte Carlo**: 2,500 simulaciones del torneo completo para estimar probabilidad de avance, semis y campeón.

## Validación real (al 23-24 de junio de 2026, ~30 partidos jugados)


Hicimos un backtest **walk-forward** (cada partido se predice con el Elo *previo* a jugarse, sin filtración de datos futuros):

| Mercado | Accuracy | Veredicto |
|---|---|---|
| 1X2 (Money Line) | ~50% en la medición más rigurosa | Variable según la muestra exacta — ver nota abajo |
| Over/Under 2.5 | ~47% | Igual o peor que predecir siempre la tasa base |
| Ambos Anotan | ~60-63% | Algo de señal, pero dentro del margen de ruido |

**Nota crítica de honestidad**: con n=30, el intervalo de confianza del 95% sobre cualquier accuracy medido es enorme (un 50% observado puede corresponder a un accuracy real de entre 32% y 68%). No se puede concluir con esta muestra si el modelo es bueno, mediocre, o malo en 1X2. Una medición anterior dio 69% de aciertos con un subconjunto distinto de partidos — ese número no se sostuvo al repetir el análisis con más cuidado, y se documenta aquí para que quede registro del error.

## Qué intentamos y no funcionó (para no repetir el experimento)

- **Rating dual ofensivo/defensivo + mean reversion** (inspirado en `zvizdo/fifa-wc-2026-simulation`): empatado estadísticamente con el Elo simple. No se adoptó.
- **Ajustar el parámetro rho de Dixon-Coles**: mueve la probabilidad de empate predicha, pero no mejora el accuracy ni el LogLoss de forma consistente.
- **Cambiar la ventaja de "local" en sede neutral**: efecto despreciable en los resultados.

## Por qué no usamos XGBoost ni otros modelos de ML

Seis fuentes independientes revisadas (Hicruben, hjjbh1314, clemsage/SportsBet, georgedouzas/sports-betting, zvizdo, y el propio backtest de este proyecto) coinciden: con el volumen de datos disponible para selecciones nacionales, modelos de machine learning más complejos no superan a un Elo bien calibrado. Forzar XGBoost aquí sería complejidad sin beneficio demostrado.

## Qué NO hacer (anti-patrones observados en otros proyectos)

Un repo revisado (`javierruanohdez/world-cup-2026-prediction`) usa un bonus subjetivo ("Modern Football Strength") inventado por el autor sin respaldo estadístico, y cuando su modelo discrepa del mercado de apuestas real, lo presenta como una ventaja del modelo en lugar de una señal de alerta. Es exactamente lo opuesto a la disciplina de este proyecto: si el modelo y el mercado discrepan mucho, la prioridad es revisar el modelo, no celebrar la discrepancia.

## Próximos pasos honestos

- Con 60-80 partidos jugados (jornada 3 completa + inicio de eliminación), el intervalo de confianza se estrecha lo suficiente para volver a evaluar si Over/Under y BTTS tienen señal real.
- Si se consigue un dataset histórico más grande (920+ partidos de selecciones, no solo los del torneo actual) cargado completo en el entorno de desarrollo, vale la pena re-calibrar rho y los exponentes de `eloToLambdas` contra ese volumen.

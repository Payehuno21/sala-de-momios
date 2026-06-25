# Documentación del modelo — honesta, sin maquillaje

## Qué hace el motor

1. **Elo dinámico**: cada selección parte de un rating calibrado sobre ~920 partidos internacionales reales (oct 2023–jun 2026), basado en el modelo open-source de `Hicruben/world-cup-2026-prediction-model`. Cada resultado confirmado del torneo recalcula el Elo de ambos equipos.
2. **Dixon-Coles Poisson**: la diferencia de Elo se convierte en goles esperados por equipo (función `eloToLambdas`), y se aplica la corrección Dixon-Coles (1997, rho = -0.11) que evita que el Poisson simple subestime marcadores bajos (0-0, 1-1).
3. **Monte Carlo**: 2,500 simulaciones del torneo completo (fase de grupos simplificada a 2 primeros por grupo, bracket aleatorio en eliminación) para estimar probabilidad de avance, semis y campeón.

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

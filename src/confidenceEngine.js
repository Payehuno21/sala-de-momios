// src/confidenceEngine.js
// ------------------------------------------------------------------
// Combina las capas del modelo en un "score de confianza relativa" por
// mercado (ML / BTTS / Over-Under), SIN usar la palabra "lock" ni prometer
// certeza. Cada capa es explícita y visible — el usuario puede ver
// exactamente de dónde viene la confianza o la cautela, no es una caja negra.

import { expectedValue, kellyFraction } from "./engine.js";
import { motivationConfidencePenalty } from "./motivation.js";

// candidate: { market, label, modelProb, bestOdds, worstOdds (entre casas) }
// motivationHome/Away: salida de computeMotivation()
// rotationHome/Away: salida de detectRotation() (o null si no hay datos)
export function scoreCandidate(candidate, motivationHome, motivationAway, rotationHome, rotationAway) {
  const { modelProb, bestOdds, worstOdds, market } = candidate;
  const ev = expectedValue(modelProb, bestOdds);

  // CORRECCIÓN ESTRUCTURAL del 29 de junio: el ranking ya NO usa edge (ev)
  // crudo como base — usa Kelly fraccionado. Razón, confirmada con 3 casos
  // reales que perdieron en producción (Brasil-Japón, Países Bajos-Marruecos,
  // Alemania-Paraguay, todos recomendando al equipo MENOS probable): el
  // mismo error de calibración absoluto (ej. +3pp) genera un edge crudo
  // mucho más grande en momios altos que en momios bajos, simplemente por
  // la aritmética — esto hace que CUALQUIER imperfección del modelo
  // sesgue el ranking hacia underdogs de alta varianza, sin importar qué
  // tan bien calibrada esté la fórmula. Kelly no tiene este sesgo: pondera
  // el tamaño de apuesta por qué tan seguido se espera perder, así que un
  // underdog con probabilidad real baja recibe automáticamente menos peso
  // aunque su EV crudo parezca grande. Ver docs/MODELO.md.
  const kelly = kellyFraction(modelProb, bestOdds, 1.0); // sin fraccionar aquí; el 50% ya se aplica en la UI al mostrar el stake sugerido

  // Penalización 1: motivación (¿hay equipos sin nada en juego?)
  const motivationPenalty = motivationConfidencePenalty(motivationHome, motivationAway);

  // Penalización 2: rotación inusual detectada en cualquiera de los 2 equipos
  const rotationPenalty = [rotationHome, rotationAway].some(r => r?.status === "rotacion_fuerte") ? 1
    : [rotationHome, rotationAway].some(r => r?.status === "rotacion_leve") ? 0.3
    : 0;

  // Penalización 3: discrepancia entre casas de apuestas (si el propio
  // mercado no se pone de acuerdo, eso es señal de incertidumbre real,
  // no de oportunidad limpia).
  const bookSpreadPct = bestOdds && worstOdds ? (bestOdds - worstOdds) / worstOdds : 0;
  const spreadPenalty = Math.min(1, bookSpreadPct * 2); // spread de 50%+ ya es penalización máxima

  // Penalización 4: el mercado en sí tiene baja confianza ya validada (ver
  // docs/MODELO.md — Over/Under y BTTS no superan la tasa base en el
  // backtest real).
  const lowConfidenceMarket = market === "O/U" || market === "BTTS";
  const marketPenalty = lowConfidenceMarket ? 0.7 : 0;

  // Penalización 5: probabilidad real muy baja (<20%). Aunque Kelly ya
  // descuenta esto matemáticamente, agregamos una penalización explícita
  // adicional — la varianza real de "perder 4 de cada 5 veces" amerita
  // cautela extra más allá de lo que el bankroll-management puro captura,
  // específicamente para la experiencia de quien ve la recomendación.
  const lowProbPenalty = modelProb < 0.20 ? (0.20 - modelProb) / 0.20 * 0.5 : 0;

  const behaviorPenalty = Math.min(1, motivationPenalty * 0.4 + rotationPenalty * 0.4 + spreadPenalty * 0.2);
  const totalPenalty = Math.min(1, behaviorPenalty + marketPenalty - behaviorPenalty * marketPenalty);

  // Score final: ahora basado en Kelly (no en ev crudo), ajustado hacia
  // abajo por penalizaciones de comportamiento/mercado/probabilidad baja.
  const adjustedConfidence = kelly * (1 - totalPenalty) * (1 - lowProbPenalty);

  return {
    ...candidate,
    ev,
    kelly,
    motivationPenalty,
    rotationPenalty,
    spreadPenalty,
    marketPenalty,
    lowProbPenalty,
    totalPenalty,
    adjustedConfidence,
    warnings: [
      ...(lowConfidenceMarket ? [`Mercado de baja confianza validada (Over/Under y BTTS no superan la tasa base en backtest real) — edge crudo aquí no es señal fuerte.`] : []),
      ...(modelProb < 0.20 ? [`Probabilidad real de ganar baja (${(modelProb*100).toFixed(1)}%) — alta varianza, trátalo con cautela extra aunque el edge se vea grande.`] : []),
      ...(motivationPenalty > 0 ? [`Hay un equipo sin presión real en este partido (clasificado o eliminado matemáticamente).`] : []),
      ...(rotationPenalty >= 1 ? [`Rotación fuerte detectada — alineación muy distinta a la habitual.`] : []),
      ...(rotationPenalty > 0 && rotationPenalty < 1 ? [`Rotación leve detectada.`] : []),
      ...(spreadPenalty > 0.3 ? [`Las casas de apuestas no coinciden entre sí en este mercado — incertidumbre real del propio mercado.`] : []),
    ],
  };
}

// Compara TODOS los candidatos del día (de todos los partidos, los 3
// mercados) y devuelve el de mayor confianza ajustada. Esto reemplaza la
// idea de "lock" por "mayor confianza relativa entre lo disponible hoy" —
// siempre con su nivel de incertidumbre visible, nunca como certeza.
// Compara los candidatos del día para elegir "mejor pick" y la estrella ★
// por partido. DOS reglas estructurales (no penalizaciones numéricas, que
// ya demostramos ser insuficientes con 3 casos reales perdidos en
// producción — Brasil-Japón, Países Bajos-Marruecos, Alemania-Paraguay):
//
// 1. O/U y BTTS quedan excluidos (sin señal validada, ver docs/MODELO.md).
// 2. NUEVO (29 jun, tras 3 derrotas reales): cualquier candidato con menos
//    de 35% de probabilidad real del modelo queda excluido también. Razón:
//    el mismo error de calibración absoluto genera un edge crudo mucho más
//    grande en momios altos (matemática del propio EV), así que CUALQUIER
//    imperfección del modelo —y siempre habrá alguna— sesga el ranking
//    hacia apuestas de alta varianza que pierden la mayoría de las veces
//    aunque "se vean" rentables en edge. Kelly fraccionado tampoco bastó
//    para corregir esto en los 3 casos reales (ver docs/MODELO.md). 35% no
//    es un número mágico — es deliberadamente conservador: un resultado
//    con esa probabilidad todavía pierde 65% de las veces, pero ya no es
//    el "moonshot" de 13-25% que generó las 3 pérdidas reales.
export function rankDailyCandidates(allCandidates) {
  return [...allCandidates]
    .filter(c => c.market === "ML") // únicos mercados con señal validada
    .filter(c => c.modelProb >= 0.35) // excluye apuestas de muy baja probabilidad real
    .filter(c => c.ev > 0)
    .sort((a, b) => b.adjustedConfidence - a.adjustedConfidence);
}

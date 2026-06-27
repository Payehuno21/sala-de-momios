// src/confidenceEngine.js
// ------------------------------------------------------------------
// Combina las capas del modelo en un "score de confianza relativa" por
// mercado (ML / BTTS / Over-Under), SIN usar la palabra "lock" ni prometer
// certeza. Cada capa es explícita y visible — el usuario puede ver
// exactamente de dónde viene la confianza o la cautela, no es una caja negra.

import { expectedValue } from "./engine.js";
import { motivationConfidencePenalty } from "./motivation.js";

// candidate: { market, label, modelProb, bestOdds, worstOdds (entre casas) }
// motivationHome/Away: salida de computeMotivation()
// rotationHome/Away: salida de detectRotation() (o null si no hay datos)
export function scoreCandidate(candidate, motivationHome, motivationAway, rotationHome, rotationAway) {
  const { modelProb, bestOdds, worstOdds } = candidate;
  const ev = expectedValue(modelProb, bestOdds);

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

  const totalPenalty = Math.min(1, motivationPenalty * 0.4 + rotationPenalty * 0.4 + spreadPenalty * 0.2);

  // Score final: el edge crudo, ajustado hacia abajo por la incertidumbre
  // detectada. Nunca se ajusta hacia arriba — las penalizaciones solo
  // pueden bajar la confianza, jamás inflarla artificialmente.
  const adjustedConfidence = ev * (1 - totalPenalty);

  return {
    ...candidate,
    ev,
    motivationPenalty,
    rotationPenalty,
    spreadPenalty,
    totalPenalty,
    adjustedConfidence,
    warnings: [
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
export function rankDailyCandidates(allCandidates) {
  return [...allCandidates]
    .filter(c => c.ev > 0) // solo candidatos con edge positivo entran a la comparación
    .sort((a, b) => b.adjustedConfidence - a.adjustedConfidence);
}

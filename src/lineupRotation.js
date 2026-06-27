// src/lineupRotation.js
// ------------------------------------------------------------------
// Detecta rotación inusual comparando la alineación confirmada de HOY
// contra las alineaciones más frecuentes de ese equipo en sus partidos
// recientes. No intenta calificar la importancia de cada jugador (eso
// requeriría un rating individual que no tenemos) — solo cuenta cuántos
// nombres distintos hay respecto al "11 habitual", y deja que el usuario
// decida qué tan grave es. Esto es deliberadamente conservador: prefiere
// avisar de más que fingir certeza que no tiene.

// recentLineups: array de arrays de nombres de jugadores titulares,
// de los últimos N partidos de un equipo (más reciente primero).
// todayLineup: array de nombres titulares confirmados para el partido de hoy.
export function detectRotation(todayLineup, recentLineups) {
  if (!todayLineup || todayLineup.length === 0) {
    return { status: "sin_datos", reason: "Alineación de hoy todavía no confirmada.", changedCount: null };
  }
  if (!recentLineups || recentLineups.length === 0) {
    return { status: "sin_referencia", reason: "No hay alineaciones recientes para comparar — no se puede evaluar rotación.", changedCount: null };
  }

  // El "11 habitual" = los jugadores que aparecieron en la mayoría de los
  // últimos partidos disponibles (umbral: en al menos la mitad de ellos).
  const appearances = {};
  recentLineups.forEach(lineup => {
    lineup.forEach(player => { appearances[player] = (appearances[player] || 0) + 1; });
  });
  const threshold = Math.ceil(recentLineups.length / 2);
  const usualEleven = Object.entries(appearances)
    .filter(([, count]) => count >= threshold)
    .map(([player]) => player);

  const missingFromUsual = usualEleven.filter(p => !todayLineup.includes(p));
  const changedCount = missingFromUsual.length;

  if (changedCount >= 3) {
    return {
      status: "rotacion_fuerte",
      reason: `${changedCount} de los titulares habituales no están en la alineación de hoy. Alta incertidumbre — trata cualquier pick de este partido con cautela extra, sin importar lo que diga el modelo.`,
      changedCount,
      missingPlayers: missingFromUsual,
    };
  }
  if (changedCount >= 1) {
    return {
      status: "rotacion_leve",
      reason: `${changedCount} cambio(s) respecto al 11 habitual — dentro de lo normal, pero vale la pena revisarlo.`,
      changedCount,
      missingPlayers: missingFromUsual,
    };
  }
  return { status: "sin_rotacion", reason: "La alineación de hoy coincide con el 11 habitual reciente.", changedCount: 0, missingPlayers: [] };
}

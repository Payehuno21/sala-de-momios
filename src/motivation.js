// src/motivation.js
// ------------------------------------------------------------------
// Calcula el "nivel de motivación matemática" de un equipo de cara a un
// partido, usando SOLO datos que ya tenemos verificados: tabla de
// posiciones actual, jornadas restantes, y el formato de avance del
// torneo. No busca ni infiere nada externo (no hay "moral del plantel"
// ni similar) — es lógica de combinatoria pura sobre lo que matemáticamente
// puede pasar.
//
// Para el Mundial 2026 (fase de grupos): un equipo puede estar en uno de
// estos estados, determinados por sus puntos actuales, partidos jugados,
// y partidos restantes del grupo:
//   - "eliminado_matematicamente": no hay combinación de resultados futuros
//     que le permita alcanzar los puntos mínimos históricos de clasificación
//   - "clasificado_matematicamente": ya no puede ser desplazado de los 2
//     primeros lugares sin importar el resultado de los partidos restantes
//   - "decisivo": el resultado de este partido específico cambia
//     directamente sus chances de avanzar
//   - "normal": todavía compite, pero este partido no es de vida o muerte

export function computeMotivation(standings, team, matchesRemainingForGroup) {
  const teamRow = standings.find(s => s.team === team);
  if (!teamRow) return { state: "desconocido", reason: "Equipo no encontrado en la tabla del grupo." };

  const idx = standings.findIndex(s => s.team === team);
  const maxPossiblePts = teamRow.pts + matchesRemainingForGroup * 3;
  const minPossiblePts = teamRow.pts; // peor caso: no suma más puntos
  const others = standings.filter((s, i) => i !== idx);

  // --- ELIMINACIÓN MATEMÁTICA ---
  // Eliminado si, incluso en su MEJOR caso, ya hay 2+ rivales con MÁS
  // puntos garantizados (su propio peor caso ya supera el mejor de este
  // equipo). Esos 2 ocuparían el top-2 sin importar lo que pase después.
  const othersGuaranteedAbove = others.filter(r => r.pts > maxPossiblePts).length;
  if (othersGuaranteedAbove >= 2) {
    return {
      state: "eliminado_probable",
      reason: `Incluso ganando todos sus partidos restantes (máx. ${maxPossiblePts} pts), ya hay ${othersGuaranteedAbove} equipos con más puntos garantizados.`,
      confidence: "alta",
    };
  }

  // --- CLASIFICACIÓN MATEMÁTICA ---
  // Pregunta correcta: ¿puede este equipo quedar FUERA del top-2? Solo pasa
  // si 2+ rivales terminan con MÁS puntos (no empate) que su peor caso. Un
  // rival que está HOY dentro del top-2 y lo empata no lo saca — ambos
  // quedarían en el top-2 juntos. Por eso solo importan los rivales que HOY
  // están fuera del top-2: si ninguno de ellos puede alcanzar o superar el
  // peor caso de este equipo, el top-2 está garantizado (con o sin empate
  // interno entre los 2 de adentro).
  const outsidersToday = standings.filter((s, i) => i !== idx && i > 1);
  const outsidersThatCouldReach = outsidersToday.filter(
    r => (r.pts + matchesRemainingForGroup * 3) >= minPossiblePts
  ).length;
  if (idx <= 1 && outsidersThatCouldReach === 0) {
    return {
      state: "clasificado_probable",
      reason: `Incluso en su peor caso (${minPossiblePts} pts), ningún equipo fuera del top-2 actual puede alcanzarlo — sigue garantizado en el top-2 del grupo.`,
      confidence: "alta",
    };
  }

  if (matchesRemainingForGroup <= 1) {
    return {
      state: "decisivo",
      reason: "Última jornada del grupo: este resultado define directamente el avance.",
      confidence: "alta",
    };
  }

  return { state: "normal", reason: "Sigue compitiendo, sin presión extrema todavía.", confidence: "media" };
}

// Ajuste de probabilidad: NO inventa un número de "cuánto vale la
// motivación" — solo ajusta la VARIANZA esperada (qué tan confiable es la
// predicción), nunca la dirección del pick. Un equipo ya eliminado jugando
// sin nada en juego es más impredecible, no necesariamente más débil.
export function motivationConfidencePenalty(motivationHome, motivationAway) {
  const highVarianceStates = ["eliminado_probable", "clasificado_probable"];
  let penalty = 0;
  if (highVarianceStates.includes(motivationHome.state)) penalty += 0.5;
  if (highVarianceStates.includes(motivationAway.state)) penalty += 0.5;
  // penalty: 0 (ambos con todo en juego) a 1 (ambos ya sin nada en juego)
  return Math.min(1, penalty);
}

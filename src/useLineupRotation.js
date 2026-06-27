import { useState, useEffect } from "react";
import { detectRotation } from "./lineupRotation.js";

// Trae lineup confirmado de hoy + últimos N partidos del mismo equipo
// (vía /api/football, que oculta la key real) y calcula rotación.
// Si la alineación de hoy todavía no se publicó (normal hasta ~1h antes
// del partido), devuelve status "sin_datos" sin fallar ni inventar nada.
export function useLineupRotation(fixtureId, teamId, enabled = true) {
  const [state, setState] = useState({ rotation: null, loading: false, error: null });

  useEffect(() => {
    if (!enabled || !fixtureId || !teamId) return;
    setState(s => ({ ...s, loading: true }));

    Promise.all([
      fetch(`/api/football?endpoint=lineups&fixture=${fixtureId}`).then(r => r.json()),
      fetch(`/api/football?endpoint=fixtures&team=${teamId}&last=8`).then(r => r.json()),
    ])
      .then(([lineupRes, recentRes]) => {
        const todayLineupRaw = lineupRes?.response?.find(l => l.team?.id === Number(teamId));
        const todayLineup = todayLineupRaw?.startXI?.map(p => p.player?.name).filter(Boolean) || [];

        const recentLineups = (recentRes?.response || [])
          .map(fx => fx?.lineups?.find(l => l.team?.id === Number(teamId))?.startXI?.map(p => p.player?.name).filter(Boolean))
          .filter(Boolean);

        const rotation = detectRotation(todayLineup, recentLineups);
        setState({ rotation, loading: false, error: null });
      })
      .catch(err => setState({ rotation: null, loading: false, error: err.message }));
  }, [fixtureId, teamId, enabled]);

  return state;
}

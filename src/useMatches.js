import { useState, useEffect } from "react";

// Carga public/data/matches.json (generado por scripts/update-data.mjs vía
// GitHub Actions). Si el archivo no existe aún (primera vez, antes del
// primer run del workflow), cae a un estado vacío sin romper la app.
export function useMatches() {
  const [data, setData] = useState({ matches: [], fetchedAt: null, loading: true, error: null });

  useEffect(() => {
    fetch("./data/matches.json")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => setData({ matches: json.matches || [], fetchedAt: json.fetchedAt, loading: false, error: null }))
      .catch(err => setData({ matches: [], fetchedAt: null, loading: false, error: err.message }));
  }, []);

  return data;
}

// Convierte el calendario crudo en el formato {home, away, hg, ag, played}
// que usa el motor estadístico, filtrando solo partidos con equipos reales
// (no placeholders de bracket sin resolver como "1A" o "W74").
export function toEngineResults(matches) {
  return matches
    .filter(m => !m.homeIsPlaceholder && !m.awayIsPlaceholder)
    .map(m => ({ group: m.group, home: m.home, away: m.away, hg: m.hg, ag: m.ag, played: m.played }));
}

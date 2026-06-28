import { useState, useEffect, useCallback } from "react";

// Llama a /api/odds (nuestra serverless function, que oculta la key real
// de The Odds API). Nunca llama a The Odds API directo desde el navegador.
// markets por defecto: solo "featured markets" (h2h, totals) — btts no es
// un featured market y el endpoint principal lo rechaza con error 422.
export function useLiveOdds(sportKey = "soccer_fifa_world_cup", markets = "h2h,totals") {
  const [state, setState] = useState({ events: [], quota: null, loading: true, error: null });

  const refresh = useCallback(() => {
    setState(s => ({ ...s, loading: true }));
    fetch(`/api/odds?sport=${encodeURIComponent(sportKey)}&markets=${encodeURIComponent(markets)}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setState({ events: json.data || [], quota: json.quota || null, loading: false, error: null });
      })
      .catch(err => setState({ events: [], quota: null, loading: false, error: err.message }));
  }, [sportKey, markets]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, refresh };
}

// Extrae, para un partido específico, el mejor momio de cada outcome
// entre todas las casas devueltas, y también el rango (mejor/peor) para
// detectar discrepancias entre casas — la señal de "edge real" más
// confiable de todo el sistema, porque no depende de nuestro propio modelo.
export function summarizeBookOdds(event) {
  const summary = { h2h: {}, totals: {}, btts: {} };
  for (const book of event.bookmakers || []) {
    for (const market of book.markets || []) {
      const key = market.key === "h2h" ? "h2h" : market.key === "totals" ? "totals" : market.key === "btts" ? "btts" : null;
      if (!key) continue;
      for (const outcome of market.outcomes || []) {
        const name = outcome.name;
        if (!summary[key][name]) summary[key][name] = [];
        summary[key][name].push({ book: book.title, price: outcome.price, point: outcome.point });
      }
    }
  }
  // Para cada outcome, calcular mejor precio, peor precio, y la
  // discrepancia (spread) entre casas — un spread grande es información
  // real de que el mercado mismo no está seguro, o que hay una casa
  // desactualizada (oportunidad genuina, no inventada por nosotros).
  const withSpread = {};
  for (const market of Object.keys(summary)) {
    withSpread[market] = {};
    for (const [outcome, prices] of Object.entries(summary[market])) {
      const values = prices.map(p => p.price);
      withSpread[market][outcome] = {
        best: Math.max(...values),
        worst: Math.min(...values),
        spreadPct: (Math.max(...values) - Math.min(...values)) / Math.min(...values),
        books: prices,
      };
    }
  }
  return withSpread;
}

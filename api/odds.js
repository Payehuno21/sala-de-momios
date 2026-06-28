// api/odds.js
// Vercel Serverless Function — actúa como proxy seguro hacia The Odds API.
// La API key vive SOLO en la variable de entorno del servidor (ODDS_API_KEY,
// configurada en el dashboard de Vercel), nunca en el código que llega al
// navegador. El frontend llama a /api/odds?sport=soccer_fifa_world_cup&...
// en vez de llamar a The Odds API directamente.

export default async function handler(req, res) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ODDS_API_KEY no configurada en el servidor. Agrégala en Vercel → Settings → Environment Variables." });
  }

  // IMPORTANTE: el endpoint principal /odds solo acepta "featured markets"
  // (h2h, spreads, totals). btts NO es un featured market — pedirlo aquí
  // causa un error 422 de The Odds API ("market inválido para este
  // endpoint"). Para BTTS habría que usar /events/{id}/odds por partido
  // individual (más caro en cuota); por ahora el default solo trae h2h y
  // totals, que es lo que realmente soporta este endpoint.
  const { sport = "soccer_fifa_world_cup", markets = "h2h,totals", regions = "us" } = req.query;

  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=${regions}&markets=${markets}&oddsFormat=decimal`;
    const response = await fetch(url);

    // The Odds API manda el remanente de cuota en headers; lo reenviamos
    // para que el frontend pueda mostrarte cuánto te queda del plan de pago.
    const remaining = response.headers.get("x-requests-remaining");
    const used = response.headers.get("x-requests-used");

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `The Odds API respondió ${response.status}`, detail: text });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ data, quota: { remaining, used } });
  } catch (err) {
    return res.status(502).json({ error: "No se pudo conectar a The Odds API", detail: err.message });
  }
}

// api/football.js
// Proxy seguro hacia API-Football (api-football.com vía RapidAPI o directo,
// según el plan que contrates). La key vive en FOOTBALL_API_KEY en Vercel.
//
// endpoint=standings   -> tabla de posiciones
// endpoint=fixtures     -> calendario / resultados / H2H (con params home/away)
// endpoint=lineups      -> alineación confirmada de un partido (fixture id)

const BASE_URL = "https://v3.football.api-sports.io";

export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "FOOTBALL_API_KEY no configurada en el servidor." });
  }

  const { endpoint, ...params } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: "Falta el parámetro 'endpoint' (standings | fixtures | lineups | h2h)." });
  }

  const ENDPOINT_MAP = {
    standings: "/standings",
    fixtures: "/fixtures",
    lineups: "/fixtures/lineups",
    h2h: "/fixtures/headtohead",
  };

  const path = ENDPOINT_MAP[endpoint];
  if (!path) {
    return res.status(400).json({ error: `Endpoint desconocido: ${endpoint}` });
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `API-Football respondió ${response.status}`, detail: text });
    }
    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "No se pudo conectar a API-Football", detail: err.message });
  }
}

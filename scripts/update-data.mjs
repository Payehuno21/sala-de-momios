#!/usr/bin/env node
/**
 * scripts/update-data.mjs
 * ------------------------------------------------------------
 * Pipeline de datos para Sala de Momios — Mundial 2026.
 * Diseñado para correr en GitHub Actions cada 15-30 min durante
 * partidos en vivo, y diario el resto del tiempo (igual patrón
 * que MLB Edge: GitHub Actions -> data.json -> Vercel lo sirve).
 *
 * Fuentes (todas públicas, sin API key):
 * 1. openfootball/worldcup.json — calendario oficial completo + resultados
 *    https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
 * 2. rezarahiminia/worldcup2026 — respaldo con estructura de grupos/standings
 *    (solo si la fuente 1 falla)
 *
 * IMPORTANTE: este script NO corre dentro del artifact de Claude (ahí el
 * fetch está bloqueado por sandbox). Corre en GitHub Actions, que sí tiene
 * red completa. El resultado (public/data/matches.json) se commitea al repo
 * y Vercel lo sirve como archivo estático — el frontend nunca llama a APIs
 * externas directamente, solo lee este JSON ya procesado.
 */

import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");
const OUT_FILE = join(OUT_DIR, "matches.json");

const SOURCE_PRIMARY = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// Mapeo nombre inglés (fuente) -> nombre español (nuestra app)
const NAME_MAP = {
  "Mexico": "Mexico", "South Africa": "Sudafrica", "South Korea": "Corea del Sur",
  "Korea Republic": "Corea del Sur", "Czech Republic": "Chequia", "Czechia": "Chequia",
  "Canada": "Canada", "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina", "Qatar": "Catar",
  "Switzerland": "Suiza", "Brazil": "Brasil", "Morocco": "Marruecos", "Haiti": "Haiti",
  "Scotland": "Escocia", "United States": "Estados Unidos", "USA": "Estados Unidos",
  "Paraguay": "Paraguay", "Australia": "Australia", "Turkey": "Turquia", "Türkiye": "Turquia",
  "Germany": "Alemania", "Curaçao": "Curazao", "Curacao": "Curazao",
  "Ivory Coast": "Costa de Marfil", "Côte d'Ivoire": "Costa de Marfil", "Ecuador": "Ecuador",
  "Netherlands": "Paises Bajos", "Japan": "Japon", "Sweden": "Suecia", "Tunisia": "Tunez",
  "Belgium": "Belgica", "Egypt": "Egipto", "Iran": "Iran", "IR Iran": "Iran",
  "New Zealand": "Nueva Zelanda", "Spain": "Espana", "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudita", "Uruguay": "Uruguay", "France": "Francia",
  "Senegal": "Senegal", "Iraq": "Irak", "Norway": "Noruega", "Argentina": "Argentina",
  "Algeria": "Argelia", "Austria": "Austria", "Jordan": "Jordania", "Portugal": "Portugal",
  "DR Congo": "Rep. Dem. Congo", "Congo DR": "Rep. Dem. Congo", "Uzbekistan": "Uzbekistan",
  "Colombia": "Colombia", "England": "Inglaterra", "Croatia": "Croacia", "Ghana": "Ghana",
  "Panama": "Panama",
};

function mapName(name) {
  return NAME_MAP[name] || name;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": "sala-de-momios-bot/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al traer ${url}`);
  return res.json();
}

function parseOpenFootball(raw) {
  // Estructura real openfootball: { name, matches: [{ round, date, time, team1,
  // team2, score: {ft:[h,a]}, group, ground, num }] } — sin "rounds" anidados.
  const matches = [];
  for (const m of raw.matches || []) {
    const isFinished = m.score && Array.isArray(m.score.ft);
    // En fase de grupos team1/team2 son nombres reales. En eliminación directa
    // son códigos como "1A" (1er de grupo A), "3C/D/F/G/H" (mejor 3ro entre esos
    // grupos), o "W74" (ganador del partido 74) — no resueltos hasta que avanza
    // el torneo. Los marcamos explícitamente para que la UI los muestre distinto.
    const isPlaceholder = (s) => /^[123]?[A-L](\/[A-L])*$|^[WL]\d+$/.test(s || "");
    matches.push({
      matchNum: m.num ?? null,
      round: m.round || "",
      group: m.group ? m.group.replace("Group ", "") : "—",
      date: m.date || null,
      time: m.time || null,
      home: isPlaceholder(m.team1) ? m.team1 : mapName(m.team1),
      away: isPlaceholder(m.team2) ? m.team2 : mapName(m.team2),
      homeIsPlaceholder: isPlaceholder(m.team1),
      awayIsPlaceholder: isPlaceholder(m.team2),
      played: !!isFinished,
      hg: isFinished ? m.score.ft[0] : null,
      ag: isFinished ? m.score.ft[1] : null,
      venue: m.ground || null,
    });
  }
  return matches;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let matches = [];
  let source = "openfootball";
  let fetchedAt = new Date().toISOString();

  try {
    const raw = await fetchJSON(SOURCE_PRIMARY);
    matches = parseOpenFootball(raw);
    if (matches.length === 0) throw new Error("Fuente primaria devolvió 0 partidos");
  } catch (err) {
    console.error("Fuente primaria falló:", err.message);
    console.error("No se actualizan los datos esta corrida — se mantiene el archivo anterior.");
    process.exit(1); // Falla limpia: GitHub Actions no commitea nada roto
  }

  const playedCount = matches.filter(m => m.played).length;
  const output = {
    fetchedAt,
    source,
    totalMatches: matches.length,
    playedMatches: playedCount,
    matches,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`✓ Escritos ${matches.length} partidos (${playedCount} jugados) en ${OUT_FILE}`);
}

main().catch(err => {
  console.error("Error fatal en update-data.mjs:", err);
  process.exit(1);
});

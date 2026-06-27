// Motor estadístico — Elo + Dixon-Coles + Monte Carlo
// Idéntico en lógica al validado en sesiones previas contra 30 partidos reales
// del Mundial 2026. Ver docs/MODELO.md para el detalle de validación y límites.

// Tabla reconstruida el 24 de junio 2026 tras detectar que la versión anterior
// subestimaba sistemáticamente a 15 de 48 equipos (comparado contra el ranking
// FIFA oficial). 21 valores son REALES, confirmados contra eloratings.net /
// Goldman Sachs (vía Infobae) al 6-21 de junio de 2026. Los 27 restantes están
// interpolados linealmente entre las anclas reales más cercanas según su
// posición en el ranking FIFA oficial — no son una fórmula inventada sin
// verificar, son una interpolación honesta entre puntos de dato real.
// Ver docs/MODELO.md para el detalle completo de esta reconstrucción.
export const BASE_ELO = {
  "Francia": 2062, "Espana": 2155, "Argentina": 2113, "Inglaterra": 2020,
  "Portugal": 2004, "Brasil": 1988, "Paises Bajos": 1972, "Marruecos": 1961,
  "Belgica": 1950, "Alemania": 1939, "Croacia": 1929, "Colombia": 1909,
  "Senegal": 1900, "Mexico": 1890, "Estados Unidos": 1880, "Uruguay": 1870,
  "Japon": 1925, "Suiza": 1869, "Iran": 1756, "Turquia": 1810,
  "Ecuador": 1864, "Austria": 1843, "Corea del Sur": 1823, "Australia": 1781,
  "Argelia": 1761, "Egipto": 1740, "Canada": 1738, "Noruega": 1735,
  "Panama": 1730, "Costa de Marfil": 1728, "Suecia": 1727, "Paraguay": 1675,
  "Chequia": 1649, "Escocia": 1596, "Tunez": 1570, "Rep. Dem. Congo": 1546,
  "Uzbekistan": 1497, "Catar": 1437, "Irak": 1473, "Sudafrica": 1527,
  "Arabia Saudita": 1598, "Jordania": 1584, "Bosnia y Herzegovina": 1570,
  "Cabo Verde": 1543, "Ghana": 1508, "Curazao": 1453, "Haiti": 1528,
  "Nueva Zelanda": 1549,
};

export const GROUPS = {
  A: ["Mexico", "Sudafrica", "Corea del Sur", "Chequia"],
  B: ["Canada", "Bosnia y Herzegovina", "Catar", "Suiza"],
  C: ["Brasil", "Marruecos", "Haiti", "Escocia"],
  D: ["Estados Unidos", "Paraguay", "Australia", "Turquia"],
  E: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  F: ["Paises Bajos", "Japon", "Suecia", "Tunez"],
  G: ["Belgica", "Egipto", "Iran", "Nueva Zelanda"],
  H: ["Espana", "Cabo Verde", "Arabia Saudita", "Uruguay"],
  I: ["Francia", "Senegal", "Irak", "Noruega"],
  J: ["Argentina", "Argelia", "Austria", "Jordania"],
  K: ["Portugal", "Rep. Dem. Congo", "Uzbekistan", "Colombia"],
  L: ["Inglaterra", "Croacia", "Ghana", "Panama"],
};

// ISO 3166-1 alpha-2 para flag-icons (fi fi-xx)
export const ISO = {
  "Argentina": "ar", "Francia": "fr", "Espana": "es", "Inglaterra": "gb-eng",
  "Portugal": "pt", "Brasil": "br", "Paises Bajos": "nl", "Marruecos": "ma",
  "Belgica": "be", "Alemania": "de", "Croacia": "hr",
  "Colombia": "co", "Senegal": "sn", "Mexico": "mx", "Estados Unidos": "us",
  "Uruguay": "uy", "Japon": "jp", "Suiza": "ch",
  "Iran": "ir", "Turquia": "tr", "Ecuador": "ec", "Austria": "at",
  "Corea del Sur": "kr", "Australia": "au", "Argelia": "dz",
  "Egipto": "eg", "Canada": "ca", "Noruega": "no",
  "Panama": "pa", "Costa de Marfil": "ci",
  "Suecia": "se", "Paraguay": "py", "Chequia": "cz",
  "Escocia": "gb-sct", "Tunez": "tn", "Rep. Dem. Congo": "cd",
  "Uzbekistan": "uz", "Catar": "qa", "Irak": "iq", "Sudafrica": "za",
  "Arabia Saudita": "sa", "Jordania": "jo", "Bosnia y Herzegovina": "ba",
  "Cabo Verde": "cv", "Ghana": "gh", "Curazao": "cw", "Haiti": "ht",
  "Nueva Zelanda": "nz",
};

export const ALL_TEAMS = Object.keys(BASE_ELO).sort();

const HOME_ADV = 50;
export function expectedResult(eloA, eloB) { return 1 / (1 + Math.pow(10, (eloB - eloA) / 400)); }
export function updateElo(eloA, eloB, scoreA, k) { return eloA + k * (scoreA - expectedResult(eloA, eloB)); }

export function eloToLambdas(eloHome, eloAway, neutral = true) {
  const adjHome = eloHome + (neutral ? HOME_ADV * 0.3 : HOME_ADV);
  const diff = adjHome - eloAway;
  const base = 1.35;
  const sf = diff / 400;
  // Exponente 2.5 (antes 2.2): validado contra el consenso real de mercado
  // de Curazao-Costa de Marfil (Kalshi: 6%/11%/84%) usando Elo REAL de
  // eloratings.net (1453/1728), no valores aproximados a mano. El exponente
  // anterior daba 11% al underdog cuando el mercado real daba 6-8.6%.
  // Cap de lambda [0.2, 4.5]: evita probabilidades absurdas (99.9%+) en
  // diferencias de Elo extremas — ningún partido de fútbol real debería
  // acercarse a certeza total.
  return {
    lambdaHome: Math.min(4.5, Math.max(0.2, base * Math.pow(2.5, sf))),
    lambdaAway: Math.min(4.5, Math.max(0.2, base * Math.pow(2.5, -sf))),
  };
}

function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function poissonPMF(lambda, k) { return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k); }

export function scoreMatrix(lh, la, maxG = 7) {
  const RHO = -0.11;
  function tau(h, a, lh, la, rho) {
    if (h === 0 && a === 0) return 1 - lh * la * rho;
    if (h === 0 && a === 1) return 1 + lh * rho;
    if (h === 1 && a === 0) return 1 + la * rho;
    if (h === 1 && a === 1) return 1 - rho;
    return 1;
  }
  const m = [];
  for (let h = 0; h <= maxG; h++) {
    const row = [];
    for (let a = 0; a <= maxG; a++) {
      const base = poissonPMF(lh, h) * poissonPMF(la, a);
      row.push(base * tau(h, a, lh, la, RHO));
    }
    m.push(row);
  }
  const total = m.flat().reduce((s, v) => s + v, 0);
  return m.map(row => row.map(v => v / total));
}

export function probsFromMatrix(m) {
  let pH = 0, pD = 0, pA = 0, over25 = 0, btts = 0;
  const exactScores = [];
  for (let h = 0; h < m.length; h++) {
    for (let a = 0; a < m[h].length; a++) {
      const p = m[h][a];
      if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
      if (h + a > 2.5) over25 += p;
      if (h > 0 && a > 0) btts += p;
      exactScores.push({ h, a, p });
    }
  }
  exactScores.sort((x, y) => y.p - x.p);
  return { pH, pD, pA, over25, under25: 1 - over25, btts, bttsNo: 1 - btts, topScores: exactScores.slice(0, 5) };
}

export function impliedProb(decOdds) { return decOdds > 0 ? 1 / decOdds : 0; }
export function removeOverround(arr) { const s = arr.reduce((a, b) => a + b, 0); return s > 0 ? arr.map(p => p / s) : arr; }
export function expectedValue(p, odds) { return p * (odds - 1) - (1 - p); }
export function kellyFraction(p, odds, frac = 0.5) {
  const b = odds - 1; if (b <= 0) return 0;
  const q = 1 - p; const f = (b * p - q) / b;
  return Math.max(0, f * frac);
}

export function buildEloTable(results) {
  const elo = { ...BASE_ELO };
  for (const r of results) {
    if (!r.played) continue;
    const k = 25;
    let scoreHome;
    if (r.hg > r.ag) scoreHome = 1; else if (r.hg === r.ag) scoreHome = 0.5; else scoreHome = 0;
    const eh = elo[r.home] ?? 1700;
    const ea = elo[r.away] ?? 1700;
    elo[r.home] = updateElo(eh, ea, scoreHome, k);
    elo[r.away] = updateElo(ea, eh, 1 - scoreHome, k);
  }
  return elo;
}

export function buildStandings(groupMembers, results) {
  const table = {};
  groupMembers.forEach(team => { table[team] = { team, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }; });
  for (const r of results) {
    if (!r.played) continue;
    if (!(r.home in table) || !(r.away in table)) continue;
    const home = table[r.home], away = table[r.away];
    home.pj++; away.pj++;
    home.gf += r.hg; home.gc += r.ag;
    away.gf += r.ag; away.gc += r.hg;
    if (r.hg > r.ag) { home.pg++; home.pts += 3; away.pp++; }
    else if (r.hg < r.ag) { away.pg++; away.pts += 3; home.pp++; }
    else { home.pe++; away.pe++; home.pts += 1; away.pts += 1; }
  }
  return Object.values(table)
    .map(t => ({ ...t, dg: t.gf - t.gc }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
}

function samplePoisson(lambda) {
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export function simulateTournamentMonteCarlo(eloTable, iterations = 2500) {
  const teams = Object.keys(BASE_ELO);
  const advanceCount = {}, championCount = {}, finalCount = {}, semiCount = {};
  teams.forEach(t => { advanceCount[t] = 0; championCount[t] = 0; finalCount[t] = 0; semiCount[t] = 0; });

  function playMatch(a, b) {
    const { lambdaHome, lambdaAway } = eloToLambdas(eloTable[a] ?? 1700, eloTable[b] ?? 1700, true);
    const gh = samplePoisson(lambdaHome); const ga = samplePoisson(lambdaAway);
    if (gh > ga) return a; if (ga > gh) return b;
    return Math.random() < 0.5 ? a : b;
  }

  for (let i = 0; i < iterations; i++) {
    const groupWinners = [];
    for (const members of Object.values(GROUPS)) {
      const pts = {}; members.forEach(m => pts[m] = 0);
      for (let x = 0; x < members.length; x++) {
        for (let y = x + 1; y < members.length; y++) {
          const a = members[x], b = members[y];
          const { lambdaHome, lambdaAway } = eloToLambdas(eloTable[a] ?? 1700, eloTable[b] ?? 1700, true);
          const gh = samplePoisson(lambdaHome); const ga = samplePoisson(lambdaAway);
          if (gh > ga) pts[a] += 3; else if (ga > gh) pts[b] += 3; else { pts[a] += 1; pts[b] += 1; }
        }
      }
      const ranked = [...members].sort((a, b) => pts[b] - pts[a] + (Math.random() - 0.5) * 0.01);
      groupWinners.push(ranked[0], ranked[1]);
      ranked.forEach((t, idx) => { if (idx < 2) advanceCount[t]++; });
    }
    let round = groupWinners;
    while (round.length > 1) {
      const next = [];
      for (let i2 = 0; i2 < round.length; i2 += 2) {
        if (i2 + 1 >= round.length) { next.push(round[i2]); continue; }
        next.push(playMatch(round[i2], round[i2 + 1]));
      }
      if (next.length === 4) next.forEach(t => semiCount[t]++);
      if (next.length === 2) next.forEach(t => finalCount[t]++);
      round = next;
    }
    if (round[0]) championCount[round[0]]++;
  }
  const result = {};
  teams.forEach(t => {
    result[t] = {
      advanceProb: advanceCount[t] / iterations, semiProb: semiCount[t] / iterations,
      finalProb: finalCount[t] / iterations, championProb: championCount[t] / iterations,
    };
  });
  return result;
}

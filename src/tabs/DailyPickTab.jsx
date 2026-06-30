import { useMemo, useState } from "react";
import { useLiveOdds, summarizeBookOdds } from "../useLiveOdds.js";
import { eloToLambdas, scoreMatrix, probsFromMatrix, GROUPS, buildStandings, impliedProb, ISO } from "../engine.js";
import { computeMotivation } from "../motivation.js";
import { scoreCandidate, rankDailyCandidates } from "../confidenceEngine.js";

// The Odds API manda nombres en inglés; el engine usa nombres en español.
// Este mapa normaliza antes de cualquier lookup en eloTable / GROUPS.
const API_TO_ENGINE = {
  "Spain": "Espana",
  "England": "Inglaterra",
  "France": "Francia",
  "Germany": "Alemania",
  "Brazil": "Brasil",
  "Netherlands": "Paises Bajos",
  "Belgium": "Belgica",
  "Croatia": "Croacia",
  "Morocco": "Marruecos",
  "United States": "Estados Unidos",
  "USA": "Estados Unidos",
  "Japan": "Japon",
  "Switzerland": "Suiza",
  "Turkey": "Turquia",
  "South Korea": "Corea del Sur",
  "Korea Republic": "Corea del Sur",
  "Algeria": "Argelia",
  "Egypt": "Egipto",
  "Norway": "Noruega",
  "Ivory Coast": "Costa de Marfil",
  "Côte d'Ivoire": "Costa de Marfil",
  "Cote d'Ivoire": "Costa de Marfil",
  "Sweden": "Suecia",
  "Czech Republic": "Chequia",
  "Czechia": "Chequia",
  "Scotland": "Escocia",
  "Tunisia": "Tunez",
  "DR Congo": "Rep. Dem. Congo",
  "Congo DR": "Rep. Dem. Congo",
  "Democratic Republic of Congo": "Rep. Dem. Congo",
  "Qatar": "Catar",
  "Iraq": "Irak",
  "South Africa": "Sudafrica",
  "Saudi Arabia": "Arabia Saudita",
  "Jordan": "Jordania",
  "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  "Cape Verde": "Cabo Verde",
  "Curacao": "Curazao",
  "New Zealand": "Nueva Zelanda",
};

function normalizeTeam(name) {
  return API_TO_ENGINE[name] ?? name;
}

function pct(x) { return (x * 100).toFixed(1) + "%"; }

function evColor(ev) {
  if (ev >= 0.12) return "text-win";
  if (ev >= 0.05) return "text-win/80";
  if (ev >= 0.01) return "text-win/60";
  if (ev > -0.03) return "text-textDim";
  return "text-loss/70";
}

function findGroupOf(team) {
  for (const [g, members] of Object.entries(GROUPS)) {
    if (members.includes(team)) return g;
  }
  return null;
}

function Flag({ team, className = "" }) {
  const iso = ISO[team];
  return iso
    ? <span className={`fi fi-${iso} ${className}`} style={{ borderRadius: 2 }} />
    : <span className="text-textDim text-xs">—</span>;
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-win opacity-70" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-win" />
    </span>
  );
}

function EdgeBar({ ev }) {
  const positive = ev > 0;
  const width = Math.min(100, Math.abs(ev) * 500);
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="edge-bar-track flex-1 hidden sm:block" style={{ minWidth: 28, maxWidth: 40 }}>
        <div
          style={{ width: `${width}%` }}
          className={`h-full rounded-full transition-all duration-700 ${
            positive
              ? "bg-gradient-to-r from-win/50 to-win"
              : "bg-gradient-to-r from-loss/40 to-loss/60"
          }`}
        />
      </div>
      <span className={`text-[11px] font-bold font-mono tabular-nums text-right flex-shrink-0 ${evColor(ev)}`}>
        {(ev >= 0 ? "+" : "") + pct(ev)}
      </span>
    </div>
  );
}

function MarketRow({ label, modelProb, bestOdds, ev, onAdd, canAdd, justAdded, isBest }) {
  const lowProb = isBest && modelProb < 0.2;
  return (
    <div>
      <div className={`grid items-center gap-x-1.5 py-[5px] rounded-lg ${isBest ? "bg-win/[0.06] px-1.5 -mx-1.5" : ""}`}
        style={{ gridTemplateColumns: "1fr 38px 38px 56px 70px" }}>
        <span className="text-[12.5px] text-paper truncate flex items-center gap-1.5 min-w-0">
          {isBest && <span className="text-win text-[10px] flex-shrink-0">★</span>}
          <span className="truncate">{label}</span>
        </span>
        <span className="text-[10.5px] text-textDim font-mono tabular-nums text-right">{pct(modelProb)}</span>
        <span className="text-[10.5px] text-paper font-mono tabular-nums text-right font-semibold">
          {bestOdds ? bestOdds.toFixed(2) : "—"}
        </span>
        <EdgeBar ev={ev} />
        {onAdd && (
          <button
            onClick={onAdd}
            disabled={!canAdd || !bestOdds}
            className={`text-[9px] font-bold px-1 py-1 rounded-lg border whitespace-nowrap disabled:opacity-25 transition-colors ${
              justAdded ? "bg-win text-ink border-win" : "bg-panel2 text-paper border-line hover:border-violet/50"
            }`}
          >
            {justAdded ? "✓" : "+ Bitácora"}
          </button>
        )}
      </div>
      {lowProb && (
        <div className="text-[9.5px] text-violet/70 pl-1.5 pb-1 -mt-0.5">
          ⚠ Probabilidad real de ganar baja ({pct(modelProb)}) — el edge es matemático, no garantía. Es la opción con menos certeza, no la más "segura".
        </div>
      )}
    </div>
  );
}

function MatchCard({ matchData, rank, onAddBet }) {
  const { home, away, candidates, bookCount } = matchData;
  const mlRows = candidates.filter(c => c.market === "ML");
  const ouRows = candidates.filter(c => c.market === "O/U");
  // La estrella ★ solo puede caer en ML, con probabilidad real >= 35% —
  // mismo criterio estructural que rankDailyCandidates en
  // confidenceEngine.js. O/U nunca compite por esta marca, y tampoco
  // candidatos de muy baja probabilidad (ver comentario extenso en
  // confidenceEngine.js sobre por qué esto debe ser una exclusión dura,
  // no una penalización — 3 casos reales en producción demostraron que
  // ninguna penalización numérica bastaba).
  const eligibleMlRows = mlRows.filter(c => c.modelProb >= 0.35);
  const bestMlEv = eligibleMlRows.length ? Math.max(...eligibleMlRows.map(c => c.ev)) : 0;
  const bestEv = bestMlEv; // se usa para el badge "max +X%" del header de la tarjeta
  const bestCandidate = bestMlEv > 0.02
    ? eligibleMlRows.reduce((best, c) => (c.ev > best.ev ? c : best), eligibleMlRows[0])
    : null;
  const isBestRow = (c) => bestCandidate && c.label === bestCandidate.label && c.market === bestCandidate.market;
  const allWarnings = [...new Set(candidates.flatMap(c => c.warnings))];

  const [stake, setStake] = useState("10");
  const [addedKey, setAddedKey] = useState(null);

  const handleAdd = (candidate) => {
    const amount = parseFloat(stake);
    if (!amount || amount <= 0 || !onAddBet) return;
    onAddBet({ match: matchData.match, market: candidate.label, odds: candidate.bestOdds, stake: amount, status: "pending", id: Date.now() });
    const key = `${candidate.market}-${candidate.label}`;
    setAddedKey(key);
    setTimeout(() => setAddedKey(null), 1800);
  };

  const rankColors = [
    "bg-win/15 text-win border-win/30",
    "bg-cyan/15 text-cyan border-cyan/30",
    "bg-violet/15 text-violet border-violet/30",
  ];

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-colors ${bestEv > 0.08 ? "border border-win/20" : ""}`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-white/[0.025]">
        <div className="flex items-center gap-2.5 min-w-0">
          {rank <= 3 && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono flex-shrink-0 ${rankColors[rank - 1]}`}>
              #{rank}
            </span>
          )}
          <Flag team={home} />
          <span className="text-[13px] font-bold text-paper truncate">{home}</span>
          <span className="text-[10px] text-textDim font-mono flex-shrink-0">vs</span>
          <span className="text-[13px] font-bold text-paper truncate">{away}</span>
          <Flag team={away} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {bookCount > 0 && (
            <span className="text-[9px] text-textDim/60 font-mono hidden sm:block">{bookCount} casas</span>
          )}
          {bestEv > 0 && (
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
              bestEv >= 0.08 ? "bg-win/15 text-win" : "bg-win/8 text-win/60"
            }`}>
              max {(bestEv >= 0 ? "+" : "") + pct(bestEv)}
            </span>
          )}
        </div>
      </div>

      {/* Monto a apostar (compartido para todas las filas de esta tarjeta) */}
      {onAddBet && (
        <div className="flex items-center gap-2 px-4 pt-2.5">
          <span className="text-[10px] text-textDim/60 font-mono">Monto $</span>
          <input
            type="number" inputMode="decimal" value={stake} onChange={e => setStake(e.target.value)}
            className="w-16 px-1.5 py-0.5 text-[11px] font-mono bg-panel2 border border-line rounded text-paper"
          />
        </div>
      )}

      {/* Markets body */}
      <div className="px-4 py-3 space-y-1">
        {/* Column labels */}
        <div className="grid gap-x-1.5 text-[8.5px] uppercase tracking-[0.12em] text-textDim/40 font-mono pb-1 border-b border-line/40"
          style={{ gridTemplateColumns: "1fr 38px 38px 56px 70px" }}>
          <span>Resultado</span>
          <span className="text-right">Modelo</span>
          <span className="text-right">Momio</span>
          <span className="text-right">Edge</span>
          <span></span>
        </div>

        {/* 1X2 */}
        {mlRows.length > 0 && (
          <div>
            <div className="text-[8px] uppercase tracking-[0.15em] text-textDim/35 font-mono pt-1.5 pb-0.5">1X2</div>
            {mlRows.map((c, i) => (
              <MarketRow key={i} {...c}
                isBest={isBestRow(c)}
                onAdd={onAddBet ? () => handleAdd(c) : null}
                canAdd={!!stake && parseFloat(stake) > 0}
                justAdded={addedKey === `${c.market}-${c.label}`}
              />
            ))}
          </div>
        )}

        {/* Over / Under */}
        {ouRows.length > 0 && (
          <div>
            <div className="flex items-center gap-2 pt-2.5 pb-0.5">
              <span className="text-[8px] uppercase tracking-[0.15em] text-textDim/35 font-mono">Goles</span>
              <span className="text-[7px] uppercase tracking-wider px-1.5 py-[2px] rounded bg-accentSoft text-violet/70 border border-lineGlow/30">señal débil</span>
            </div>
            {ouRows.map((c, i) => (
              <MarketRow key={i} {...c}
                isBest={isBestRow(c)}
                onAdd={onAddBet ? () => handleAdd(c) : null}
                canAdd={!!stake && parseFloat(stake) > 0}
                justAdded={addedKey === `${c.market}-${c.label}`}
              />
            ))}
          </div>
        )}

        {/* Warnings */}
        {allWarnings.length > 0 && (
          <div className="pt-2.5 mt-1 border-t border-line space-y-1">
            {allWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-violet text-[9px] mt-0.5 flex-shrink-0">⚠</span>
                <span className="text-[10px] text-violet/80 leading-tight">{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedPickCard({ pick, onAddBet }) {
  const [home, away] = pick.match.split(" vs ");
  const conf = pick.adjustedConfidence;
  const strengthLabel = conf >= 0.12 ? "ALTA" : conf >= 0.06 ? "MEDIA" : "BAJA";
  const strengthCls = conf >= 0.12
    ? "border-win/30 bg-win/10 text-win"
    : conf >= 0.06
    ? "border-cyan/30 bg-cyan/10 text-cyan"
    : "border-line bg-white/5 text-textDim";

  const [stake, setStake] = useState("10");
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const amount = parseFloat(stake);
    if (!amount || amount <= 0 || !onAddBet) return;
    onAddBet({ match: pick.match, market: pick.label, odds: pick.bestOdds, stake: amount, status: "pending", id: Date.now() });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="glass-gold rounded-2xl overflow-hidden relative animate-gold-pulse">
      {/* Animated top border shimmer */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] animate-shimmer pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(90deg, transparent 0%, #e8b923 40%, #f3f1ff 50%, #e8b923 60%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-full bg-gradient-to-b from-transparent via-gold/[0.04] to-transparent animate-scan"
          style={{ height: 80 }}
        />
      </div>

      <div className="relative p-5 sm:p-6">
        {/* Top row */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-gold font-mono">⚡ PICK DEL DÍA</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${strengthCls}`}>
              Confianza {strengthLabel}
            </span>
            <span className="text-[8.5px] uppercase tracking-wider text-textDim font-mono px-2 py-0.5 border border-line rounded bg-white/5">
              MUNDIAL 2026
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center gap-3 mb-4">
          <Flag team={home} className="text-xl" />
          <span className="text-[clamp(18px,4vw,26px)] font-display tracking-wide text-paper leading-none">{home.toUpperCase()}</span>
          <span className="text-[12px] font-mono text-textDim flex-shrink-0">VS</span>
          <span className="text-[clamp(18px,4vw,26px)] font-display tracking-wide text-paper leading-none">{away.toUpperCase()}</span>
          <Flag team={away} className="text-xl" />
        </div>

        {/* Market badge — qué apostar, explícito y grande */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[9px] uppercase tracking-wider text-gold font-mono px-2 py-1 rounded-lg border border-gold/30 bg-gold/10 font-bold">
            {pick.market === "ML" ? "RESULTADO" : pick.market === "O/U" ? "GOLES" : pick.market}
          </span>
          <span className="text-[15px] font-bold text-paper">→ {pick.label}</span>
        </div>

        {/* Big edge number */}
        <div className="mb-5">
          <div
            className="text-[clamp(42px,10vw,64px)] font-display leading-none tabular-nums neon-text-win"
          >
            {(conf >= 0 ? "+" : "") + pct(conf)}
          </div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-textDim font-mono mt-1.5">
            Confianza ajustada
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 py-3.5 border-t border-b border-white/10 mb-4">
          {[
            { label: "Modelo", value: pct(pick.modelProb), cls: "text-paper" },
            { label: "Momio implica", value: pick.bestOdds ? pct(impliedProb(pick.bestOdds)) : "—", cls: "text-paper" },
            { label: "Edge crudo", value: (pick.ev >= 0 ? "+" : "") + pct(pick.ev), cls: evColor(pick.ev) },
          ].map(({ label, value, cls }) => (
            <div key={label}>
              <div className="text-[8.5px] uppercase tracking-wider text-textDim/60 font-mono mb-1">{label}</div>
              <div className={`text-[16px] font-bold font-mono tabular-nums ${cls}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Warnings / clear */}
        {pick.warnings.length > 0 ? (
          <div className="space-y-1.5">
            {pick.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-violet text-[10px] mt-0.5 flex-shrink-0">⚠</span>
                <span className="text-[10.5px] text-violet/90 leading-tight">{w}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-win text-[11px]">✓</span>
            <span className="text-[10.5px] text-win/70">Sin advertencias detectadas en este mercado</span>
          </div>
        )}

        {onAddBet && (
          <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-white/10">
            <span className="text-[11px] text-textDim font-mono">Monto $</span>
            <input
              type="number" inputMode="decimal" value={stake} onChange={e => setStake(e.target.value)}
              className="w-20 px-2 py-1.5 text-[13px] font-mono bg-panel2 border border-line rounded-lg text-paper"
            />
            <button
              onClick={handleAdd}
              disabled={!stake || parseFloat(stake) <= 0}
              className={`flex-1 py-2 text-[12.5px] font-bold rounded-xl transition-colors disabled:opacity-30 ${
                added ? "bg-win text-ink" : "bg-gold text-ink hover:opacity-90"
              }`}
            >
              {added ? "✓ Agregada a la bitácora" : "+ Agregar a la bitácora"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExperimentalOuCard({ pick, onAddBet }) {
  const [home, away] = pick.match.split(" vs ");
  const [stake, setStake] = useState("10");
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const amount = parseFloat(stake);
    if (!amount || amount <= 0 || !onAddBet) return;
    onAddBet({ match: pick.match, market: `[Seguimiento] ${pick.label}`, odds: pick.bestOdds, stake: amount, status: "pending", id: Date.now() });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="glass rounded-2xl p-4 border border-lineGlow/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-violet font-mono">
          🧪 MEJOR O/U DEL DÍA · SOLO SEGUIMIENTO
        </span>
        <span className="text-[8px] uppercase tracking-wider text-violet/70 font-mono px-2 py-0.5 border border-lineGlow/30 rounded bg-accentSoft">
          no es recomendación
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Flag team={home} />
        <span className="text-[14px] font-bold text-paper">{home}</span>
        <span className="text-[10px] text-textDim font-mono">vs</span>
        <span className="text-[14px] font-bold text-paper">{away}</span>
        <Flag team={away} />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-[13px] font-bold text-paper">→ {pick.label}</span>
        <span className={`text-[13px] font-bold font-mono ${evColor(pick.ev)}`}>
          {(pick.ev >= 0 ? "+" : "") + pct(pick.ev)} edge crudo
        </span>
      </div>

      <p className="text-[10.5px] text-violet/70 leading-relaxed mb-3">
        Este mercado no ha demostrado señal real en backtest (ver Guía). Esta tarjeta existe solo para que registres
        el resultado real en tu Bitácora y acumules datos — no para que la trates como una recomendación.
      </p>

      {onAddBet && (
        <div className="flex items-center gap-2.5 pt-3 border-t border-line">
          <span className="text-[11px] text-textDim font-mono">Monto $</span>
          <input
            type="number" inputMode="decimal" value={stake} onChange={e => setStake(e.target.value)}
            className="w-16 px-2 py-1.5 text-[12px] font-mono bg-panel2 border border-line rounded-lg text-paper"
          />
          <button
            onClick={handleAdd}
            disabled={!stake || parseFloat(stake) <= 0}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-colors disabled:opacity-30 ${
              added ? "bg-win text-ink" : "bg-panel2 text-violet border border-lineGlow/40"
            }`}
          >
            {added ? "✓ Registrado para seguimiento" : "+ Registrar (solo seguimiento)"}
          </button>
        </div>
      )}
    </div>
  );
}

export function DailyPickTab({ eloTable, results, onAddBet }) {
  const { events, quota, loading, error, refresh } = useLiveOdds("soccer_fifa_world_cup", "h2h,totals");

  const { rankedCandidates, matchGroups, topOuPick } = useMemo(() => {
    const list = [];
    const matchMap = {};

    for (const event of events) {
      // homeApi/awayApi: nombre que manda The Odds API (inglés) — para buscar
      //   outcomes en bookOdds (que se indexan con ese mismo nombre)
      // home/away: nombre normalizado al español del engine — para eloTable,
      //   GROUPS, buildStandings, computeMotivation y display en el UI
      const homeApi = event.home_team;
      const awayApi = event.away_team;
      const home = normalizeTeam(homeApi);
      const away = normalizeTeam(awayApi);

      const eh = eloTable[home] ?? 1700, ea = eloTable[away] ?? 1700;
      const { lambdaHome, lambdaAway } = eloToLambdas(eh, ea, true);
      const probs = probsFromMatrix(scoreMatrix(lambdaHome, lambdaAway));
      const bookOdds = summarizeBookOdds(event);

      const groupHome = findGroupOf(home), groupAway = findGroupOf(away);
      const standingsHome = groupHome ? buildStandings(GROUPS[groupHome], results) : [];
      const standingsAway = groupAway ? buildStandings(GROUPS[groupAway], results) : [];
      const motivationHome = groupHome ? computeMotivation(standingsHome, home, 1) : { state: "desconocido" };
      const motivationAway = groupAway ? computeMotivation(standingsAway, away, 1) : { state: "desconocido" };

      const marketDefs = [
        { market: "ML", label: `Gana ${home}`, modelProb: probs.pH, bookKey: ["h2h", homeApi] },
        { market: "ML", label: "Empate", modelProb: probs.pD, bookKey: ["h2h", "Draw"] },
        { market: "ML", label: `Gana ${away}`, modelProb: probs.pA, bookKey: ["h2h", awayApi] },
        { market: "O/U", label: "Más de 2.5", modelProb: probs.over25, bookKey: ["totals", "Over"] },
        { market: "O/U", label: "Menos de 2.5", modelProb: probs.under25, bookKey: ["totals", "Under"] },
      ];

      const matchKey = `${home} vs ${away}`;
      if (!matchMap[matchKey]) {
        matchMap[matchKey] = { match: matchKey, home, away, candidates: [], bookCount: event.bookmakers?.length ?? 0 };
      }

      for (const def of marketDefs) {
        const odds = bookOdds[def.bookKey[0]]?.[def.bookKey[1]];
        if (!odds) continue;
        const scored = scoreCandidate(
          { market: def.market, label: def.label, modelProb: def.modelProb, bestOdds: odds.best, worstOdds: odds.worst },
          motivationHome, motivationAway, null, null
        );
        const candidate = { ...scored, match: matchKey, eventId: event.id, home, away, bestOdds: odds.best };
        list.push(candidate);
        matchMap[matchKey].candidates.push(candidate);
      }
    }

    const rankedCandidates = rankDailyCandidates(list);

    // Mejor O/U del día, calculado completamente aparte del ranking
    // principal — solo para que el usuario pueda llevar seguimiento de este
    // mercado y acumular datos reales (ver docs/MODELO.md). Nunca se mezcla
    // con rankedCandidates ni afecta el Pick del día.
    const ouOnly = list.filter(c => c.market === "O/U" && c.ev > 0);
    const topOuPick = ouOnly.length
      ? ouOnly.reduce((best, c) => (c.ev > best.ev ? c : best), ouOnly[0])
      : null;

    const matchGroups = Object.values(matchMap)
      .filter(m => m.candidates.length > 0)
      .sort((a, b) => {
        // Mismo criterio estructural: solo ML define el orden de las
        // tarjetas, para que un O/U con edge aparente grande no empuje un
        // partido arriba en la lista cuando su único valor real es de baja
        // confianza validada.
        const mlA = a.candidates.filter(c => c.market === "ML");
        const mlB = b.candidates.filter(c => c.market === "ML");
        const bestA = mlA.length ? Math.max(...mlA.map(c => c.ev)) : -Infinity;
        const bestB = mlB.length ? Math.max(...mlB.map(c => c.ev)) : -Infinity;
        return bestB - bestA;
      });

    return { rankedCandidates, matchGroups, topOuPick };
  }, [events, eloTable, results]);

  const topPick = rankedCandidates[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Status / controls bar */}
      <div className="flex items-center justify-between glass-strong rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <LiveDot />
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-paper font-bold font-mono">
              Mercados en vivo · Mundial 2026
            </div>
            <div className="text-[9px] text-textDim/50 font-mono">motor v3.1 · Elos calibrados</div>
            {quota && (
              <div className="text-[10px] text-textDim font-mono">
                The Odds API · {quota.remaining} consultas restantes
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-[10px] text-loss font-mono hidden sm:block truncate max-w-[180px]">
              {error}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider glass border border-line text-paper disabled:opacity-40 hover:border-violet/50 transition-colors rounded-xl font-mono"
          >
            {loading ? "Cargando…" : "↻ Actualizar"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="glass rounded-2xl px-4 py-3 border border-loss/20 bg-lossSoft">
          <p className="text-[12px] text-loss">
            No se pudo cargar momios en vivo: {error}
          </p>
          <p className="text-[10.5px] text-loss/70 mt-1">
            Verifica que ODDS_API_KEY esté configurada en Vercel y que el plan esté activo.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-[12px] text-textDim font-mono animate-pulse">Consultando mercados…</div>
        </div>
      )}

      {/* Featured pick hero */}
      {!loading && topPick && <FeaturedPickCard pick={topPick} onAddBet={onAddBet} />}

      {/* O/U experimental — solo seguimiento, nunca compite con el Pick del día */}
      {!loading && topOuPick && <ExperimentalOuCard pick={topOuPick} onAddBet={onAddBet} />}

      {/* Market grid by match */}
      {!loading && matchGroups.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="text-[8.5px] uppercase tracking-[0.2em] text-textDim/60 font-bold font-mono">
              Análisis de mercados
            </span>
            <div className="flex-1 h-px bg-line" />
            <span className="text-[8.5px] text-textDim/50 font-mono">
              {matchGroups.length} partido{matchGroups.length !== 1 ? "s" : ""} · ordenados por mejor edge
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {matchGroups.map((m, i) => (
              <MatchCard key={m.match} matchData={m} rank={i + 1} onAddBet={onAddBet} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && matchGroups.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <div className="text-[32px] mb-3 opacity-30">⚽</div>
          <div className="text-[13px] text-textDim">Sin partidos con momios disponibles ahora.</div>
          <div className="text-[11px] text-textDim/50 mt-1">
            Los mercados del Mundial 2026 se publican horas antes de cada jornada.
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] leading-relaxed px-1 text-textDim/50">
        "Mayor confianza" no es un lock — es donde modelo y mercado están más alineados con menos señales de incertidumbre detectadas hoy. Siempre hay riesgo real.
      </p>
    </div>
  );
}

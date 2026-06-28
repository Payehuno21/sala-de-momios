import { useMemo } from "react";
import { useLiveOdds, summarizeBookOdds } from "../useLiveOdds.js";
import { eloToLambdas, scoreMatrix, probsFromMatrix, GROUPS, buildStandings, impliedProb, ISO } from "../engine.js";
import { computeMotivation } from "../motivation.js";
import { scoreCandidate, rankDailyCandidates } from "../confidenceEngine.js";

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
    <div className="flex items-center gap-2 min-w-0">
      <div className="edge-bar-track flex-1" style={{ minWidth: 48 }}>
        <div
          style={{ width: `${width}%` }}
          className={`h-full rounded-full transition-all duration-700 ${
            positive
              ? "bg-gradient-to-r from-win/50 to-win"
              : "bg-gradient-to-r from-loss/40 to-loss/60"
          }`}
        />
      </div>
      <span className={`text-[11px] font-bold font-mono tabular-nums w-[52px] text-right flex-shrink-0 ${evColor(ev)}`}>
        {(ev >= 0 ? "+" : "") + pct(ev)}
      </span>
    </div>
  );
}

function MarketRow({ label, modelProb, bestOdds, ev }) {
  return (
    <div className="grid items-center gap-x-3 py-[5px]" style={{ gridTemplateColumns: "1fr 46px 46px 1fr" }}>
      <span className="text-[12.5px] text-paper truncate">{label}</span>
      <span className="text-[11px] text-textDim font-mono tabular-nums text-right">{pct(modelProb)}</span>
      <span className="text-[11px] text-paper font-mono tabular-nums text-right font-semibold">
        {bestOdds ? bestOdds.toFixed(2) : "—"}
      </span>
      <EdgeBar ev={ev} />
    </div>
  );
}

function MatchCard({ matchData, rank }) {
  const { home, away, candidates, bookCount } = matchData;
  const mlRows = candidates.filter(c => c.market === "ML");
  const ouRows = candidates.filter(c => c.market === "O/U");
  const bestEv = candidates.length ? Math.max(...candidates.map(c => c.ev)) : 0;
  const allWarnings = [...new Set(candidates.flatMap(c => c.warnings))];

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

      {/* Markets body */}
      <div className="px-4 py-3 space-y-1">
        {/* Column labels */}
        <div className="grid gap-x-3 text-[8.5px] uppercase tracking-[0.12em] text-textDim/40 font-mono pb-1 border-b border-line/40"
          style={{ gridTemplateColumns: "1fr 46px 46px 1fr" }}>
          <span>Resultado</span>
          <span className="text-right">Modelo</span>
          <span className="text-right">Momio</span>
          <span className="pl-1">Edge</span>
        </div>

        {/* 1X2 */}
        {mlRows.length > 0 && (
          <div>
            <div className="text-[8px] uppercase tracking-[0.15em] text-textDim/35 font-mono pt-1.5 pb-0.5">1X2</div>
            {mlRows.map((c, i) => <MarketRow key={i} {...c} />)}
          </div>
        )}

        {/* Over / Under */}
        {ouRows.length > 0 && (
          <div>
            <div className="flex items-center gap-2 pt-2.5 pb-0.5">
              <span className="text-[8px] uppercase tracking-[0.15em] text-textDim/35 font-mono">Goles</span>
              <span className="text-[7px] uppercase tracking-wider px-1.5 py-[2px] rounded bg-accentSoft text-violet/70 border border-lineGlow/30">señal débil</span>
            </div>
            {ouRows.map((c, i) => <MarketRow key={i} {...c} />)}
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

function FeaturedPickCard({ pick }) {
  const [home, away] = pick.match.split(" vs ");
  const conf = pick.adjustedConfidence;
  const strengthLabel = conf >= 0.12 ? "ALTA" : conf >= 0.06 ? "MEDIA" : "BAJA";
  const strengthCls = conf >= 0.12
    ? "border-win/30 bg-win/10 text-win"
    : conf >= 0.06
    ? "border-cyan/30 bg-cyan/10 text-cyan"
    : "border-line bg-white/5 text-textDim";

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

        {/* Market badge */}
        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full glass border border-line">
          <span className="text-[9px] uppercase tracking-wider text-textDim font-mono">{pick.market}</span>
          <span className="w-1 h-1 rounded-full bg-textDim/30" />
          <span className="text-[12px] font-semibold text-paper">{pick.label}</span>
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
      </div>
    </div>
  );
}

export function DailyPickTab({ eloTable, results }) {
  const { events, quota, loading, error, refresh } = useLiveOdds("soccer_fifa_world_cup", "h2h,totals");

  const { rankedCandidates, matchGroups } = useMemo(() => {
    const list = [];
    const matchMap = {};

    for (const event of events) {
      const { home_team: home, away_team: away } = event;
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
        { market: "ML", label: `Gana ${home}`, modelProb: probs.pH, bookKey: ["h2h", home] },
        { market: "ML", label: "Empate", modelProb: probs.pD, bookKey: ["h2h", "Draw"] },
        { market: "ML", label: `Gana ${away}`, modelProb: probs.pA, bookKey: ["h2h", away] },
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
    const matchGroups = Object.values(matchMap)
      .filter(m => m.candidates.length > 0)
      .sort((a, b) => {
        const bestA = Math.max(...a.candidates.map(c => c.ev));
        const bestB = Math.max(...b.candidates.map(c => c.ev));
        return bestB - bestA;
      });

    return { rankedCandidates, matchGroups };
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
      {!loading && topPick && <FeaturedPickCard pick={topPick} />}

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
              <MatchCard key={m.match} matchData={m} rank={i + 1} />
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

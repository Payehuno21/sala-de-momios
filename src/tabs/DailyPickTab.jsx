import { useState, useMemo } from "react";
import { useLiveOdds, summarizeBookOdds } from "../useLiveOdds.js";
import { eloToLambdas, scoreMatrix, probsFromMatrix, GROUPS, buildStandings } from "../engine.js";
import { computeMotivation } from "../motivation.js";
import { scoreCandidate, rankDailyCandidates } from "../confidenceEngine.js";

function pct(x) { return (x * 100).toFixed(1) + "%"; }

function findGroupOf(team) {
  for (const [g, members] of Object.entries(GROUPS)) {
    if (members.includes(team)) return g;
  }
  return null;
}

export function DailyPickTab({ eloTable, results }) {
  const { events, quota, loading, error, refresh } = useLiveOdds("soccer_fifa_world_cup", "h2h,totals,btts");

  const candidates = useMemo(() => {
    const list = [];
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
        { market: "Over/Under", label: "Más de 2.5", modelProb: probs.over25, bookKey: ["totals", "Over"] },
        { market: "Over/Under", label: "Menos de 2.5", modelProb: probs.under25, bookKey: ["totals", "Under"] },
        { market: "BTTS", label: "Ambos anotan: Sí", modelProb: probs.btts, bookKey: ["btts", "Yes"] },
        { market: "BTTS", label: "Ambos anotan: No", modelProb: probs.bttsNo, bookKey: ["btts", "No"] },
      ];

      for (const def of marketDefs) {
        const odds = bookOdds[def.bookKey[0]]?.[def.bookKey[1]];
        if (!odds) continue;
        const scored = scoreCandidate(
          { market: def.market, label: def.label, modelProb: def.modelProb, bestOdds: odds.best, worstOdds: odds.worst },
          motivationHome, motivationAway, null, null
        );
        list.push({ ...scored, match: `${home} vs ${away}`, eventId: event.id });
      }
    }
    return rankDailyCandidates(list);
  }, [events, eloTable, results]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between glass-strong rounded-2xl px-4 py-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-textDim font-semibold">Momios en vivo · The Odds API</span>
          {quota && <span className="text-[10.5px] text-textDim ml-3 font-mono">Cuota restante: {quota.remaining}</span>}
        </div>
        <button onClick={refresh} disabled={loading} className="px-3 py-1.5 text-[11px] font-bold glass border border-line text-paper disabled:opacity-40">
          {loading ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      {error && (
        <p className="text-[12px] text-loss border border-lossDim bg-lossSoft px-4 py-3">
          No se pudo cargar momios en vivo ({error}). Verifica que ODDS_API_KEY esté configurada en Vercel.
        </p>
      )}

      <div className="glass rounded-2xl">
        <div className="px-4 py-3 border-b border-line">
          <span className="text-[11px] uppercase tracking-wider text-textDim font-semibold">Comparativa del día — mayor confianza relativa primero</span>
        </div>
        <div className="px-4">
          {candidates.length === 0 && !loading && (
            <p className="text-[12px] text-textDim py-4">Sin candidatos con edge positivo en los partidos disponibles hoy.</p>
          )}
          {candidates.slice(0, 15).map((c, i) => (
            <div key={i} className="py-3 border-b border-line last:border-b-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-paper">{c.match}</div>
                  <div className="text-[12px] text-textDim">{c.label} <span className="text-textDim/70">({c.market})</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold font-mono text-win">{(c.adjustedConfidence >= 0 ? "+" : "") + pct(c.adjustedConfidence)}</div>
                  <div className="text-[10px] text-textDim font-mono">edge crudo: {(c.ev >= 0 ? "+" : "") + pct(c.ev)}</div>
                </div>
              </div>
              {c.warnings.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {c.warnings.map((w, wi) => (
                    <div key={wi} className="text-[10.5px] text-violet">⚠ {w}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed px-1 text-textDim/70">
        "Mayor confianza relativa" no es una apuesta segura ni un lock — es, entre los mercados disponibles hoy,
        donde el modelo y el mercado están más alineados y con menos señales de incertidumbre detectadas. Sigue habiendo riesgo real.
      </p>
    </div>
  );
}

import { useState, useMemo } from "react";
import { ALL_TEAMS, eloToLambdas, scoreMatrix, probsFromMatrix, impliedProb, expectedValue, kellyFraction } from "../engine.js";
import { TeamFlag } from "../components/TeamFlag.jsx";
import { ScoreBadge } from "../components/ScoreBadge.jsx";
import { ProbabilityBar } from "../components/ProbabilityBar.jsx";

function pct(x) { return (x * 100).toFixed(1) + "%"; }
function edgeColor(ev) {
  if (ev > 0.08) return "text-win";
  if (ev > 0.02) return "text-win/70";
  if (ev > -0.02) return "text-textDim";
  return "text-loss";
}

function TeamSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-ink border border-line px-3 py-2.5 text-[14px] font-medium focus:outline-none focus:border-gold w-full appearance-none text-paper">
      {ALL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

function MarketCard({ title, rows, warning }) {
  return (
    <div className="border border-line bg-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <span className="text-[11px] uppercase tracking-wider text-textDim font-semibold">{title}</span>
        {warning && <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-goldSoft text-gold/80 border border-lineGold">baja confianza</span>}
      </div>
      <div className="px-4">
        <div className="grid grid-cols-[1fr_60px_70px_64px] gap-2 py-2 text-[10px] uppercase tracking-wider text-textDim border-b border-line">
          <span>Mercado</span><span className="text-right">Modelo</span><span className="text-right">Momio</span><span className="text-right">Edge</span>
        </div>
        {rows.map((r, i) => <MarketRow key={i} {...r} />)}
      </div>
      {warning && <p className="text-[11px] leading-relaxed text-gold/60 px-4 py-2 border-t border-line">{warning}</p>}
    </div>
  );
}

function MarketRow({ label, modelProb, odds, onOddsChange }) {
  const hasOdds = odds && odds > 1;
  const ev = hasOdds ? expectedValue(modelProb, odds) : null;
  return (
    <div className="grid grid-cols-[1fr_60px_70px_64px] items-center gap-2 py-2.5 border-b border-line last:border-b-0">
      <span className="text-[13px] text-paper">{label}</span>
      <span className="text-[12px] text-right tabular-nums text-textDim">{pct(modelProb)}</span>
      <input
        type="number" inputMode="decimal" step="0.01" min="1.01" placeholder="1.00"
        value={odds || ""} onChange={e => onOddsChange(parseFloat(e.target.value) || 0)}
        className="px-2 py-1.5 text-right tabular-nums text-[13px] font-semibold focus:outline-none w-full bg-panel2 border border-line text-paper font-mono"
      />
      <span className={`text-right tabular-nums text-[12px] font-bold font-mono ${hasOdds ? edgeColor(ev) : "text-textDim"}`}>
        {hasOdds ? (ev >= 0 ? "+" : "") + pct(ev) : "—"}
      </span>
    </div>
  );
}

export function CalcTab({ eloTable, onAddBet }) {
  const [teamA, setTeamA] = useState("Argentina");
  const [teamB, setTeamB] = useState("Francia");
  const [neutral, setNeutral] = useState(true);
  const [odds, setOdds] = useState({ home: 0, draw: 0, away: 0, over: 0, under: 0, bttsY: 0, bttsN: 0 });
  const [stakeAmount, setStakeAmount] = useState("");
  const [justAdded, setJustAdded] = useState(null);

  const matchCalc = useMemo(() => {
    const eh = eloTable[teamA] ?? 1700;
    const ea = eloTable[teamB] ?? 1700;
    const { lambdaHome, lambdaAway } = eloToLambdas(eh, ea, neutral);
    const matrix = scoreMatrix(lambdaHome, lambdaAway);
    return { eh, ea, probs: probsFromMatrix(matrix) };
  }, [teamA, teamB, neutral, eloTable]);

  const candidates = useMemo(() => {
    const list = [];
    if (odds.home > 1) list.push({ label: `Gana ${teamA}`, market: "ML", p: matchCalc.probs.pH, odds: odds.home });
    if (odds.draw > 1) list.push({ label: "Empate", market: "ML", p: matchCalc.probs.pD, odds: odds.draw });
    if (odds.away > 1) list.push({ label: `Gana ${teamB}`, market: "ML", p: matchCalc.probs.pA, odds: odds.away });
    if (odds.over > 1) list.push({ label: "Más de 2.5 goles", market: "Over/Under", p: matchCalc.probs.over25, odds: odds.over });
    if (odds.under > 1) list.push({ label: "Menos de 2.5 goles", market: "Over/Under", p: matchCalc.probs.under25, odds: odds.under });
    if (odds.bttsY > 1) list.push({ label: "Ambos anotan: Sí", market: "Ambos Anotan", p: matchCalc.probs.btts, odds: odds.bttsY });
    if (odds.bttsN > 1) list.push({ label: "Ambos anotan: No", market: "Ambos Anotan", p: matchCalc.probs.bttsNo, odds: odds.bttsN });
    return list.map(c => ({ ...c, ev: expectedValue(c.p, c.odds) })).sort((a, b) => b.ev - a.ev);
  }, [odds, matchCalc, teamA, teamB]);

  const bestBet = candidates[0] || null;

  const addToBitacora = (candidate) => {
    const stake = parseFloat(stakeAmount);
    if (!stake || stake <= 0) return;
    onAddBet({ match: `${teamA} vs ${teamB}`, market: candidate.label, odds: candidate.odds, stake, status: "pending", id: Date.now() });
    setJustAdded(candidate.label);
    setTimeout(() => setJustAdded(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Columna 1: selección de partido + marcadores + best bet */}
      <div className="space-y-4">
        <div className="border border-lineGold bg-panel p-4">
          <div className="text-[11px] uppercase tracking-wider mb-3 text-textDim font-semibold">Partido</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <TeamSelect value={teamA} onChange={setTeamA} />
              <div className="mt-1.5"><TeamFlag team={teamA} size="text-xs" className="text-textDim" /></div>
            </div>
            <div>
              <TeamSelect value={teamB} onChange={setTeamB} />
              <div className="mt-1.5"><TeamFlag team={teamB} size="text-xs" className="text-textDim" /></div>
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-[12px] text-textDim">
            <input type="checkbox" checked={neutral} onChange={e => setNeutral(e.target.checked)} className="w-3.5 h-3.5 accent-gold" />
            Sede neutral
          </label>
          <div className="flex justify-between mt-3 text-[11px] tabular-nums text-textDim font-mono">
            <span>Elo {teamA}: <b className="text-paper">{matchCalc.eh.toFixed(0)}</b></span>
            <span>Elo {teamB}: <b className="text-paper">{matchCalc.ea.toFixed(0)}</b></span>
          </div>
        </div>

        <div className="border border-line bg-panel p-4">
          <div className="text-[11px] uppercase tracking-wider mb-3 text-textDim font-semibold">Probabilidad 1X2</div>
          <ProbabilityBar pH={matchCalc.probs.pH} pD={matchCalc.probs.pD} pA={matchCalc.probs.pA} labelH={teamA.toUpperCase()} labelA={teamB.toUpperCase()} />
        </div>

        <div className="border border-line bg-panel p-4">
          <div className="text-[11px] uppercase tracking-wider mb-2 text-textDim font-semibold">Marcadores más probables</div>
          <div className="flex gap-2 flex-wrap">
            {matchCalc.probs.topScores.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <ScoreBadge h={s.h} a={s.a} size="sm" />
                <span className="text-[11px] text-textDim font-mono">{pct(s.p)}</span>
              </div>
            ))}
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="border border-line bg-panel p-3.5 flex items-center gap-2">
            <span className="text-[12px] whitespace-nowrap text-textDim">Monto a apostar</span>
            <span className="text-[13px] font-bold text-gold">$</span>
            <input type="number" inputMode="decimal" placeholder="0.00" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[13px] font-bold tabular-nums focus:outline-none bg-panel2 border border-line text-paper font-mono" />
          </div>
        )}

        {bestBet && (
          <div className={`border p-4 ${bestBet.ev > 0 ? "bg-winSoft border-winDim" : "bg-lossSoft border-lossDim"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] uppercase tracking-wider font-bold ${bestBet.ev > 0 ? "text-win" : "text-loss"}`}>
                {bestBet.ev > 0 ? "Mejor valor detectado" : "Sin valor positivo"}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-panel2 text-textDim">{bestBet.market}</span>
            </div>
            <div className="text-[15px] font-bold mb-1 text-paper">{bestBet.label}</div>
            <div className="text-[12px] text-textDim">
              Modelo: {pct(bestBet.p)} · Momio implica: {pct(impliedProb(bestBet.odds))} · Edge: <b className={edgeColor(bestBet.ev)}>{(bestBet.ev >= 0 ? "+" : "") + pct(bestBet.ev)}</b>
            </div>
            {bestBet.ev > 0.5 && (
              <div className="text-[11px] mt-2 p-2 bg-goldSoft border border-lineGold text-gold/80">
                Edge mayor a 50% — verifica el Elo antes de confiar en este número.
              </div>
            )}
            {bestBet.ev > 0 && (
              <div className="text-[12px] mt-2 font-semibold text-win">
                Kelly fraccionado (50%): {pct(kellyFraction(bestBet.p, bestBet.odds))} del bankroll
              </div>
            )}
            <button onClick={() => addToBitacora(bestBet)} disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
              className="mt-3 w-full py-2 text-[12.5px] font-bold disabled:opacity-30 bg-gold text-ink">
              {justAdded === bestBet.label ? "Agregada a la bitácora" : "Agregar a la bitácora"}
            </button>
          </div>
        )}
      </div>

      {/* Columna 2: mercados de apuestas */}
      <div className="space-y-4">
        <MarketCard title="Resultado (1X2) · momio decimal" rows={[
          { label: `Gana ${teamA}`, modelProb: matchCalc.probs.pH, odds: odds.home, onOddsChange: v => setOdds(o => ({ ...o, home: v })) },
          { label: "Empate", modelProb: matchCalc.probs.pD, odds: odds.draw, onOddsChange: v => setOdds(o => ({ ...o, draw: v })) },
          { label: `Gana ${teamB}`, modelProb: matchCalc.probs.pA, odds: odds.away, onOddsChange: v => setOdds(o => ({ ...o, away: v })) },
        ]} />

        <MarketCard title="Goles totales" warning="El modelo apenas distingue mejor que la tasa promedio del torneo. Edge aquí es referencia débil." rows={[
          { label: "Más de 2.5", modelProb: matchCalc.probs.over25, odds: odds.over, onOddsChange: v => setOdds(o => ({ ...o, over: v })) },
          { label: "Menos de 2.5", modelProb: matchCalc.probs.under25, odds: odds.under, onOddsChange: v => setOdds(o => ({ ...o, under: v })) },
        ]} />

        <MarketCard title="Ambos anotan" warning="Misma limitación que Goles totales — úsalo con cautela." rows={[
          { label: "Sí", modelProb: matchCalc.probs.btts, odds: odds.bttsY, onOddsChange: v => setOdds(o => ({ ...o, bttsY: v })) },
          { label: "No", modelProb: matchCalc.probs.bttsNo, odds: odds.bttsN, onOddsChange: v => setOdds(o => ({ ...o, bttsN: v })) },
        ]} />
      </div>

      {/* Columna 3: comparativa */}
      <div className="space-y-4">
        {candidates.length > 0 ? (
          <div className="border border-line bg-panel">
            <div className="px-4 py-3 border-b border-line">
              <span className="text-[11px] uppercase tracking-wider text-textDim font-semibold">Comparativa de mercados</span>
            </div>
            <div className="px-4">
              {candidates.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-2.5 border-b border-line last:border-b-0">
                  <div className="flex-1 text-[12px]">
                    <span className="text-paper">{c.label}</span> <span className="text-textDim">({c.market})</span>
                    <div className={`font-bold tabular-nums text-[12px] font-mono ${edgeColor(c.ev)}`}>{(c.ev >= 0 ? "+" : "") + pct(c.ev)}</div>
                  </div>
                  <button onClick={() => addToBitacora(c)} disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                    className={`px-3 py-1.5 text-[11px] font-bold whitespace-nowrap disabled:opacity-30 border border-line ${justAdded === c.label ? "bg-win text-ink" : "bg-panel2 text-paper"}`}>
                    {justAdded === c.label ? "Agregada" : "Agregar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-line bg-panel p-4 text-[12px] text-textDim">
            Ingresa momios en los mercados para ver la comparativa de edge aquí.
          </div>
        )}
        <p className="text-[11px] leading-relaxed px-1 text-textDim/70">
          El edge es ventaja estadística esperada a largo plazo, no garantía partido a partido.
        </p>
      </div>
    </div>
  );
}

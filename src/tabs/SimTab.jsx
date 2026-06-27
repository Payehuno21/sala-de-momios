import { useState, useCallback } from "react";
import { simulateTournamentMonteCarlo } from "../engine.js";
import { ChampionBarChart } from "../components/ChampionBarChart.jsx";

export function SimTab({ eloTable }) {
  const [simData, setSimData] = useState(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => { setSimData(simulateTournamentMonteCarlo(eloTable, 2500)); setRunning(false); }, 50);
  }, [eloTable]);

  const topTeams = simData
    ? Object.entries(simData).sort((a, b) => b[1].championProb - a[1].championProb).slice(0, 12)
      .map(([team, d]) => ({ team, championProb: d.championProb }))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="glass-strong rounded-2xl p-4">
        <div className="text-[13px] font-semibold mb-2 text-paper">Monte Carlo · 2,500 simulaciones</div>
        <p className="text-[11.5px] leading-relaxed mb-3 text-textDim">
          Usa los 2 primeros de cada grupo (sin terceros) y bracket aleatorio — sirve para comparar fuerza relativa, no es el bracket oficial.
        </p>
        <button onClick={run} disabled={running}
          className="w-full py-2.5 text-[13px] font-bold disabled:opacity-40 bg-brand-gradient text-ink rounded-xl transition-transform active:scale-[0.97]">
          {running ? "Simulando…" : "Correr simulación"}
        </button>
      </div>

      {simData && (
        <div className="glass rounded-2xl p-4 lg:col-span-2">
          <div className="text-[11px] uppercase tracking-wider mb-3 text-textDim font-semibold">Probabilidad de campeón</div>
          <ChampionBarChart data={topTeams} />
        </div>
      )}
    </div>
  );
}

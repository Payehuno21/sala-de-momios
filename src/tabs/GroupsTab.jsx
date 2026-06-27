import { GROUPS, buildStandings } from "../engine.js";
import { TeamFlag } from "../components/TeamFlag.jsx";

export function GroupsTab({ eloTable, results }) {
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-textDim">Clasificación real (Pts → dif. de goles → goles a favor). Elo entre paréntesis.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(GROUPS).map(([g, members]) => {
          const standings = buildStandings(members, results);
          return (
            <div key={g} className="glass rounded-2xl">
              <div className="px-3 py-2 border-b border-lineGlow text-[11px] uppercase tracking-wider font-bold text-gradient">Grupo {g}</div>
              <div className="px-3">
                <div className="grid grid-cols-[1.6fr_24px_24px_24px_28px_28px] gap-1 py-1.5 text-[9px] uppercase tracking-wider text-textDim border-b border-line">
                  <span>Equipo</span><span className="text-center">PJ</span><span className="text-center">PG</span><span className="text-center">PE</span><span className="text-center">DG</span><span className="text-center">Pts</span>
                </div>
                {standings.map((s, idx) => (
                  <div key={s.team} className="grid grid-cols-[1.6fr_24px_24px_24px_28px_28px] gap-1 items-center text-[12px] py-1.5 border-b border-line last:border-b-0">
                    <span className="truncate flex items-center gap-1">
                      <span className={`text-[9px] font-bold w-3 ${idx < 2 ? "text-gradient" : "text-textDim"}`}>{idx + 1}</span>
                      <TeamFlag team={s.team} />
                    </span>
                    <span className="text-center tabular-nums text-textDim font-mono">{s.pj}</span>
                    <span className="text-center tabular-nums text-textDim font-mono">{s.pg}</span>
                    <span className="text-center tabular-nums text-textDim font-mono">{s.pe}</span>
                    <span className="text-center tabular-nums text-textDim font-mono">{s.dg > 0 ? `+${s.dg}` : s.dg}</span>
                    <span className="text-center tabular-nums font-bold font-mono text-paper">{s.pts}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-line">
                {[...members].sort((a, b) => (eloTable[b] ?? 1700) - (eloTable[a] ?? 1700)).map(m => (
                  <span key={m} className="text-[9.5px] tabular-nums px-1.5 py-0.5 glass text-textDim font-mono">
                    {m}: {(eloTable[m] ?? 1700).toFixed(0)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

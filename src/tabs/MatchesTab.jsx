import { useState, useMemo } from "react";
import { TeamFlag } from "../components/TeamFlag.jsx";
import { ScoreBadge } from "../components/ScoreBadge.jsx";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }).toUpperCase();
}

export function MatchesTab({ matches, fetchedAt, loading, error }) {
  const [filter, setFilter] = useState("today");

  const sorted = useMemo(() => [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || "")), [matches]);
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (filter === "played") return sorted.filter(m => m.played);
    if (filter === "today") return sorted.filter(m => m.date === today);
    if (filter === "upcoming") return sorted.filter(m => !m.played && !m.homeIsPlaceholder && !m.awayIsPlaceholder);
    return sorted;
  }, [sorted, filter, today]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between glass-strong rounded-2xl px-4 py-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-textDim font-semibold">Calendario oficial FIFA</span>
          {fetchedAt && <span className="text-[10.5px] text-textDim ml-3 font-mono">Actualizado: {new Date(fetchedAt).toLocaleString("es-MX")}</span>}
        </div>
        {loading && <span className="text-[10px] text-textDim">cargando…</span>}
      </div>

      {error && (
        <p className="text-[12px] text-loss border border-lossDim bg-lossSoft px-4 py-2">
          No se pudo cargar el calendario ({error}). El pipeline de GitHub Actions debe correr al menos una vez tras el deploy.
        </p>
      )}

      <div className="flex glass rounded-2xl2 overflow-x-auto">
        {[["today", "Hoy"], ["upcoming", "Próximos"], ["played", "Jugados"], ["all", "Todos"]].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex-1 py-2 text-[12px] font-semibold whitespace-nowrap border-r border-line last:border-r-0 ${filter === key ? "bg-brand-gradient text-ink" : "text-textDim"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && <p className="text-[12px] text-textDim col-span-full text-center py-6">Sin partidos en este filtro.</p>}
        {filtered.map((m, idx) => (
          <div key={idx} className="glass rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gradient font-semibold">{m.group !== "—" ? `Grupo ${m.group}` : m.round}</span>
              <span className="text-[10px] text-textDim font-mono">{formatDate(m.date)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 truncate text-[13px]"><TeamFlag team={m.home} /></div>
              <ScoreBadge h={m.hg} a={m.ag} size="sm" live={m.date === today && !m.played} />
              <div className="flex-1 text-right truncate text-[13px]"><TeamFlag team={m.away} /></div>
            </div>
            {m.venue && <div className="text-[10px] text-textDim mt-1.5 text-center">{m.venue}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

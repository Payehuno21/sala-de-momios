import { useState, useMemo } from "react";
import { BankrollChart } from "../components/BankrollChart.jsx";

function pct(x) { return (x * 100).toFixed(1) + "%"; }
function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }

// Detecta si una apuesta es de Over/Under por el texto del mercado — no
// depende de un campo separado porque las apuestas viejas (antes de este
// cambio) solo tienen el label de texto, no un campo "market" estructurado.
function isOverUnder(marketLabel) {
  const m = (marketLabel || "").toLowerCase();
  return m.includes("más de") || m.includes("menos de") || m.includes("[seguimiento]");
}

// A partir del marcador final, calcula si el resultado real fue Over (3+
// goles) o Under (2 o menos), y compara contra qué predijo la etiqueta del
// mercado ("Más de 2.5" o "Menos de 2.5") — esto es lo que de verdad mide
// si el MODELO acertó la dirección, independiente de si ganaste el momio.
function checkDirectionHit(marketLabel, homeGoals, awayGoals) {
  if (homeGoals === "" || awayGoals === "" || homeGoals == null || awayGoals == null) return null;
  const total = Number(homeGoals) + Number(awayGoals);
  const predictedOver = (marketLabel || "").toLowerCase().includes("más de");
  const actualOver = total > 2.5;
  return predictedOver === actualOver;
}

export function BitacoraTab({ bets, setBets, bankroll, setBankroll }) {
  const [form, setForm] = useState({ match: "", market: "", odds: "", stake: "" });

  const stats = useMemo(() => {
    let staked = 0, returned = 0, won = 0, lost = 0, pending = 0;
    let runningBalance = bankroll;
    const curve = [{ x: 0, y: bankroll }];
    bets.forEach((b, i) => {
      if (b.status === "won") { staked += b.stake; returned += b.stake * b.odds; won++; runningBalance += b.stake * (b.odds - 1); }
      else if (b.status === "lost") { staked += b.stake; lost++; runningBalance -= b.stake; }
      else { pending++; }
      if (b.status !== "pending") curve.push({ x: i + 1, y: runningBalance });
    });
    const profit = returned - staked;
    const roi = staked > 0 ? profit / staked : 0;
    return { staked, returned, profit, roi, won, lost, pending, balance: runningBalance, curve };
  }, [bets, bankroll]);

  const exportToCSV = () => {
    const headers = ["Partido", "Mercado", "Momio", "Monto", "Estado", "Marcador Final", "Acierto Dirección (O/U)"];
    const rows = bets.map(b => {
      const isOu = isOverUnder(b.market);
      const hit = isOu ? checkDirectionHit(b.market, b.homeGoals, b.awayGoals) : null;
      const score = (b.homeGoals !== undefined && b.homeGoals !== "" && b.awayGoals !== undefined && b.awayGoals !== "")
        ? `${b.homeGoals}-${b.awayGoals}` : "";
      return [
        b.match, b.market, Number(b.odds).toFixed(2), Number(b.stake).toFixed(2),
        b.status === "won" ? "Ganada" : b.status === "lost" ? "Perdida" : "Pendiente",
        score,
        hit === null ? "" : hit ? "Sí" : "No",
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `bitacora-mundial2026-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addBet = () => {
    const odds = parseFloat(form.odds), stake = parseFloat(form.stake);
    if (!form.match || !odds || !stake) return;
    setBets(b => [...b, { ...form, odds, stake, status: "pending", id: Date.now() }]);
    setForm({ match: "", market: "", odds: "", stake: "" });
  };
  const updateStatus = (id, status) => setBets(b => b.map(x => x.id === id ? { ...x, status } : x));
  const removeBet = (id) => setBets(b => b.filter(x => x.id !== id));
  const updateScore = (id, field, value) => setBets(b => b.map(x => x.id === id ? { ...x, [field]: value } : x));

  // Estadísticas de seguimiento O/U: solo cuenta apuestas con marcador
  // ingresado, separado por completo de ganancias/pérdidas de dinero.
  // Esto es lo que necesitas para saber si, con más partidos, este mercado
  // empieza a mostrar señal real (ver docs/MODELO.md).
  const ouTrackingStats = useMemo(() => {
    const ouBets = bets.filter(b => isOverUnder(b.market));
    const withScore = ouBets.filter(b => b.homeGoals !== undefined && b.homeGoals !== "" && b.awayGoals !== undefined && b.awayGoals !== "");
    let hits = 0;
    withScore.forEach(b => {
      const hit = checkDirectionHit(b.market, b.homeGoals, b.awayGoals);
      if (hit) hits++;
    });
    return { total: ouBets.length, withScore: withScore.length, hits, accuracy: withScore.length > 0 ? hits / withScore.length : null };
  }, [bets]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider mb-2 text-textDim font-semibold">Bankroll inicial</div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-gradient">$</span>
            <input type="number" inputMode="decimal" value={bankroll} onChange={e => setBankroll(parseFloat(e.target.value) || 0)}
              className="flex-1 text-[18px] font-bold tabular-nums px-3 py-2 glass border border-line text-paper font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-wider mb-1 text-textDim font-semibold">Balance</div>
            <div className={`text-[19px] font-bold tabular-nums font-mono ${stats.balance >= bankroll ? "text-win" : "text-loss"}`}>{money(stats.balance)}</div>
          </div>
          <div className="glass rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-wider mb-1 text-textDim font-semibold">ROI</div>
            <div className={`text-[19px] font-bold tabular-nums font-mono ${stats.roi >= 0 ? "text-win" : "text-loss"}`}>{(stats.roi >= 0 ? "+" : "") + pct(stats.roi)}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border border-winDim bg-winSoft p-2.5 text-center">
            <div className="text-[16px] font-bold text-win">{stats.won}</div>
            <div className="text-[9.5px] text-textDim">Ganadas</div>
          </div>
          <div className="border border-lossDim bg-lossSoft p-2.5 text-center">
            <div className="text-[16px] font-bold text-loss">{stats.lost}</div>
            <div className="text-[9.5px] text-textDim">Perdidas</div>
          </div>
          <div className="border border-lineGlow bg-accentSoft p-2.5 text-center">
            <div className="text-[16px] font-bold text-gradient">{stats.pending}</div>
            <div className="text-[9.5px] text-textDim">Pendientes</div>
          </div>
        </div>

        <button onClick={exportToCSV} disabled={bets.length === 0}
          className="w-full py-2 text-[12px] font-bold disabled:opacity-30 glass text-paper border border-lineGlow">
          Exportar bitácora a CSV
        </button>

        {ouTrackingStats.total > 0 && (
          <div className="glass rounded-2xl p-4 border border-lineGlow/40">
            <div className="text-[10px] uppercase tracking-wider mb-2 text-violet font-semibold">
              🧪 Entrenamiento Over/Under
            </div>
            <div className="text-[12px] text-textDim mb-2">
              {ouTrackingStats.withScore} de {ouTrackingStats.total} con marcador registrado
            </div>
            {ouTrackingStats.accuracy !== null ? (
              <div>
                <div className="text-[22px] font-bold font-mono text-violet">{pct(ouTrackingStats.accuracy)}</div>
                <div className="text-[10px] text-textDim">acierto de dirección (no es ganancia de dinero)</div>
              </div>
            ) : (
              <div className="text-[11px] text-textDim/70">Ingresa el marcador final en cada apuesta para ver el acierto.</div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {stats.curve.length > 1 && (
          <div className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider mb-3 text-textDim font-semibold">Evolución del bankroll</div>
            <BankrollChart curve={stats.curve} baseline={bankroll} />
          </div>
        )}

        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider mb-3 text-textDim font-semibold">Registrar apuesta</div>
          <div className="space-y-2">
            <input placeholder="Partido (ej. Argentina vs Francia)" value={form.match} onChange={e => setForm(f => ({ ...f, match: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] glass border border-line text-paper" />
            <input placeholder="Mercado (ej. Gana Argentina)" value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] glass border border-line text-paper" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Momio decimal" inputMode="decimal" value={form.odds} onChange={e => setForm(f => ({ ...f, odds: e.target.value }))}
                className="px-3 py-2 text-[13px] tabular-nums glass border border-line text-paper font-mono" />
              <input placeholder="Monto $" inputMode="decimal" value={form.stake} onChange={e => setForm(f => ({ ...f, stake: e.target.value }))}
                className="px-3 py-2 text-[13px] tabular-nums glass border border-line text-paper font-mono" />
            </div>
          </div>
          <button onClick={addBet} className="mt-3 w-full py-2.5 text-[13px] font-bold bg-brand-gradient text-ink rounded-xl transition-transform active:scale-[0.97]">Agregar a la bitácora</button>
        </div>
      </div>

      <div className="space-y-2">
        {bets.length === 0 && <p className="text-[12px] text-center py-4 text-textDim">Sin apuestas registradas todavía.</p>}
        {[...bets].reverse().map(b => {
          const isOu = isOverUnder(b.market);
          const directionHit = isOu ? checkDirectionHit(b.market, b.homeGoals, b.awayGoals) : null;
          return (
            <div key={b.id} className={`border p-3 ${b.status === "won" ? "bg-winSoft border-winDim" : b.status === "lost" ? "bg-lossSoft border-lossDim" : "glass border-line"}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-paper">{b.match}</div>
                  <div className="text-[11.5px] text-textDim">{b.market} · momio {Number(b.odds).toFixed(2)} · ${Number(b.stake).toFixed(2)}</div>
                </div>
                <button onClick={() => removeBet(b.id)} className="font-bold px-1 text-loss">✕</button>
              </div>

              {isOu && (
                <div className="mt-2 pt-2 border-t border-line/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-violet/80 font-mono">Marcador final:</span>
                    <input
                      type="number" inputMode="numeric" placeholder="0" value={b.homeGoals ?? ""}
                      onChange={e => updateScore(b.id, "homeGoals", e.target.value)}
                      className="w-10 px-1 py-1 text-[12px] text-center glass border border-line text-paper font-mono"
                    />
                    <span className="text-textDim text-[11px]">–</span>
                    <input
                      type="number" inputMode="numeric" placeholder="0" value={b.awayGoals ?? ""}
                      onChange={e => updateScore(b.id, "awayGoals", e.target.value)}
                      className="w-10 px-1 py-1 text-[12px] text-center glass border border-line text-paper font-mono"
                    />
                    {directionHit !== null && (
                      <span className={`text-[11px] font-bold ml-1 ${directionHit ? "text-win" : "text-loss"}`}>
                        {directionHit ? "✓ Modelo acertó dirección" : "✗ Modelo falló dirección"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-1.5 mt-2">
                {["pending", "won", "lost"].map(s => (
                  <button key={s} onClick={() => updateStatus(b.id, s)}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors"
                    style={{
                      background: b.status === s ? (s === "won" ? "#34eab0" : s === "lost" ? "#ff5f8f" : "#a78bfa") : "rgba(30,35,58,0.6)",
                      color: b.status === s ? "#070914" : "#9aa0c4",
                    }}>
                    {s === "pending" ? "Pendiente" : s === "won" ? "Ganada" : "Perdida"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

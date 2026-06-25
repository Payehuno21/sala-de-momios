import { useMemo } from "react";
import { BASE_ELO, eloToLambdas, scoreMatrix, probsFromMatrix, updateElo } from "../engine.js";

function pct(x) { return (x * 100).toFixed(1) + "%"; }

function computeCalibration(results) {
  const playedInOrder = results.filter(r => r.played);
  let elo = { ...BASE_ELO };
  const points = [];
  for (const r of playedInOrder) {
    const eh = elo[r.home] ?? 1700, ea = elo[r.away] ?? 1700;
    const { lambdaHome, lambdaAway } = eloToLambdas(eh, ea, true);
    const probs = probsFromMatrix(scoreMatrix(lambdaHome, lambdaAway));
    const favProb = Math.max(probs.pH, probs.pD, probs.pA);
    const favPick = probs.pH >= probs.pD && probs.pH >= probs.pA ? "H" : probs.pD >= probs.pA ? "D" : "A";
    const actual = r.hg > r.ag ? "H" : r.hg < r.ag ? "D" : "A";
    points.push({ predicted: favProb, hit: favPick === actual ? 1 : 0 });
    let scoreHome = r.hg > r.ag ? 1 : r.hg === r.ag ? 0.5 : 0;
    elo[r.home] = updateElo(eh, ea, scoreHome, 25);
    elo[r.away] = updateElo(ea, eh, 1 - scoreHome, 25);
  }
  const buckets = [
    { label: "40–55%", min: 0.40, max: 0.55, hits: 0, n: 0 },
    { label: "55–70%", min: 0.55, max: 0.70, hits: 0, n: 0 },
    { label: "70%+", min: 0.70, max: 1.01, hits: 0, n: 0 },
  ];
  points.forEach(p => {
    const b = buckets.find(b => p.predicted >= b.min && p.predicted < b.max);
    if (b) { b.n++; b.hits += p.hit; }
  });
  return { buckets, total: points.length };
}

function CalibrationChart({ results }) {
  const { buckets, total } = useMemo(() => computeCalibration(results), [results]);
  if (total < 5) return <p className="text-[12px] text-textDim">Se necesitan más partidos confirmados para mostrar calibración (mínimo 5).</p>;
  return (
    <div className="space-y-2.5">
      {buckets.map((b, i) => {
        const realRate = b.n > 0 ? b.hits / b.n : null;
        const midPredicted = (b.min + Math.min(b.max, 1)) / 2;
        return (
          <div key={i}>
            <div className="flex justify-between text-[11px] mb-1 text-textDim">
              <span>Modelo dice {b.label} ({b.n} part.)</span>
              <span className="font-bold text-paper">{realRate !== null ? pct(realRate) : "—"} real</span>
            </div>
            <div className="relative h-2 bg-panel2">
              <div className="absolute top-0 h-2 bg-lineGold opacity-50" style={{ width: `${midPredicted * 100}%` }} />
              {realRate !== null && <div className="absolute top-0 h-2 bg-gold" style={{ width: `${realRate * 100}%` }} />}
            </div>
          </div>
        );
      })}
      <p className="text-[10.5px] mt-1 text-textDim/70">
        Barra clara = lo que dice el modelo; dorada = lo que pasó. Walk-forward sobre {total} partidos confirmados.
      </p>
    </div>
  );
}

export function GuideTab({ results }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-[13px] leading-relaxed text-paper/90">
      <div className="border border-line bg-panel p-4">
        <h3 className="font-bold mb-2 text-gold">¿Cómo funciona el modelo?</h3>
        <p className="mb-2"><b>1. Elo dinámico:</b> cada selección parte de un rating calibrado sobre 920 partidos internacionales reales. Cada resultado confirmado recalcula los ratings.</p>
        <p className="mb-2"><b>2. Dixon-Coles Poisson:</b> corrige el sesgo del Poisson simple, que subestima marcadores bajos como 0-0 y 1-1.</p>
        <p><b>3. Monte Carlo:</b> miles de simulaciones del torneo para estimar avance, semis y campeón.</p>
      </div>
      <div className="border border-lineGold bg-panel p-4">
        <h3 className="font-bold mb-2 text-gold">¿El modelo es honesto con sus probabilidades?</h3>
        <p className="mb-3">Cuando dice "70% de gane", ¿de verdad pasa el 70% de las veces? Eso es calibración, más importante que solo aciertos.</p>
        <CalibrationChart results={results} />
      </div>
      <div className="border border-line bg-panel p-4">
        <h3 className="font-bold mb-2 text-gold">¿Qué es el Edge (EV)?</h3>
        <p>Compara la probabilidad del modelo contra la implícita en el momio. Un edge positivo no garantiza ganar esa apuesta puntual.</p>
      </div>
      <div className="border border-line bg-panel p-4">
        <h3 className="font-bold mb-2 text-gold">¿Qué es Kelly fraccionado?</h3>
        <p>Calcula qué % del bankroll apostar para maximizar crecimiento a largo plazo. Esta app usa Kelly al 50%.</p>
      </div>
      <div className="border border-lossDim bg-lossSoft p-4 lg:col-span-2">
        <h3 className="font-bold mb-2 text-loss">Límites honestos</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>No incorpora lesiones, alineaciones, clima ni rotación de plantilla.</li>
          <li>Con pocos partidos jugados, el intervalo de confianza estadístico es amplio.</li>
          <li>Over/Under y BTTS muestran baja confianza por ahora.</li>
          <li>Ningún modelo elimina el riesgo.</li>
        </ul>
      </div>
    </div>
  );
}

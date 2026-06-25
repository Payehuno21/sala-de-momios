import { useState, useMemo } from "react";
import { Logo } from "./components/Logo.jsx";
import { useMatches, toEngineResults } from "./useMatches.js";
import { buildEloTable } from "./engine.js";
import { CalcTab } from "./tabs/CalcTab.jsx";
import { MatchesTab } from "./tabs/MatchesTab.jsx";
import { GroupsTab } from "./tabs/GroupsTab.jsx";
import { SimTab } from "./tabs/SimTab.jsx";
import { BitacoraTab } from "./tabs/BitacoraTab.jsx";
import { GuideTab } from "./tabs/GuideTab.jsx";

function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }

const TABS = [
  { id: "calc", label: "Calculadora" },
  { id: "matches", label: "Partidos" },
  { id: "groups", label: "Grupos" },
  { id: "sim", label: "Simular" },
  { id: "log", label: "Bitácora" },
  { id: "guide", label: "Guía" },
];

export default function App() {
  const [tab, setTab] = useState("calc");
  const [bets, setBets] = useState([]);
  const [bankroll, setBankroll] = useState(1000);

  const { matches, fetchedAt, loading, error } = useMatches();
  const results = useMemo(() => toEngineResults(matches), [matches]);
  const eloTable = useMemo(() => buildEloTable(results), [results]);

  const addBet = (bet) => setBets(b => [...b, bet]);

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-line">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-[13px] font-semibold border-b-2 transition-colors ${
                  tab === t.id ? "text-gold border-gold" : "text-textDim border-transparent hover:text-paper"
                }`}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-textDim">Bankroll</div>
            <div className="text-[15px] font-bold tabular-nums font-mono text-gold">{money(bankroll)}</div>
          </div>
        </div>
        <div className="md:hidden flex border-t border-line overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-[12px] font-semibold whitespace-nowrap border-b-2 ${
                tab === t.id ? "text-gold border-gold" : "text-textDim border-transparent"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {tab === "calc" && <CalcTab eloTable={eloTable} onAddBet={addBet} />}
        {tab === "matches" && <MatchesTab matches={matches} fetchedAt={fetchedAt} loading={loading} error={error} />}
        {tab === "groups" && <GroupsTab eloTable={eloTable} results={results} />}
        {tab === "sim" && <SimTab eloTable={eloTable} />}
        {tab === "log" && <BitacoraTab bets={bets} setBets={setBets} bankroll={bankroll} setBankroll={setBankroll} />}
        {tab === "guide" && <GuideTab results={results} />}
      </main>
    </div>
  );
}

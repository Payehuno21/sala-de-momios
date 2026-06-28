import { useState, useMemo } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { Logo } from "./components/Logo.jsx";
import { useMatches, toEngineResults } from "./useMatches.js";
import { buildEloTable } from "./engine.js";
import { DailyPickTab } from "./tabs/DailyPickTab.jsx";
import { CalcTab } from "./tabs/CalcTab.jsx";
import { MatchesTab } from "./tabs/MatchesTab.jsx";
import { GroupsTab } from "./tabs/GroupsTab.jsx";
import { SimTab } from "./tabs/SimTab.jsx";
import { BitacoraTab } from "./tabs/BitacoraTab.jsx";
import { GuideTab } from "./tabs/GuideTab.jsx";

function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }

const TABS = [
  { id: "daily", label: "Mercados" },
  { id: "calc", label: "Calculadora" },
  { id: "matches", label: "Partidos" },
  { id: "groups", label: "Grupos" },
  { id: "sim", label: "Simular" },
  { id: "log", label: "Bitácora" },
  { id: "guide", label: "Guía" },
];

export default function App() {
  const [tab, setTab] = useState("daily");
  const [bets, setBets] = usePersistentState("sala-momios:bets", []);
  const [bankroll, setBankroll] = usePersistentState("sala-momios:bankroll", 1000);

  const { matches, fetchedAt, loading, error } = useMatches();
  const results = useMemo(() => toEngineResults(matches), [matches]);
  const eloTable = useMemo(() => buildEloTable(results), [results]);

  const addBet = (bet) => setBets(b => [...b, bet]);

  return (
    <div className="min-h-screen relative">
      <div className="mesh-bg"><div className="mesh-blob" /></div>

      <header className="sticky top-0 z-20 glass border-b-0 mx-3 mt-3 rounded-2xl">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`relative px-4 py-2 text-[13px] font-semibold rounded-xl transition-all duration-300 ${
                    active ? "text-white" : "text-textDim hover:text-paper"
                  }`}>
                  {active && (
                    <span className="absolute inset-0 rounded-xl bg-brand-gradient opacity-90 -z-10 animate-glow-pulse" />
                  )}
                  {t.label}
                </button>
              );
            })}
          </nav>
          <div className="text-right glass-strong rounded-xl px-3 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-textDim">Bankroll</div>
            <div className="text-[15px] font-bold tabular-nums font-mono text-gradient">{money(bankroll)}</div>
          </div>
        </div>
        <div className="md:hidden flex overflow-x-auto px-2 pb-2 gap-1">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap rounded-xl transition-all ${
                  active ? "text-white" : "text-textDim"
                }`}>
                {active && <span className="absolute inset-0 rounded-xl bg-brand-gradient opacity-90 -z-10" />}
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main key={tab} className="max-w-7xl mx-auto px-6 py-6 animate-fade-up">
        {tab === "daily" && <DailyPickTab eloTable={eloTable} results={results} onAddBet={addBet} />}
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

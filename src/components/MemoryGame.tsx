import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";

const EMOJIS = ["🚁", "✈️", "🚔", "🎯", "🛡️", "📡", "💥", "⚡"];

const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

interface Tile { id: number; emoji: string; flipped: boolean; matched: boolean; }

const MemoryGame = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const init = () => {
    const deck = shuffle([...EMOJIS, ...EMOJIS]).map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
    setTiles(deck); setPicks([]); setMoves(0); setWon(false);
  };
  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (picks.length !== 2) return;
    const [a, b] = picks;
    setMoves((m) => m + 1);
    if (tiles[a].emoji === tiles[b].emoji) {
      setTimeout(() => {
        setTiles((t) => t.map((tile, i) => i === a || i === b ? { ...tile, matched: true } : tile));
        setPicks([]);
      }, 400);
    } else {
      setTimeout(() => {
        setTiles((t) => t.map((tile, i) => i === a || i === b ? { ...tile, flipped: false } : tile));
        setPicks([]);
      }, 800);
    }
  }, [picks, tiles]);

  useEffect(() => {
    if (tiles.length && tiles.every((t) => t.matched)) setWon(true);
  }, [tiles]);

  const click = (i: number) => {
    if (picks.length >= 2 || tiles[i].flipped || tiles[i].matched) return;
    setTiles((t) => t.map((tile, idx) => idx === i ? { ...tile, flipped: true } : tile));
    setPicks((p) => [...p, i]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm">Züge: <strong className="text-primary tabular-nums">{moves}</strong></p>
        <Button size="sm" variant="outline" onClick={init}>🔄 Neu</Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            onClick={() => click(i)}
            className={`aspect-square rounded-lg text-3xl sm:text-4xl flex items-center justify-center transition-all border-2 ${
              t.matched ? "bg-emerald-500/20 border-emerald-500/50" :
              t.flipped ? "bg-primary/20 border-primary/50" :
              "bg-card border-border hover:bg-accent"
            }`}
          >
            {(t.flipped || t.matched) ? t.emoji : "?"}
          </button>
        ))}
      </div>
      {won && <p className="text-center text-emerald-400 font-bold">🎉 Geschafft in {moves} Zügen!</p>}
    </div>
  );
};

export default MemoryGame;
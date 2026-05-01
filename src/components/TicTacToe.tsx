import { useState } from "react";
import { Button } from "@/components/ui/button";

type Cell = "X" | "O" | null;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

const checkWin = (b: Cell[]): Cell => {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
};

const aiMove = (b: Cell[]): number => {
  for (const player of ["O", "X"] as const) {
    for (const [a, c, d] of LINES) {
      const line = [b[a], b[c], b[d]];
      if (line.filter((x) => x === player).length === 2 && line.includes(null)) {
        return [a, c, d][line.indexOf(null)];
      }
    }
  }
  if (b[4] === null) return 4;
  const empty = b.map((v, i) => v === null ? i : -1).filter((i) => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
};

const TicTacToe = () => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const winner = checkWin(board);
  const full = board.every((c) => c !== null);

  const play = (i: number) => {
    if (board[i] || winner) return;
    const next = [...board]; next[i] = turn;
    setBoard(next); setTurn(turn === "X" ? "O" : "X");
    if (turn === "X" && !checkWin(next) && next.some((c) => c === null)) {
      setTimeout(() => {
        const ai = aiMove(next);
        const after = [...next]; after[ai] = "O";
        setBoard(after); setTurn("X");
      }, 350);
    }
  };

  const reset = () => { setBoard(Array(9).fill(null)); setTurn("X"); };

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">Du bist <strong className="text-primary">X</strong> – Crew ist <strong className="text-pink-400">O</strong></p>
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {board.map((c, i) => (
          <button key={i} onClick={() => play(i)} className="aspect-square rounded-lg bg-card border-2 border-border hover:bg-accent text-4xl sm:text-5xl font-bold flex items-center justify-center">
            <span className={c === "X" ? "text-primary" : "text-pink-400"}>{c}</span>
          </button>
        ))}
      </div>
      {winner && <p className="text-center font-bold">{winner === "X" ? "🏆 Du gewinnst!" : "🤖 Crew gewinnt!"}</p>}
      {!winner && full && <p className="text-center font-bold">🤝 Unentschieden</p>}
      <Button className="w-full" variant="outline" onClick={reset}>🔄 Neue Runde</Button>
    </div>
  );
};

export default TicTacToe;
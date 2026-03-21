import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SYMBOLS = [
  { emoji: "7️⃣", name: "Seven", weight: 5 },
  { emoji: "💎", name: "Diamond", weight: 8 },
  { emoji: "🔔", name: "Bell", weight: 12 },
  { emoji: "🍒", name: "Cherry", weight: 15 },
  { emoji: "⭐", name: "Star", weight: 20 },
  { emoji: "🎲", name: "Dice", weight: 20 },
  { emoji: "🍋", name: "Lemon", weight: 20 },
];

const getRandomSymbol = () => {
  const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * totalWeight;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym.emoji;
  }
  return SYMBOLS[0].emoji;
};

const MULTIPLIERS: Record<string, number> = {
  "7️⃣": 10, "💎": 7, "🔔": 5, "🍒": 4, "⭐": 3, "🎲": 2, "🍋": 2,
};

const GamblingPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["🎰", "🎰", "🎰"]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("");
  const [lastWin, setLastWin] = useState(0);
  const [history, setHistory] = useState<{ result: string; amount: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("casino_balances").select("balance").eq("user_id", user.id).single().then(({ data, error }) => {
      if (data) setBalance(data.balance);
      else if (error) supabase.from("casino_balances").insert({ user_id: user.id, balance: 1000 });
    });
  }, [user]);

  const updateBalance = useCallback(async (newBalance: number) => {
    setBalance(newBalance);
    if (user) {
      await supabase.from("casino_balances").update({ balance: newBalance }).eq("user_id", user.id);
    }
  }, [user]);

  const spin = async () => {
    if (spinning || balance < bet) {
      if (balance < bet) toast.error("Nicht genug Guthaben!");
      return;
    }
    setSpinning(true);
    setMessage("");
    setLastWin(0);

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
    }, 70);

    setTimeout(() => {
      clearInterval(interval);
      const final = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
      setReels(final);
      setSpinning(false);

      let winAmount = 0;
      let resultMsg = "";

      if (final[0] === final[1] && final[1] === final[2]) {
        const mult = MULTIPLIERS[final[0]] || 3;
        winAmount = bet * mult;
        resultMsg = `🎉 JACKPOT! x${mult}`;
      } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
        winAmount = bet * 2;
        resultMsg = "✨ Doppel! x2";
      } else {
        winAmount = -bet;
        resultMsg = "Kein Glück!";
      }

      const newBalance = balance + (winAmount > 0 ? winAmount - bet : winAmount);
      updateBalance(Math.max(0, newBalance));
      setLastWin(winAmount > 0 ? winAmount : 0);
      setMessage(resultMsg);
      setHistory((prev) => [{ result: final.join(" "), amount: winAmount > 0 ? winAmount : -bet }, ...prev.slice(0, 9)]);
    }, 1800);
  };

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary">🎰 ASD Casino</h1>

      {/* Balance */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Kontostand</p>
          <p className="text-3xl font-bold text-primary tabular-nums">${balance.toLocaleString()}</p>
        </div>
        {lastWin > 0 && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] uppercase tracking-widest text-green-400">Gewinn</p>
            <p className="text-2xl font-bold text-green-400 tabular-nums">+${lastWin.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Slot Machine */}
      <div className="w-full bg-card border-2 border-border rounded-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="flex justify-center gap-4 mb-8 relative">
          {reels.map((symbol, i) => (
            <div
              key={i}
              className={`w-28 h-28 rounded-xl flex items-center justify-center text-6xl border-2 transition-all duration-200
                ${spinning
                  ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                  : "border-border bg-background shadow-inner"
                }`}
            >
              <span className={spinning ? "animate-pulse" : ""}>{symbol}</span>
            </div>
          ))}
        </div>

        {/* Message */}
        <div className="h-8 flex items-center justify-center">
          {message && (
            <p className={`text-lg font-bold animate-in fade-in zoom-in-95 duration-300 ${
              message.includes("JACKPOT") ? "text-yellow-400" :
              message.includes("Doppel") ? "text-green-400" : "text-muted-foreground"
            }`}>
              {message}
            </p>
          )}
        </div>

        {/* Bet Selection */}
        <div className="flex justify-center gap-2 mb-6 mt-4">
          {[50, 100, 250, 500, 1000].map((b) => (
            <button
              key={b}
              onClick={() => setBet(b)}
              disabled={b > balance}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-150 active:scale-95
                ${bet === b
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                  : b > balance
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-background border border-border hover:border-primary/40 text-foreground"
                }`}
            >
              ${b}
            </button>
          ))}
        </div>

        {/* Spin Button */}
        <div className="flex justify-center">
          <Button
            onClick={spin}
            disabled={spinning || balance < bet}
            size="lg"
            className="px-12 text-lg font-bold active:scale-95 transition-transform"
          >
            {spinning ? "Dreht..." : `SPIN – $${bet}`}
          </Button>
        </div>
      </div>

      {/* Payout Table */}
      <div className="w-full bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">Auszahlungstabelle</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {SYMBOLS.map((s) => (
            <div key={s.name} className="flex items-center gap-2 bg-background rounded-md px-3 py-2 border border-border/50">
              <span className="text-xl">{s.emoji}{s.emoji}{s.emoji}</span>
              <span className="text-primary font-bold">x{MULTIPLIERS[s.emoji]}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2 border border-border/50">
            <span className="text-lg">2x gleich</span>
            <span className="text-primary font-bold">x2</span>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Letzte Spiele</h3>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex justify-between text-sm px-2 py-1 rounded bg-background/50">
                <span className="text-lg">{h.result}</span>
                <span className={`font-bold tabular-nums ${h.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {h.amount > 0 ? "+" : ""}{h.amount}$
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamblingPage;

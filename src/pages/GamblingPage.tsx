import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import asdLogo from "@/assets/asd-logo.png";

const SYMBOLS = ["🎰", "💎", "🔔", "🍒", "⭐", "7️⃣", "🎲"];

const GamblingPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["🎰", "🎰", "🎰"]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("casino_balances").select("balance").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setBalance(data.balance);
      else supabase.from("casino_balances").insert({ user_id: user.id, balance: 1000 });
    });
  }, [user]);

  const updateBalance = async (newBalance: number) => {
    setBalance(newBalance);
    if (user) {
      await supabase.from("casino_balances").update({ balance: newBalance }).eq("user_id", user.id);
    }
  };

  const spin = async () => {
    if (spinning || balance < bet) return;
    setSpinning(true);
    setMessage("");

    // Animate
    const interval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      const final = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ];
      setReels(final);
      setSpinning(false);

      if (final[0] === final[1] && final[1] === final[2]) {
        const win = bet * 5;
        updateBalance(balance - bet + win);
        setMessage(`🎉 JACKPOT! +${win}$`);
      } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
        const win = bet * 2;
        updateBalance(balance - bet + win);
        setMessage(`✨ Gewinn! +${win}$`);
      } else {
        updateBalance(balance - bet);
        setMessage(`💨 Verloren! -${bet}$`);
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="text-2xl font-bold text-primary flex items-center gap-2">🎰 Slot Machine</h1>

      <div className="bg-card border border-border rounded-xl p-8 min-w-[400px]">
        <div className="flex justify-center gap-6 mb-6">
          {reels.map((symbol, i) => (
            <div key={i} className="w-24 h-24 bg-secondary/50 rounded-lg flex items-center justify-center text-5xl border border-border shadow-inner">
              <span className={spinning ? "animate-pulse" : ""}>{symbol}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Button onClick={spin} disabled={spinning || balance < bet} className="px-8">
            {spinning ? "Dreht..." : "SPIN 🎰"}
          </Button>
        </div>

        {message && (
          <p className={`text-center mt-4 font-bold ${message.includes("JACKPOT") || message.includes("Gewinn") ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
      </div>

      <div className="text-center text-primary">
        <p>💰 Kontostand: <span className="font-bold tabular-nums">{balance}$</span> | Einsatz: <span className="font-bold tabular-nums">{bet}$</span></p>
        <div className="flex gap-2 mt-2 justify-center">
          {[50, 100, 250, 500].map((b) => (
            <button
              key={b}
              onClick={() => setBet(b)}
              className={`px-3 py-1 text-xs rounded border transition-all ${bet === b ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}
            >
              {b}$
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GamblingPage;

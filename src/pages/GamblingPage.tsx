import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, Crown } from "lucide-react";
import hpLogo from "@/assets/hp-logo.png";
import asdLogo from "@/assets/asd-logo.png";
import swatLogo from "@/assets/swat-logo.png";
import ncpdLogo from "@/assets/ncpd-logo.png";

const REEL_SYMBOLS = [
  { id: "ncpd", src: ncpdLogo, name: "NCPD", weight: 20, multiplier: 5 },
  { id: "asd", src: asdLogo, name: "ASD", weight: 25, multiplier: 4 },
  { id: "swat", src: swatLogo, name: "SWAT", weight: 25, multiplier: 3 },
  { id: "hp", src: hpLogo, name: "HP", weight: 30, multiplier: 2 },
];

const getRandomSymbolId = () => {
  const totalWeight = REEL_SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * totalWeight;
  for (const sym of REEL_SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym.id;
  }
  return REEL_SYMBOLS[0].id;
};

const getSymbol = (id: string) => REEL_SYMBOLS.find((s) => s.id === id) || REEL_SYMBOLS[0];

const GamblingPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["ncpd", "asd", "swat", "hp"]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("");
  const [lastWin, setLastWin] = useState(0);
  const [history, setHistory] = useState<{ result: string; amount: number }[]>([]);

  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["casino-leaderboard"],
    queryFn: async () => {
      const { data: balances } = await supabase
        .from("casino_balances")
        .select("user_id, balance")
        .order("balance", { ascending: false })
        .limit(20);
      if (!balances?.length) return [];
      const userIds = balances.map((b) => b.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer, image_url")
        .in("id", userIds);
      return balances.map((b) => {
        const p = profiles?.find((pr) => pr.id === b.user_id);
        return { ...b, name: p?.name || "Unbekannt", dienstnummer: p?.dienstnummer, image_url: p?.image_url };
      });
    },
    refetchInterval: 10000,
  });

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
      refetchLeaderboard();
    }
  }, [user, refetchLeaderboard]);

  const spin = async () => {
    if (spinning || balance < bet) {
      if (balance < bet) toast.error("Nicht genug Guthaben!");
      return;
    }
    setSpinning(true);
    setMessage("");
    setLastWin(0);

    const interval = setInterval(() => {
      setReels([getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId()]);
    }, 70);

    setTimeout(() => {
      clearInterval(interval);
      const final = [getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId()];
      setReels(final);
      setSpinning(false);

      let winAmount = 0;
      let resultMsg = "";

      const allSame = final.every((s) => s === final[0]);
      const pairs = new Set(final).size;

      if (allSame) {
        const mult = getSymbol(final[0]).multiplier * 3;
        winAmount = bet * mult;
        resultMsg = `🎉 JACKPOT! x${mult}`;
      } else if (pairs === 1) {
        // 3 of a kind (impossible with 4 reels and size=1, but kept for safety)
        winAmount = bet * 4;
        resultMsg = "🔥 Dreifach! x4";
      } else if (pairs <= 2) {
        // At least 3 of same or two pairs
        const counts: Record<string, number> = {};
        final.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
        const maxCount = Math.max(...Object.values(counts));
        if (maxCount >= 3) {
          const sym = Object.entries(counts).find(([, c]) => c >= 3)![0];
          const mult = getSymbol(sym).multiplier;
          winAmount = bet * mult;
          resultMsg = `🔥 Dreifach! x${mult}`;
        } else {
          // Two pairs
          winAmount = bet * 2;
          resultMsg = "✨ Zwei Paare! x2";
        }
      } else if (pairs === 3) {
        // One pair
        winAmount = Math.floor(bet * 1.5);
        resultMsg = "✨ Ein Paar! x1.5";
      } else {
        winAmount = -bet;
        resultMsg = "Kein Glück!";
      }

      const newBalance = balance + (winAmount > 0 ? winAmount - bet : winAmount);
      updateBalance(Math.max(0, newBalance));
      setLastWin(winAmount > 0 ? winAmount : 0);
      setMessage(resultMsg);
      const names = final.map((s) => getSymbol(s).name);
      setHistory((prev) => [{ result: names.join(" | "), amount: winAmount > 0 ? winAmount : -bet }, ...prev.slice(0, 9)]);
    }, 1800);
  };

  const myRank = leaderboard?.findIndex((l) => l.user_id === user?.id) ?? -1;

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">
      {/* Main Slot */}
      <div className="flex-1 flex flex-col items-center gap-6 min-w-0">
        <div className="flex items-center gap-4">
          {REEL_SYMBOLS.map((s) => (
            <img key={s.id} src={s.src} alt={s.name} className="w-12 h-12 rounded-full object-cover border-2 border-border shadow-md" />
          ))}
        </div>

        <h1 className="text-2xl font-bold text-primary">🎰 NCPD Casino</h1>

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

        <div className="w-full bg-card border-2 border-border rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="flex justify-center gap-3 mb-8 relative">
            {reels.map((symbolId, i) => {
              const sym = getSymbol(symbolId);
              return (
                <div key={i} className={`w-24 h-24 rounded-xl flex items-center justify-center border-2 transition-all duration-200 ${spinning ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.15)]" : "border-border bg-background shadow-inner"}`}>
                  <img src={sym.src} alt={sym.name} className={`w-16 h-16 rounded-full object-cover ${spinning ? "animate-pulse" : ""}`} />
                </div>
              );
            })}
          </div>

          <div className="h-8 flex items-center justify-center">
            {message && (
              <p className={`text-lg font-bold animate-in fade-in zoom-in-95 duration-300 ${message.includes("JACKPOT") ? "text-yellow-400" : message.includes("Doppel") ? "text-green-400" : "text-muted-foreground"}`}>{message}</p>
            )}
          </div>

          <div className="flex justify-center gap-2 mb-6 mt-4">
            {[50, 100, 250, 500, 1000].map((b) => (
              <button key={b} onClick={() => setBet(b)} disabled={b > balance} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-150 active:scale-95 ${bet === b ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : b > balance ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-background border border-border hover:border-primary/40 text-foreground"}`}>${b}</button>
            ))}
          </div>

          <div className="flex justify-center">
            <Button onClick={spin} disabled={spinning || balance < bet} size="lg" className="px-12 text-lg font-bold active:scale-95 transition-transform">
              {spinning ? "Dreht..." : `SPIN – $${bet}`}
            </Button>
          </div>
        </div>

        <div className="w-full bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Auszahlungstabelle</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {REEL_SYMBOLS.map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-background rounded-md px-3 py-2 border border-border/50">
                <img src={s.src} alt={s.name} className="w-6 h-6 rounded-full object-cover" />
                <span className="font-medium">{s.name} x4</span>
                <span className="text-primary font-bold ml-auto">x{s.multiplier * 3}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2 border border-border/50">
              <span className="text-sm">3x gleich</span>
              <span className="text-primary font-bold ml-auto">x Mult</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2 border border-border/50">
              <span className="text-sm">2 Paare</span>
              <span className="text-primary font-bold ml-auto">x2</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-md px-3 py-2 border border-border/50">
              <span className="text-sm">1 Paar</span>
              <span className="text-primary font-bold ml-auto">x1.5</span>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="w-full bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Deine letzten Spiele</h3>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between text-sm px-2 py-1 rounded bg-background/50">
                  <span className="text-lg">{h.result}</span>
                  <span className={`font-bold tabular-nums ${h.amount > 0 ? "text-green-400" : "text-red-400"}`}>{h.amount > 0 ? "+" : ""}{h.amount}$</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="w-72 shrink-0 hidden lg:block">
        <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-primary">Rangliste</h2>
          </div>
          <div className="space-y-1.5">
            {leaderboard?.map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              return (
                <div key={entry.user_id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${isMe ? "bg-primary/10 border border-primary/30" : "bg-background/50 border border-transparent hover:border-border"}`}>
                  <div className="w-6 text-center shrink-0">
                    {i === 0 ? <Crown className="w-4 h-4 text-yellow-400 mx-auto" /> : <span className="text-[10px] text-muted-foreground font-bold">{i + 1}</span>}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {entry.image_url ? <img src={entry.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-muted-foreground">{entry.name?.charAt(0)?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>{entry.name}</p>
                    {entry.dienstnummer && <p className="text-[9px] text-muted-foreground font-mono">{entry.dienstnummer}</p>}
                  </div>
                  <span className={`text-xs font-bold tabular-nums shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>${entry.balance.toLocaleString()}</span>
                </div>
              );
            })}
            {(!leaderboard || leaderboard.length === 0) && <p className="text-xs text-muted-foreground text-center py-6">Noch keine Spieler</p>}
          </div>
          {myRank >= 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">Dein Platz: <span className="text-primary font-bold">#{myRank + 1}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamblingPage;

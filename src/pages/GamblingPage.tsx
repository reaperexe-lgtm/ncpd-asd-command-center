import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Trophy, Crown, Gift, Volume2, VolumeX } from "lucide-react";
import hpLogo from "@/assets/hp-logo.png";
import asdLogo from "@/assets/asd-logo.png";
import swatLogo from "@/assets/swat-logo.png";
import ncpdLogo from "@/assets/ncpd-logo.png";

const REEL_SYMBOLS = [
  { id: "ncpd", src: ncpdLogo, name: "NCPD", weight: 20, multiplier: 5 },
  { id: "asd", src: asdLogo, name: "ASD", weight: 25, multiplier: 4 },
  { id: "swat", src: swatLogo, name: "SWAT", weight: 25, multiplier: 3 },
  { id: "hp", src: hpLogo, name: "HP", weight: 30, multiplier: 2 },
] as const;

const DAILY_GIFT_AMOUNT = 500;
const DAILY_GIFT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

const getCasinoStorageKey = (userId: string) => `casino_state_${userId}`;

const readLocalCasinoState = (userId: string): { balance: number; lastDailyGift: string | null } | null => {
  try {
    const raw = localStorage.getItem(getCasinoStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.balance !== "number") return null;
    return {
      balance: parsed.balance,
      lastDailyGift: typeof parsed?.lastDailyGift === "string" ? parsed.lastDailyGift : null,
    };
  } catch {
    return null;
  }
};

const writeLocalCasinoState = (userId: string, balance: number, lastDailyGift: string | null) => {
  localStorage.setItem(getCasinoStorageKey(userId), JSON.stringify({ balance, lastDailyGift }));
};

const GamblingPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["ncpd", "asd", "swat", "hp"]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("");
  const [lastWin, setLastWin] = useState(0);
  const [history, setHistory] = useState<{ symbols: string[]; amount: number }[]>([]);
  const [lastDailyGift, setLastDailyGift] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("casino_volume");
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["casino-leaderboard"],
    queryFn: async () => {
      const { data: balances } = await supabase
        .from("casino_balances")
        .select("user_id, balance")
        .order("balance", { ascending: false });
      if (!balances?.length) return [];

      const userIds = balances.map((b) => b.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer, image_url")
        .in("id", userIds);

      return balances.map((b) => {
        const p = profiles?.find((pr) => pr.id === b.user_id);
        return {
          ...b,
          name: p?.name || "Unbekannt",
          dienstnummer: p?.dienstnummer,
          image_url: p?.image_url,
        };
      });
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const persistCasinoState = useCallback(
    async (nextBalance: number, nextLastDailyGift: string | null) => {
      setBalance(nextBalance);
      setLastDailyGift(nextLastDailyGift);

      if (!user) return;

      writeLocalCasinoState(user.id, nextBalance, nextLastDailyGift);

      const { error } = await supabase
        .from("casino_balances")
        .upsert(
          {
            user_id: user.id,
            balance: nextBalance,
            last_daily_gift: nextLastDailyGift,
          } as any,
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Casino persist error:", error);
      } else {
        refetchLeaderboard();
      }
    },
    [user, refetchLeaderboard]
  );

  useEffect(() => {
    if (!user) return;

    const local = readLocalCasinoState(user.id);
    if (local) {
      setBalance(local.balance);
      setLastDailyGift(local.lastDailyGift);
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("casino_balances")
        .select("user_id, balance, last_daily_gift")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Casino load error:", error);
        return;
      }

      if (data) {
        const serverBalance = typeof data.balance === "number" ? data.balance : local?.balance ?? 1000;
        const serverLastDailyGift = ((data as any).last_daily_gift as string | null) ?? local?.lastDailyGift ?? null;
        setBalance(serverBalance);
        setLastDailyGift(serverLastDailyGift);
        writeLocalCasinoState(user.id, serverBalance, serverLastDailyGift);
        return;
      }

      const initialBalance = local?.balance ?? 1000;
      const initialLastDailyGift = local?.lastDailyGift ?? null;

      const { error: insertError } = await supabase.from("casino_balances").insert({
        user_id: user.id,
        balance: initialBalance,
        last_daily_gift: initialLastDailyGift,
      } as any);

      if (!insertError) {
        setBalance(initialBalance);
        setLastDailyGift(initialLastDailyGift);
        writeLocalCasinoState(user.id, initialBalance, initialLastDailyGift);
      }
    };

    load();
  }, [user]);

  const canClaimDaily = () => {
    if (!lastDailyGift) return true;
    return nowTs - new Date(lastDailyGift).getTime() >= DAILY_GIFT_COOLDOWN_MS;
  };

  const getTimeUntilDaily = () => {
    if (!lastDailyGift) return null;
    const nextTs = new Date(lastDailyGift).getTime() + DAILY_GIFT_COOLDOWN_MS;
    const diff = nextTs - nowTs;
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const claimDailyGift = async () => {
    if (!user) return;
    if (!canClaimDaily()) {
      toast.error("Tagesgeschenk noch nicht verfügbar.");
      return;
    }

    const nowIso = new Date().toISOString();
    await persistCasinoState(balance + DAILY_GIFT_AMOUNT, nowIso);
    toast.success(`$${DAILY_GIFT_AMOUNT} Tagesgeschenk abgeholt!`);
  };

  const playSound = (src: string) => {
    try {
      const audio = new Audio(src);
      audio.volume = volume;
      audio.play().catch(() => {});
    } catch {}
  };

  const handleVolumeChange = (val: number[]) => {
    setVolume(val[0]);
    localStorage.setItem("casino_volume", String(val[0]));
  };

  const toggleMute = () => {
    const newVol = volume === 0 ? 0.5 : 0;
    setVolume(newVol);
    localStorage.setItem("casino_volume", String(newVol));
  };

  const spin = async () => {
    if (spinning || balance < bet) {
      if (balance < bet) toast.error("Nicht genug Guthaben!");
      return;
    }

    setSpinning(true);
    setMessage("");
    setLastWin(0);
    playSound("/spin-sound.wav");

    const interval = setInterval(() => {
      setReels([getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId()]);
    }, 70);

    setTimeout(async () => {
      clearInterval(interval);
      const final = [getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId(), getRandomSymbolId()];
      setReels(final);
      setSpinning(false);

      let winAmount = 0;
      let resultMsg = "";

      const allSame = final.every((s) => s === final[0]);
      const counts: Record<string, number> = {};
      final.forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
      const maxCount = Math.max(...Object.values(counts));
      const pairGroups = Object.values(counts).filter((c) => c >= 2).length;

      if (allSame) {
        const mult = getSymbol(final[0]).multiplier * 3;
        winAmount = bet * mult;
        resultMsg = `🎉 JACKPOT! x${mult}`;
        playSound("/jackpot-sound.wav");
      } else if (maxCount >= 3) {
        const sym = Object.entries(counts).find(([, c]) => c >= 3)?.[0] || final[0];
        const mult = getSymbol(sym).multiplier;
        winAmount = bet * mult;
        resultMsg = `🔥 Dreifach! x${mult}`;
      } else if (pairGroups >= 2) {
        winAmount = bet * 2;
        resultMsg = "✨ Zwei Paare! x2";
      } else if (maxCount >= 2) {
        winAmount = Math.floor(bet * 1.5);
        resultMsg = "✨ Ein Paar! x1.5";
      } else {
        winAmount = -bet;
        resultMsg = "Kein Glück!";
      }

      const nextBalance = Math.max(0, balance + (winAmount > 0 ? winAmount - bet : winAmount));
      await persistCasinoState(nextBalance, lastDailyGift);
      setLastWin(winAmount > 0 ? winAmount : 0);
      setMessage(resultMsg);
      setHistory((prev) => [{ symbols: final, amount: winAmount > 0 ? winAmount : -bet }, ...prev.slice(0, 9)]);
    }, 1800);
  };

  const myRank = leaderboard?.findIndex((l) => l.user_id === user?.id) ?? -1;
  const displayLeaderboard = leaderboard
    ?.map((l) => (l.user_id === user?.id ? { ...l, balance } : l))
    ?.sort((a, b) => b.balance - a.balance);

  return (
    <div className="relative">
      <div className="flex gap-6 max-w-6xl mx-auto">
      <div className="flex-1 flex flex-col items-center gap-6 min-w-0">
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

          <div className="text-center">
            {canClaimDaily() ? (
              <Button
                onClick={claimDailyGift}
                variant="outline"
                className="gap-2 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
              >
                <Gift className="w-4 h-4" /> $500 Tagesgeschenk
              </Button>
            ) : (
              <div className="px-4 py-2 rounded-lg border border-border bg-muted/30">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Nächstes Geschenk</p>
                <p className="text-sm font-bold text-muted-foreground tabular-nums">{getTimeUntilDaily()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full bg-card border-2 border-border rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <div className="flex justify-center gap-4 mb-8 relative">
            {reels.map((symbolId, i) => {
              const sym = getSymbol(symbolId);
              return (
                <div
                  key={i}
                  className={`w-32 h-32 rounded-xl flex items-center justify-center border-2 transition-all duration-200 ${
                    spinning
                      ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                      : "border-border bg-background shadow-inner"
                  }`}
                >
                  <img src={sym.src} alt={sym.name} className={`w-24 h-24 rounded-full object-cover ${spinning ? "animate-pulse" : ""}`} />
                </div>
              );
            })}
          </div>

          <div className="h-8 flex items-center justify-center">
            {message && (
              <p
                className={`text-lg font-bold animate-in fade-in zoom-in-95 duration-300 ${
                  message.includes("JACKPOT")
                    ? "text-yellow-400"
                    : message.includes("Dreifach") || message.includes("Paar")
                    ? "text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {message}
              </p>
            )}
          </div>

          <div className="flex justify-center gap-2 mb-6 mt-4">
            {[50, 100, 250, 500, 1000].map((b) => (
              <button
                key={b}
                onClick={() => setBet(b)}
                disabled={b > balance}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-150 active:scale-95 ${
                  bet === b
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

          <div className="flex justify-center">
            <Button onClick={spin} disabled={spinning || balance < bet} size="lg" className="px-12 text-lg font-bold active:scale-95 transition-transform">
              {spinning ? "Dreht..." : `SPIN – $${bet}`}
            </Button>
          </div>
        </div>

        <div className="w-full bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-primary mb-4">Auszahlungstabelle</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REEL_SYMBOLS.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border border-border/50">
                  <img src={s.src} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-sm">{s.name} x4</p>
                    <p className="text-primary font-bold text-lg tabular-nums">x{s.multiplier * 3}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-border/50">
                <span className="font-medium">3x gleich</span>
                <span className="text-primary font-bold text-lg">x Mult</span>
              </div>
              <div className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-border/50">
                <span className="font-medium">2 Paare</span>
                <span className="text-primary font-bold text-lg">x2</span>
              </div>
              <div className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-border/50">
                <span className="font-medium">1 Paar</span>
                <span className="text-primary font-bold text-lg">x1.5</span>
              </div>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="w-full bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Deine letzten Spiele</h3>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2">
                    {h.symbols.map((symbolId, j) => {
                      const sym = getSymbol(symbolId);
                      return <img key={`${symbolId}-${j}`} src={sym.src} alt={sym.name} className="w-8 h-8 rounded-full object-cover" />;
                    })}
                  </div>
                  <span className={`font-bold tabular-nums ${h.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {h.amount > 0 ? "+" : ""}
                    {h.amount}$
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-72 shrink-0 hidden lg:block">
        <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-primary">Rangliste</h2>
          </div>

          <div className="space-y-1.5">
            {displayLeaderboard?.map((entry, i) => {
              const isMe = entry.user_id === user?.id;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    isMe ? "bg-primary/10 border border-primary/30" : "bg-background/50 border border-transparent hover:border-border"
                  }`}
                >
                  <div className="w-6 text-center shrink-0">
                    {i === 0 ? <Crown className="w-4 h-4 text-yellow-400 mx-auto" /> : <span className="text-[10px] text-muted-foreground font-bold">{i + 1}</span>}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {entry.image_url ? (
                      <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{entry.name?.charAt(0)?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>{entry.name}</p>
                    {entry.dienstnummer && <p className="text-[9px] text-muted-foreground font-mono">{entry.dienstnummer}</p>}
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      i === 0 ? "text-yellow-400" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                    }`}
                  >
                    ${entry.balance.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {(!displayLeaderboard || displayLeaderboard.length === 0) && <p className="text-xs text-muted-foreground text-center py-6">Noch keine Spieler</p>}
          </div>

          {myRank >= 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Dein Platz: <span className="text-primary font-bold">#{myRank + 1}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Volume Control - Bottom Left */}
      <div className="fixed bottom-6 left-6 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
          >
            {volume === 0 ? (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Volume2 className="w-5 h-5 text-primary" />
            )}
          </button>
          {showVolumeSlider && (
            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-left-2 duration-200">
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.05}
                className="w-28"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamblingPage;

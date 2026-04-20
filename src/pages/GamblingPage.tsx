import { useState, useEffect, useCallback, useRef } from "react";
import { playSpinSound, playJackpotSound, playWinSound } from "@/lib/casinoSounds";
import { logActivity } from "@/lib/activityLog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Trophy, Crown, Gift, Volume2, VolumeX, RotateCw, Settings } from "lucide-react";
import confetti from "canvas-confetti";
import hpLogo from "@/assets/hp-logo.png";
import asdLogo from "@/assets/asd-logo.png";
import swatLogo from "@/assets/swat-logo.png";
import ncpdLogo from "@/assets/ncpd-logo.png";

const DEFAULT_MULTIPLIERS = { ncpd: 5, asd: 4, swat: 3, hp: 2 };
const PAIR_MULT_KEY = "casino_pair_mult";
const TWO_PAIR_MULT_KEY = "casino_two_pair_mult";

const loadMultipliers = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem("casino_multipliers");
    return raw ? JSON.parse(raw) : { ...DEFAULT_MULTIPLIERS };
  } catch { return { ...DEFAULT_MULTIPLIERS }; }
};
const loadPairMult = () => { try { return parseFloat(localStorage.getItem(PAIR_MULT_KEY) || "1.5"); } catch { return 1.5; } };
const loadTwoPairMult = () => { try { return parseFloat(localStorage.getItem(TWO_PAIR_MULT_KEY) || "2"); } catch { return 2; } };

const REEL_SYMBOLS = [
  { id: "ncpd", src: ncpdLogo, name: "NCPD", weight: 20 },
  { id: "asd", src: asdLogo, name: "ASD", weight: 25 },
  { id: "swat", src: swatLogo, name: "SWAT", weight: 25 },
  { id: "hp", src: hpLogo, name: "HP", weight: 30 },
] as const;

const DAILY_GIFT_AMOUNT = 100000;
const DAILY_GIFT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const getRandomSymbolId = (currentBalance: number) => {
  // Higher balance = more likely to lose (get mixed symbols)
  // Above 1 billion, heavily penalize by reducing weight of matching
  let lossBoost = 0;
  if (currentBalance >= 1_000_000_000) {
    lossBoost = 60; // massive loss bias above 1B
  } else if (currentBalance >= 500_000_000) {
    lossBoost = 40;
  } else if (currentBalance >= 100_000_000) {
    lossBoost = 25;
  } else if (currentBalance >= 10_000_000) {
    lossBoost = 12;
  }

  // Spread weights more evenly with lossBoost to reduce matching
  const adjustedSymbols = REEL_SYMBOLS.map((sym, i) => ({
    ...sym,
    weight: sym.weight + lossBoost + (i * lossBoost * 0.3),
  }));

  const totalWeight = adjustedSymbols.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * totalWeight;
  for (const sym of adjustedSymbols) {
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
  const { user, isAdmin } = useAuth();
  const [balance, setBalance] = useState(1000);
  const balanceRef = useRef(1000);
  const [multipliers, setMultipliers] = useState(loadMultipliers);
  const [pairMult, setPairMult] = useState(loadPairMult);
  const [twoPairMult, setTwoPairMult] = useState(loadTwoPairMult);
  const [editingPayouts, setEditingPayouts] = useState(false);
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["ncpd", "asd", "swat", "hp"]);
  const [displayReels, setDisplayReels] = useState<string[][]>([[], [], [], []]);
  const [spinning, setSpinning] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const autoSpinRef = useRef(false);
  const spinningRef = useRef(false);
  const lastDailyGiftRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [showCustomBet, setShowCustomBet] = useState(false);
  const [customBetInput, setCustomBetInput] = useState("");
  const [lastWin, setLastWin] = useState(0);
  const [history, setHistory] = useState<{ symbols: string[]; amount: number }[]>([]);
  const [lastDailyGift, setLastDailyGift] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("casino_volume");
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [giveMoneyUserId, setGiveMoneyUserId] = useState<string | null>(null);
  const [giveMoneyAmount, setGiveMoneyAmount] = useState("");

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

  const updateBalance = useCallback((val: number) => {
    balanceRef.current = val;
    setBalance(val);
  }, []);

  const updateLastDailyGift = useCallback((val: string | null) => {
    lastDailyGiftRef.current = val;
    setLastDailyGift(val);
  }, []);

  const persistCasinoState = useCallback(
    async (nextBalance: number, nextLastDailyGift: string | null) => {
      updateBalance(nextBalance);
      updateLastDailyGift(nextLastDailyGift);

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
    [user, refetchLeaderboard, updateBalance, updateLastDailyGift]
  );

  useEffect(() => {
    if (!user) return;

    const local = readLocalCasinoState(user.id);
    if (local) {
      updateBalance(local.balance);
      updateLastDailyGift(local.lastDailyGift);
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
        updateBalance(serverBalance);
        updateLastDailyGift(serverLastDailyGift);
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
        updateBalance(initialBalance);
        updateLastDailyGift(initialLastDailyGift);
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

    const currentBalance = balanceRef.current;
    const newBalance = currentBalance + DAILY_GIFT_AMOUNT;
    const nowIso = new Date().toISOString();
    await persistCasinoState(newBalance, nowIso);
    setNowTs(Date.now());
    toast.success(`$${DAILY_GIFT_AMOUNT} Tagesgeschenk abgeholt! Neuer Kontostand: $${newBalance.toLocaleString()}`);
    logActivity("daily_gift_claimed", "casino", { amount: DAILY_GIFT_AMOUNT, newBalance });
  };

  const adminGiveMoney = async (targetUserId: string, amount: number) => {
    if (!isAdmin || !targetUserId || amount <= 0) return;

    // Get current balance of target user
    const { data } = await supabase
      .from("casino_balances")
      .select("balance")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!data) {
      toast.error("Spieler-Konto nicht gefunden.");
      return;
    }

    const newBalance = (data.balance ?? 0) + amount;

    const { data: updated, error } = await supabase
      .from("casino_balances")
      .update({ balance: newBalance } as any)
      .eq("user_id", targetUserId)
      .select("balance")
      .maybeSingle();

    if (error || !updated) {
      toast.error("Fehler beim Geld geben.");
      console.error(error);
    } else {
      const appliedBalance = updated.balance ?? newBalance;
      toast.success(`$${amount.toLocaleString()} an Spieler gesendet!`);
      logActivity("Casino Geld gesendet", "casino", { target_user_id: targetUserId, amount, new_balance: appliedBalance });
      refetchLeaderboard();
      // If it's the current user, update local state too
      if (targetUserId === user?.id) {
        updateBalance(appliedBalance);
        writeLocalCasinoState(user.id, appliedBalance, lastDailyGiftRef.current);
      }
      setGiveMoneyUserId(null);
      setGiveMoneyAmount("");
    }
  };

  const playSoundOld = (src: string) => {
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
    const currentBal = balanceRef.current;
    if (spinningRef.current || currentBal < bet) {
      if (currentBal < bet) {
        toast.error("Nicht genug Guthaben!");
        stopAutoSpin();
      }
      return;
    }

    spinningRef.current = true;
    setSpinning(true);
    setMessage("");
    setLastWin(0);
    playSpinSound(volume);

    const strips = Array.from({ length: 4 }, () =>
      Array.from({ length: 20 }, () => getRandomSymbolId(currentBal))
    );
    setDisplayReels(strips);

    setTimeout(async () => {
      const bal = balanceRef.current;
      
      // 40% win chance (60% loss)
      const WIN_CHANCE = 0.40;
      const roll = Math.random();
      let final: string[];
      
      if (roll < WIN_CHANCE) {
        // Win! Decide win type randomly
        const winTypeRoll = Math.random();
        const ids = REEL_SYMBOLS.map(s => s.id);
        const pickRandom = () => ids[Math.floor(Math.random() * ids.length)];
        
        if (winTypeRoll < 0.05) {
          // Jackpot — all 4 same (5% of wins)
          const sym = pickRandom();
          final = [sym, sym, sym, sym];
        } else if (winTypeRoll < 0.20) {
          // Triple — 3 same (15% of wins)
          const sym = pickRandom();
          const other = ids.filter(id => id !== sym);
          final = [sym, sym, sym, other[Math.floor(Math.random() * other.length)]];
          // Shuffle
          final.sort(() => Math.random() - 0.5);
        } else if (winTypeRoll < 0.45) {
          // Two pairs (25% of wins)
          const shuffled = [...ids].sort(() => Math.random() - 0.5);
          final = [shuffled[0], shuffled[0], shuffled[1], shuffled[1]];
          final.sort(() => Math.random() - 0.5);
        } else {
          // Single pair (55% of wins)
          const sym = pickRandom();
          const others = ids.filter(id => id !== sym);
          const o1 = others[Math.floor(Math.random() * others.length)];
          const o2 = others.filter(id => id !== o1).length > 0
            ? others.filter(id => id !== o1)[Math.floor(Math.random() * others.filter(id => id !== o1).length)]
            : others[0];
          final = [sym, sym, o1, o2];
          final.sort(() => Math.random() - 0.5);
        }
      } else {
        // Loss — ensure no pairs by picking 4 different symbols
        const ids = REEL_SYMBOLS.map(s => s.id);
        final = [...ids].sort(() => Math.random() - 0.5);
      }
      
      setReels(final);
      setDisplayReels(final.map((f) => [f]));
      spinningRef.current = false;
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
        const mult = (multipliers[final[0]] || 2) * 3;
        winAmount = bet * mult;
        resultMsg = `🎉 JACKPOT! x${mult}`;
        playJackpotSound(volume);
        const end = Date.now() + 2500;
        const frame = () => {
          confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
          confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      } else if (maxCount >= 3) {
        const sym = Object.entries(counts).find(([, c]) => c >= 3)?.[0] || final[0];
        const mult = multipliers[sym] || 2;
        winAmount = bet * mult;
        resultMsg = `🔥 Dreifach! x${mult}`;
        playWinSound(volume);
      } else if (pairGroups >= 2) {
        winAmount = Math.floor(bet * twoPairMult);
        resultMsg = `✨ Zwei Paare! x${twoPairMult}`;
      } else if (maxCount >= 2) {
        winAmount = Math.floor(bet * pairMult);
        resultMsg = `✨ Ein Paar! x${pairMult}`;
      } else {
        winAmount = -bet;
        resultMsg = "Kein Glück!";
      }

      const nextBalance = Math.max(0, bal + (winAmount > 0 ? winAmount - bet : winAmount));
      await persistCasinoState(nextBalance, lastDailyGiftRef.current);
      setLastWin(winAmount > 0 ? winAmount : 0);
      setMessage(resultMsg);
      setHistory((prev) => [{ symbols: final, amount: winAmount > 0 ? winAmount : -bet }, ...prev.slice(0, 9)]);

      // Auto-spin: trigger next spin after a short delay
      if (autoSpinRef.current && nextBalance >= bet) {
        setTimeout(() => {
          if (autoSpinRef.current) spin();
        }, 800);
      } else if (autoSpinRef.current) {
        stopAutoSpin();
        toast.error("Auto-Spin gestoppt – nicht genug Guthaben!");
      }
    }, 1800);
  };

  const toggleAutoSpin = () => {
    if (autoSpin) {
      stopAutoSpin();
    } else {
      autoSpinRef.current = true;
      setAutoSpin(true);
      if (!spinningRef.current) spin();
    }
  };

  const stopAutoSpin = () => {
    autoSpinRef.current = false;
    setAutoSpin(false);
  };

  const myRank = leaderboard?.findIndex((l) => l.user_id === user?.id) ?? -1;
  const displayLeaderboard = leaderboard
    ?.map((l) => (l.user_id === user?.id ? { ...l, balance } : l))
    ?.sort((a, b) => b.balance - a.balance);

  return (
    <div className="relative">
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
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
                <Gift className="w-4 h-4" /> $100.000 Tagesgeschenk
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
              const strip = displayReels[i] || [symbolId];
              const sym = getSymbol(symbolId);
              return (
                <div
                  key={i}
                  className={`w-32 h-32 rounded-xl border-2 overflow-hidden relative ${
                    spinning
                      ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                      : "border-border bg-background shadow-inner"
                  }`}
                >
                  {spinning ? (
                    <div
                      className="flex flex-col items-center"
                      style={{
                        animation: `slotScroll ${1.2 + i * 0.25}s cubic-bezier(0.2, 0.8, 0.3, 1) forwards`,
                      }}
                    >
                      {strip.map((sId, j) => {
                        const s = getSymbol(sId);
                        return (
                          <div key={j} className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
                            <img src={s.src} alt={s.name} className="w-24 h-24 rounded-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img src={sym.src} alt={sym.name} className="w-24 h-24 rounded-full object-cover" />
                    </div>
                  )}
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

          <div className="flex justify-center items-center gap-2 mb-6 mt-4 flex-wrap">
            {[50, 100, 250, 500, 1000].map((b) => (
              <button
                key={b}
                onClick={() => { setBet(b); setShowCustomBet(false); }}
                disabled={b > balance}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-150 active:scale-95 ${
                  bet === b && !showCustomBet
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                    : b > balance
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-background border border-border hover:border-primary/40 text-foreground"
                }`}
              >
                ${b}
              </button>
            ))}
            <button
              onClick={() => { setShowCustomBet(!showCustomBet); setCustomBetInput(String(bet)); }}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-150 active:scale-95 ${
                showCustomBet
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                  : "bg-background border border-border hover:border-primary/40 text-foreground"
              }`}
            >
              ✏️ Wunsch
            </button>
          </div>

          {showCustomBet && (
            <div className="flex justify-center items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-sm text-muted-foreground font-medium">$</span>
              <input
                type="number"
                min={1}
                max={balance}
                value={customBetInput}
                onChange={(e) => setCustomBetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = Math.max(1, Math.min(balance, parseInt(customBetInput) || 0));
                    setBet(val);
                    setCustomBetInput(String(val));
                  }
                }}
                className="w-28 px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Betrag"
              />
              <Button
                size="sm"
                onClick={() => {
                  const val = Math.max(1, Math.min(balance, parseInt(customBetInput) || 0));
                  setBet(val);
                  setCustomBetInput(String(val));
                }}
              >
                OK
              </Button>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button onClick={spin} disabled={spinning || balance < bet || autoSpin} size="lg" className="px-12 text-lg font-bold active:scale-95 transition-transform">
              {spinning ? "Dreht..." : `SPIN – $${bet}`}
            </Button>
            <Button
              onClick={toggleAutoSpin}
              disabled={balance < bet && !autoSpin}
              size="lg"
              variant={autoSpin ? "destructive" : "outline"}
              className="gap-2 active:scale-95 transition-transform"
            >
              <RotateCw className={`w-5 h-5 ${autoSpin ? "animate-spin" : ""}`} />
              {autoSpin ? "STOP" : "Auto"}
            </Button>
          </div>
        </div>

        <div className="w-full bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary">Auszahlungstabelle</h3>
            {isAdmin && (
              <button
                onClick={() => setEditingPayouts(!editingPayouts)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                {editingPayouts ? "Fertig" : "Bearbeiten"}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REEL_SYMBOLS.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border border-border/50">
                  <img src={s.src} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-sm">{s.name} x4</p>
                    {editingPayouts ? (
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={multipliers[s.id] || 2}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          const next = { ...multipliers, [s.id]: val };
                          setMultipliers(next);
                          localStorage.setItem("casino_multipliers", JSON.stringify(next));
                        }}
                        className="w-16 px-2 py-1 text-sm rounded bg-muted border border-border text-primary font-bold tabular-nums text-center"
                      />
                    ) : (
                      <p className="text-primary font-bold text-lg tabular-nums">x{(multipliers[s.id] || 2) * 3}</p>
                    )}
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
                {editingPayouts ? (
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={twoPairMult}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1;
                      setTwoPairMult(val);
                      localStorage.setItem(TWO_PAIR_MULT_KEY, String(val));
                    }}
                    className="w-16 px-2 py-1 text-sm rounded bg-muted border border-border text-primary font-bold tabular-nums text-center"
                  />
                ) : (
                  <span className="text-primary font-bold text-lg">x{twoPairMult}</span>
                )}
              </div>
              <div className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-border/50">
                <span className="font-medium">1 Paar</span>
                {editingPayouts ? (
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={pairMult}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1;
                      setPairMult(val);
                      localStorage.setItem(PAIR_MULT_KEY, String(val));
                    }}
                    className="w-16 px-2 py-1 text-sm rounded bg-muted border border-border text-primary font-bold tabular-nums text-center"
                  />
                ) : (
                  <span className="text-primary font-bold text-lg">x{pairMult}</span>
                )}
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

      <div className="w-full lg:w-72 shrink-0 lg:block">
        <div className="bg-card border border-border rounded-lg p-4 lg:sticky lg:top-24">
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
                  className={`rounded-lg transition-colors ${
                    isMe ? "bg-primary/10 border border-primary/30" : "bg-background/50 border border-transparent hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2.5 px-3 py-2">
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
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGiveMoneyUserId(giveMoneyUserId === entry.user_id ? null : entry.user_id); }}
                        className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md hover:bg-accent transition-colors active:scale-95 text-base"
                        title="Geld geben"
                      >
                        💰
                      </button>
                    )}
                  </div>
                  {isAdmin && giveMoneyUserId === entry.user_id && (
                    <div className="flex items-center gap-1.5 px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <span className="text-[10px] text-muted-foreground">$</span>
                      <input
                        type="number"
                        min={1}
                        value={giveMoneyAmount}
                        onChange={(e) => setGiveMoneyAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = parseInt(giveMoneyAmount) || 0;
                            if (val > 0) adminGiveMoney(entry.user_id, val);
                          }
                        }}
                        placeholder="Betrag"
                        className="flex-1 w-0 px-2 py-1 text-[11px] rounded bg-background border border-border text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          const val = parseInt(giveMoneyAmount) || 0;
                          if (val > 0) adminGiveMoney(entry.user_id, val);
                        }}
                      >
                        Senden
                      </Button>
                    </div>
                  )}
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
      </div>

      {/* Volume Control - Bottom Left */}
      <div className="fixed bottom-6 left-6 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            onContextMenu={(e) => { e.preventDefault(); toggleMute(); }}
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

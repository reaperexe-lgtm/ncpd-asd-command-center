import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
type Card = { rank: string; suit: string };

const cardValue = (rank: string) => {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank, 10);
};

const handTotal = (hand: Card[]) => {
  let total = hand.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces = hand.filter((c) => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};

const newDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  return deck.sort(() => Math.random() - 0.5);
};

interface Props {
  balance: number;
  setBalance: (val: number, persist?: boolean) => Promise<void> | void;
}

const CardView = ({ card, hidden }: { card?: Card; hidden?: boolean }) => {
  if (hidden || !card) return <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-md bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary/40 flex items-center justify-center text-primary text-2xl">?</div>;
  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <div className={`w-14 h-20 sm:w-16 sm:h-24 rounded-md bg-white border-2 border-border flex flex-col items-center justify-center font-bold ${red ? "text-red-600" : "text-black"}`}>
      <span className="text-xl">{card.rank}</span>
      <span className="text-2xl leading-none">{card.suit}</span>
    </div>
  );
};

const Blackjack = ({ balance, setBalance }: Props) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [bet, setBet] = useState(500);
  const [phase, setPhase] = useState<"bet" | "play" | "reveal">("bet");
  const [message, setMessage] = useState("");
  const [showCustomBet, setShowCustomBet] = useState(false);
  const [customBetInput, setCustomBetInput] = useState("");

  const deal = useCallback(async () => {
    if (balance < bet) { toast.error("Nicht genug Guthaben."); return; }
    await setBalance(balance - bet, true);
    const d = newDeck();
    const p = [d.pop()!, d.pop()!];
    const dl = [d.pop()!, d.pop()!];
    setDeck(d); setPlayer(p); setDealer(dl); setMessage("");
    if (handTotal(p) === 21) {
      // Blackjack instant win 2.5x bet
      const win = Math.floor(bet * 2.5);
      await setBalance(balance - bet + win, true);
      setMessage(`🎉 Blackjack! +$${win.toLocaleString()}`);
      setPhase("reveal");
    } else {
      setPhase("play");
    }
  }, [balance, bet, setBalance]);

  const hit = useCallback(() => {
    const d = [...deck]; const c = d.pop()!;
    const p = [...player, c];
    setDeck(d); setPlayer(p);
    if (handTotal(p) > 21) {
      setMessage("💥 Bust! Verloren.");
      setPhase("reveal");
    }
  }, [deck, player]);

  const stand = useCallback(async () => {
    let d = [...deck]; let dl = [...dealer];
    while (handTotal(dl) < 17) { dl.push(d.pop()!); }
    setDealer(dl); setDeck(d);
    const pT = handTotal(player), dT = handTotal(dl);
    let win = 0; let msg = "";
    if (dT > 21 || pT > dT) { win = bet * 2; msg = `🏆 Gewonnen! +$${win.toLocaleString()}`; }
    else if (pT === dT) { win = bet; msg = "🤝 Push (Einsatz zurück)"; }
    else { msg = "😞 Verloren."; }
    if (win > 0) await setBalance(balance + win, true);
    if (win >= bet * 2) logActivity("blackjack_win", "casino", { bet, win });
    setMessage(msg);
    setPhase("reveal");
  }, [deck, dealer, player, bet, balance, setBalance]);

  const reset = () => { setPhase("bet"); setPlayer([]); setDealer([]); setMessage(""); };

  return (
    <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-950/40 rounded-lg border border-emerald-700/40 p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-emerald-300">🃏 Blackjack</h3>
        <span className="text-xs text-muted-foreground">Schlage den Dealer (max 21)</span>
      </div>

      {phase === "bet" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Einsatz</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {[100, 500, 1000, 5000, 10000].map((v) => (
                <Button key={v} size="sm" variant={bet === v && !showCustomBet ? "default" : "outline"} onClick={() => { setBet(v); setShowCustomBet(false); }}>
                  ${v.toLocaleString()}
                </Button>
              ))}
              <Button
                size="sm"
                variant={showCustomBet ? "default" : "outline"}
                onClick={() => { setShowCustomBet(!showCustomBet); setCustomBetInput(String(bet)); }}
              >
                ✏️ Wunsch
              </Button>
            </div>
            {showCustomBet && (
              <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
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
                  className="w-32 text-center tabular-nums"
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
          </div>
          <Button className="w-full" onClick={deal} disabled={bet < 1 || balance < bet}>Karten geben (${bet.toLocaleString()})</Button>
        </div>
      )}

      {phase !== "bet" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Dealer ({phase === "reveal" ? handTotal(dealer) : "?"})</p>
            <div className="flex gap-1.5 flex-wrap">
              {dealer.map((c, i) => <CardView key={i} card={c} hidden={phase === "play" && i === 1} />)}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Du ({handTotal(player)})</p>
            <div className="flex gap-1.5 flex-wrap">
              {player.map((c, i) => <CardView key={i} card={c} />)}
            </div>
          </div>
          {phase === "play" && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={hit}>Hit</Button>
              <Button className="flex-1" variant="outline" onClick={stand}>Stand</Button>
            </div>
          )}
          {phase === "reveal" && (
            <>
              <p className="text-center font-bold text-base">{message}</p>
              <Button className="w-full" onClick={reset}>Neue Runde</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Blackjack;
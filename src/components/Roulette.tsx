import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

interface Props {
  balance: number;
  setBalance: (val: number, persist?: boolean) => Promise<void> | void;
}

type BetType = "red" | "black" | "green" | "even" | "odd" | "low" | "high";

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const getColor = (n: number): "red" | "black" | "green" => {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
};

const Roulette = ({ balance, setBalance }: Props) => {
  const [bet, setBet] = useState(500);
  const [showCustomBet, setShowCustomBet] = useState(false);
  const [customBetInput, setCustomBetInput] = useState("");
  const [betType, setBetType] = useState<BetType>("red");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const spin = useCallback(async () => {
    if (balance < bet) { toast.error("Nicht genug Guthaben."); return; }
    setSpinning(true);
    setMessage("");
    setResult(null);
    await setBalance(balance - bet, true);

    setTimeout(async () => {
      const n = Math.floor(Math.random() * 37); // 0-36
      const color = getColor(n);
      let win = 0;
      let label = "";
      if (betType === "red" && color === "red") { win = bet * 2; label = "Rot"; }
      else if (betType === "black" && color === "black") { win = bet * 2; label = "Schwarz"; }
      else if (betType === "green" && color === "green") { win = bet * 14; label = "Grün (0)"; }
      else if (betType === "even" && n !== 0 && n % 2 === 0) { win = bet * 2; label = "Gerade"; }
      else if (betType === "odd" && n % 2 === 1) { win = bet * 2; label = "Ungerade"; }
      else if (betType === "low" && n >= 1 && n <= 18) { win = bet * 2; label = "1-18"; }
      else if (betType === "high" && n >= 19 && n <= 36) { win = bet * 2; label = "19-36"; }

      setResult(n);
      if (win > 0) {
        await setBalance(balance - bet + win, true);
        setMessage(`🎉 ${label}! Gewonnen +$${(win - bet).toLocaleString()}`);
        if (win >= bet * 14) logActivity("roulette_jackpot", "casino", { bet, win, number: n });
      } else {
        setMessage(`😞 ${n} (${color === "red" ? "Rot" : color === "black" ? "Schwarz" : "Grün"}) – Verloren.`);
      }
      setSpinning(false);
    }, 1500);
  }, [balance, bet, betType, setBalance]);

  const betOptions: { type: BetType; label: string; mult: string; cls: string }[] = [
    { type: "red", label: "Rot", mult: "x2", cls: "bg-red-700 hover:bg-red-600 text-white" },
    { type: "black", label: "Schwarz", mult: "x2", cls: "bg-zinc-800 hover:bg-zinc-700 text-white" },
    { type: "green", label: "Grün (0)", mult: "x14", cls: "bg-green-700 hover:bg-green-600 text-white" },
    { type: "even", label: "Gerade", mult: "x2", cls: "bg-background border border-border" },
    { type: "odd", label: "Ungerade", mult: "x2", cls: "bg-background border border-border" },
    { type: "low", label: "1-18", mult: "x2", cls: "bg-background border border-border" },
    { type: "high", label: "19-36", mult: "x2", cls: "bg-background border border-border" },
  ];

  const resColor = result !== null ? getColor(result) : null;

  return (
    <div className="bg-gradient-to-br from-red-900/30 to-zinc-950/40 rounded-lg border border-red-800/40 p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-red-300">🎡 Roulette</h3>
        <span className="text-xs text-muted-foreground">Setze auf Farbe oder Zahl</span>
      </div>

      <div className="flex justify-center">
        <div
          className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-bold tabular-nums transition-all ${
            spinning ? "border-primary/60 animate-spin bg-primary/10" :
            resColor === "red" ? "border-red-500 bg-red-700 text-white" :
            resColor === "black" ? "border-zinc-700 bg-zinc-800 text-white" :
            resColor === "green" ? "border-green-500 bg-green-700 text-white" :
            "border-border bg-background text-muted-foreground"
          }`}
        >
          {spinning ? "?" : result !== null ? result : "—"}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Wette</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {betOptions.map((o) => (
            <button
              key={o.type}
              onClick={() => setBetType(o.type)}
              disabled={spinning}
              className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${o.cls} ${
                betType === o.type ? "ring-2 ring-primary scale-95" : "opacity-80 hover:opacity-100"
              }`}
            >
              {o.label} <span className="text-[10px] opacity-80">{o.mult}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Einsatz</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {[100, 500, 1000, 5000, 10000].map((v) => (
            <Button
              key={v}
              size="sm"
              variant={bet === v && !showCustomBet ? "default" : "outline"}
              onClick={() => { setBet(v); setShowCustomBet(false); }}
              disabled={spinning}
            >
              ${v.toLocaleString()}
            </Button>
          ))}
          <Button
            size="sm"
            variant={showCustomBet ? "default" : "outline"}
            onClick={() => { setShowCustomBet(!showCustomBet); setCustomBetInput(String(bet)); }}
            disabled={spinning}
          >
            ✏️ Wunsch
          </Button>
        </div>
        {showCustomBet && (
          <div className="flex items-center gap-2 mt-2">
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

      {message && (
        <p className={`text-center font-bold text-sm ${message.includes("Gewonnen") ? "text-green-400" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}

      <Button className="w-full" onClick={spin} disabled={spinning || balance < bet}>
        {spinning ? "Dreht..." : `Drehen – $${bet.toLocaleString()}`}
      </Button>
    </div>
  );
};

export default Roulette;

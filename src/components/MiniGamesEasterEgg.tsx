import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemoryGame from "./MemoryGame";
import TicTacToe from "./TicTacToe";
import { Gamepad2 } from "lucide-react";

/**
 * Hidden mini-games launcher. Trigger: press "M" three times within 1.5s.
 * After first discovery, a small floating gamepad button stays visible.
 */
const MiniGamesEasterEgg = () => {
  const [open, setOpen] = useState(false);
  const [discovered, setDiscovered] = useState(() => localStorage.getItem("minigames_discovered") === "1");

  useEffect(() => {
    let presses: number[] = [];
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "m") return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const now = Date.now();
      presses = presses.filter((p) => now - p < 1500);
      presses.push(now);
      if (presses.length >= 3) {
        presses = [];
        setDiscovered(true);
        localStorage.setItem("minigames_discovered", "1");
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {discovered && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-40 w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center hover:scale-110 transition-transform shadow-lg backdrop-blur-md"
          title="Mini-Games"
        >
          <Gamepad2 className="w-5 h-5" />
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2"><Gamepad2 className="w-5 h-5" /> Mini-Games</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="memory">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="memory">🧠 Memory</TabsTrigger>
              <TabsTrigger value="ttt">⭕ Tic-Tac-Toe</TabsTrigger>
            </TabsList>
            <TabsContent value="memory" className="mt-3"><MemoryGame /></TabsContent>
            <TabsContent value="ttt" className="mt-3"><TicTacToe /></TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MiniGamesEasterEgg;
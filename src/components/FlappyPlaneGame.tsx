import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Play, RotateCcw } from "lucide-react";

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

interface GameScore {
  player_name: string;
  score: number;
  created_at: string;
}

const CANVAS_W = 320;
const CANVAS_H = 480;
const PLANE_SIZE = 24;
const PIPE_WIDTH = 44;
const PIPE_GAP = 130;
const GRAVITY = 0.45;
const JUMP_FORCE = -7;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 90;

export const FlappyPlaneGame = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "dead">("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const gameRef = useRef({
    planeY: CANVAS_H / 2,
    velocity: 0,
    pipes: [] as Pipe[],
    frame: 0,
    score: 0,
    running: false,
  });

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("player_name, score, created_at")
      .order("score", { ascending: false })
      .limit(15);
    if (data) setLeaderboard(data);
  }, []);

  useEffect(() => {
    if (open) fetchLeaderboard();
  }, [open, fetchLeaderboard]);

  const saveScore = useCallback(async (finalScore: number) => {
    if (!user || finalScore === 0) return;
    await supabase.from("game_scores").insert({
      user_id: user.id,
      player_name: profile?.name || "Unbekannt",
      score: finalScore,
    });
    fetchLeaderboard();
  }, [user, profile, fetchLeaderboard]);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.planeY = CANVAS_H / 2;
    g.velocity = 0;
    g.pipes = [];
    g.frame = 0;
    g.score = 0;
    g.running = true;
    setScore(0);
    setGameState("playing");
  }, []);

  const jump = useCallback(() => {
    if (gameState === "playing") {
      gameRef.current.velocity = JUMP_FORCE;
    } else if (gameState === "menu" || gameState === "dead") {
      startGame();
    }
  }, [gameState, startGame]);

  useEffect(() => {
    if (!open || gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const loop = () => {
      const g = gameRef.current;
      if (!g.running) return;

      g.frame++;
      g.velocity += GRAVITY;
      g.planeY += g.velocity;

      // Add pipes
      if (g.frame % PIPE_INTERVAL === 0) {
        const gapY = 80 + Math.random() * (CANVAS_H - 200);
        g.pipes.push({ x: CANVAS_W, gapY, passed: false });
      }

      // Move pipes
      g.pipes.forEach((p) => {
        p.x -= PIPE_SPEED;
        if (!p.passed && p.x + PIPE_WIDTH < 50) {
          p.passed = true;
          g.score++;
          setScore(g.score);
        }
      });
      g.pipes = g.pipes.filter((p) => p.x > -PIPE_WIDTH);

      // Collision
      const planeLeft = 40;
      const planeRight = planeLeft + PLANE_SIZE;
      const planeTop = g.planeY;
      const planeBottom = g.planeY + PLANE_SIZE;

      if (planeTop < 0 || planeBottom > CANVAS_H) {
        g.running = false;
        setGameState("dead");
        setBestScore((prev) => Math.max(prev, g.score));
        saveScore(g.score);
        return;
      }

      for (const p of g.pipes) {
        if (planeRight > p.x && planeLeft < p.x + PIPE_WIDTH) {
          if (planeTop < p.gapY - PIPE_GAP / 2 || planeBottom > p.gapY + PIPE_GAP / 2) {
            g.running = false;
            setGameState("dead");
            setBestScore((prev) => Math.max(prev, g.score));
            saveScore(g.score);
            return;
          }
        }
      }

      // Draw
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      skyGrad.addColorStop(0, "#0a1628");
      skyGrad.addColorStop(1, "#1a2e1a");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      for (let i = 0; i < 30; i++) {
        const sx = (i * 97 + g.frame * 0.2) % CANVAS_W;
        const sy = (i * 53) % CANVAS_H;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Pipes
      g.pipes.forEach((p) => {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        grad.addColorStop(0, "#2d5a2d");
        grad.addColorStop(0.5, "#3a7a3a");
        grad.addColorStop(1, "#2d5a2d");
        ctx.fillStyle = grad;

        // Top pipe
        const topH = p.gapY - PIPE_GAP / 2;
        ctx.fillRect(p.x, 0, PIPE_WIDTH, topH);
        ctx.fillStyle = "#4a9a4a";
        ctx.fillRect(p.x - 3, topH - 20, PIPE_WIDTH + 6, 20);

        // Bottom pipe
        const botY = p.gapY + PIPE_GAP / 2;
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, botY, PIPE_WIDTH, CANVAS_H - botY);
        ctx.fillStyle = "#4a9a4a";
        ctx.fillRect(p.x - 3, botY, PIPE_WIDTH + 6, 20);
      });

      // Plane (triangle/jet shape)
      ctx.save();
      ctx.translate(planeLeft + PLANE_SIZE / 2, g.planeY + PLANE_SIZE / 2);
      const angle = Math.min(Math.max(g.velocity * 3, -30), 45) * (Math.PI / 180);
      ctx.rotate(angle);
      
      // Body
      ctx.fillStyle = "#e0e0e0";
      ctx.beginPath();
      ctx.moveTo(PLANE_SIZE / 2, 0);
      ctx.lineTo(-PLANE_SIZE / 2, -PLANE_SIZE / 3);
      ctx.lineTo(-PLANE_SIZE / 3, 0);
      ctx.lineTo(-PLANE_SIZE / 2, PLANE_SIZE / 3);
      ctx.closePath();
      ctx.fill();
      
      // Wing
      ctx.fillStyle = "#4a9a4a";
      ctx.beginPath();
      ctx.moveTo(-2, -2);
      ctx.lineTo(-PLANE_SIZE / 3, -PLANE_SIZE / 2);
      ctx.lineTo(-PLANE_SIZE / 4, 0);
      ctx.closePath();
      ctx.fill();
      
      // Engine glow
      ctx.fillStyle = `rgba(255, ${150 + Math.random() * 105}, 50, 0.8)`;
      ctx.beginPath();
      ctx.arc(-PLANE_SIZE / 2 - 4, 0, 3 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();

      // Score
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(g.score), CANVAS_W / 2, 45);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [open, gameState, saveScore]);

  // Input handlers
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, jump]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] sm:max-w-[380px] p-3 bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">✈️ Flappy Plane</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
          >
            <Trophy className="w-3.5 h-3.5" />
            {showLeaderboard ? "Spiel" : "Rangliste"}
          </Button>
        </div>

        {showLeaderboard ? (
          <div className="bg-background rounded-lg border border-border p-3 max-h-[400px] overflow-y-auto">
            <h3 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Top 15 Rangliste
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Noch keine Scores</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                      i === 0 ? "bg-yellow-500/10 text-yellow-400" :
                      i === 1 ? "bg-gray-400/10 text-gray-300" :
                      i === 2 ? "bg-orange-500/10 text-orange-400" :
                      "text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-right font-bold tabular-nums">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span className="font-medium">{s.player_name}</span>
                    </span>
                    <span className="font-bold tabular-nums">{s.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="rounded-lg border border-border cursor-pointer w-full"
              onClick={jump}
              onTouchStart={(e) => { e.preventDefault(); jump(); }}
              style={{ maxWidth: CANVAS_W, touchAction: "none" }}
            />

            {gameState === "menu" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
                <p className="text-3xl mb-2">✈️</p>
                <p className="text-primary font-bold text-lg">Flappy Plane</p>
                <p className="text-muted-foreground text-xs mb-4">Tippe oder drücke Leertaste</p>
                <Button onClick={startGame} size="sm" className="gap-1.5">
                  <Play className="w-4 h-4" /> Start
                </Button>
              </div>
            )}

            {gameState === "dead" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
                <p className="text-red-400 font-bold text-lg mb-1">Game Over</p>
                <p className="text-2xl font-bold text-primary tabular-nums mb-1">{score}</p>
                <p className="text-xs text-muted-foreground mb-3">Bester: {Math.max(bestScore, score)}</p>
                <Button onClick={startGame} size="sm" className="gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Nochmal
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

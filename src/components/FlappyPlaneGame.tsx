import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

interface GameScore {
  player_name: string;
  score: number;
  created_at: string;
  user_id?: string;
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

const createAudioContext = () => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch { return null; }
};

const playJumpSound = (ctx: AudioContext | null, vol: number) => {
  if (!ctx || vol === 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
};

const playScoreSound = (ctx: AudioContext | null, vol: number) => {
  if (!ctx || vol === 0) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
};

const playGameOverSound = (ctx: AudioContext | null, vol: number) => {
  if (!ctx || vol === 0) return;
  [200, 150, 100].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
    gain.gain.setValueAtTime(0.1 * vol, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.2);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.2);
  });
};

export const FlappyPlaneGame = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const volumeRef = useRef(0.7);
  const [gameState, setGameState] = useState<"menu" | "playing" | "dead">("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [volume, setVolume] = useState(0.7);

  const gameRef = useRef({
    planeY: CANVAS_H / 2,
    velocity: 0,
    pipes: [] as Pipe[],
    frame: 0,
    score: 0,
    running: false,
  });

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioContext();
    }
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("player_name, score, created_at, user_id")
      .order("score", { ascending: false })
      .limit(15);
    if (data) setLeaderboard(data);
  }, []);

  useEffect(() => {
    if (open) fetchLeaderboard();
  }, [open, fetchLeaderboard]);

  const saveScore = useCallback(async (finalScore: number) => {
    if (!user || finalScore === 0) return;
    const { data: existing } = await supabase
      .from("game_scores")
      .select("id, score")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      if (finalScore > existing[0].score) {
        await supabase
          .from("game_scores")
          .update({ score: finalScore, player_name: profile?.name || "Unbekannt", created_at: new Date().toISOString() })
          .eq("id", existing[0].id);
      }
    } else {
      await supabase.from("game_scores").insert({
        user_id: user.id,
        player_name: profile?.name || "Unbekannt",
        score: finalScore,
      });
    }
    fetchLeaderboard();
  }, [user, profile, fetchLeaderboard]);

  const startGame = useCallback(() => {
    ensureAudio();
    const g = gameRef.current;
    g.planeY = CANVAS_H / 2;
    g.velocity = 0;
    g.pipes = [];
    g.frame = 0;
    g.score = 0;
    g.running = true;
    setScore(0);
    setGameState("playing");
  }, [ensureAudio]);

  const jump = useCallback(() => {
    if (gameState === "playing") {
      gameRef.current.velocity = JUMP_FORCE;
      playJumpSound(audioCtxRef.current, volumeRef.current);
    } else if (gameState === "menu" || gameState === "dead") {
      startGame();
    }
  }, [gameState, startGame]);

  // Keep volumeRef in sync
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

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

      if (g.frame % PIPE_INTERVAL === 0) {
        const gapY = 80 + Math.random() * (CANVAS_H - 200);
        g.pipes.push({ x: CANVAS_W, gapY, passed: false });
      }

      const speedLevel = Math.floor(g.score / 20);
      const speedMultiplier = 1 + speedLevel * 0.15;
      g.pipes.forEach((p) => {
        p.x -= PIPE_SPEED * speedMultiplier;
        if (!p.passed && p.x + PIPE_WIDTH < 50) {
          p.passed = true;
          g.score++;
          setScore(g.score);
          playScoreSound(audioCtxRef.current, volumeRef.current);
        }
      });
      g.pipes = g.pipes.filter((p) => p.x > -PIPE_WIDTH);

      const planeLeft = 40;
      const planeRight = planeLeft + PLANE_SIZE;
      const planeTop = g.planeY;
      const planeBottom = g.planeY + PLANE_SIZE;

      const die = () => {
        g.running = false;
        setGameState("dead");
        setBestScore((prev) => Math.max(prev, g.score));
        saveScore(g.score);
        playGameOverSound(audioCtxRef.current, volumeRef.current);
      };

      if (planeTop < 0 || planeBottom > CANVAS_H) { die(); return; }

      for (const p of g.pipes) {
        if (planeRight > p.x && planeLeft < p.x + PIPE_WIDTH) {
          if (planeTop < p.gapY - PIPE_GAP / 2 || planeBottom > p.gapY + PIPE_GAP / 2) {
            die(); return;
          }
        }
      }

      // Draw
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      skyGrad.addColorStop(0, "#0a1628");
      skyGrad.addColorStop(1, "#1a2e1a");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      for (let i = 0; i < 30; i++) {
        const sx = (i * 97 + g.frame * 0.2) % CANVAS_W;
        const sy = (i * 53) % CANVAS_H;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      g.pipes.forEach((p) => {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        grad.addColorStop(0, "#2d5a2d");
        grad.addColorStop(0.5, "#3a7a3a");
        grad.addColorStop(1, "#2d5a2d");
        ctx.fillStyle = grad;
        const topH = p.gapY - PIPE_GAP / 2;
        ctx.fillRect(p.x, 0, PIPE_WIDTH, topH);
        ctx.fillStyle = "#4a9a4a";
        ctx.fillRect(p.x - 3, topH - 20, PIPE_WIDTH + 6, 20);
        const botY = p.gapY + PIPE_GAP / 2;
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, botY, PIPE_WIDTH, CANVAS_H - botY);
        ctx.fillStyle = "#4a9a4a";
        ctx.fillRect(p.x - 3, botY, PIPE_WIDTH + 6, 20);
      });

      ctx.save();
      ctx.translate(planeLeft + PLANE_SIZE / 2, g.planeY + PLANE_SIZE / 2);
      const angle = Math.min(Math.max(g.velocity * 3, -30), 45) * (Math.PI / 180);
      ctx.rotate(angle);
      ctx.fillStyle = "#e0e0e0";
      ctx.beginPath();
      ctx.moveTo(PLANE_SIZE / 2, 0);
      ctx.lineTo(-PLANE_SIZE / 2, -PLANE_SIZE / 3);
      ctx.lineTo(-PLANE_SIZE / 3, 0);
      ctx.lineTo(-PLANE_SIZE / 2, PLANE_SIZE / 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#4a9a4a";
      ctx.beginPath();
      ctx.moveTo(-2, -2);
      ctx.lineTo(-PLANE_SIZE / 3, -PLANE_SIZE / 2);
      ctx.lineTo(-PLANE_SIZE / 4, 0);
      ctx.closePath();
      ctx.fill();
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

      // Speed level indicator
      if (speedLevel > 0) {
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "right";
        const levelColor = speedLevel >= 5 ? "#ff4444" : speedLevel >= 3 ? "#ffaa00" : "#44ff44";
        ctx.fillStyle = levelColor;
        ctx.fillText(`⚡ SPD ${speedLevel + 1}`, CANVAS_W - 10, 25);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [open, gameState, saveScore]);

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

  const currentUserRank = user
    ? leaderboard.findIndex((s) => s.user_id === user.id)
    : -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] sm:max-w-[380px] p-3 bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">✈️ Flappy Plane</h2>
          <div className="flex items-center gap-2">
            {/* Volume control */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setVolume(v => v === 0 ? 0.7 : 0)} className="text-muted-foreground hover:text-foreground transition-colors">
                {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                min={0}
                max={1}
                step={0.1}
                className="w-16"
              />
            </div>
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
        </div>

        {showLeaderboard ? (
          <div className="bg-background rounded-lg border border-border p-3 max-h-[400px] overflow-y-auto">
            <h3 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Top 15 Rangliste
            </h3>
            {currentUserRank >= 0 && (
              <p className="text-xs text-muted-foreground mb-2 bg-primary/10 rounded px-2 py-1">
                📍 Deine beste Position: <span className="font-bold text-primary">#{currentUserRank + 1}</span>
              </p>
            )}
            {leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Noch keine Scores</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                      user && s.user_id === user.id ? "ring-1 ring-primary/50 " : ""
                    }${
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
                      <span className="flex flex-col">
                        <span className="font-medium">{s.player_name}</span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {format(new Date(s.created_at), "dd.MM.yy HH:mm", { locale: de })}
                        </span>
                      </span>
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
                <p className="text-destructive font-bold text-lg mb-1">Game Over</p>
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

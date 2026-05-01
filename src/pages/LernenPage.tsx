import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowRight, RotateCcw, Trash2, Check, X, BookOpen, Video } from "lucide-react";
import { toast } from "sonner";

const LernenPage = () => {
  const { role } = useAuth();
  const canManage = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">📚 Lernzentrum</h1>
      <p className="text-sm text-muted-foreground">Karteikarten, Quiz-Modus und Video-Tutorials zur Theorie-Vorbereitung.</p>

      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="cards"><BookOpen className="w-4 h-4 mr-1" /> Karteikarten</TabsTrigger>
          <TabsTrigger value="quiz">⚡ Quiz</TabsTrigger>
          <TabsTrigger value="videos"><Video className="w-4 h-4 mr-1" /> Videos</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="mt-4"><FlashcardsTab canManage={canManage} /></TabsContent>
        <TabsContent value="quiz" className="mt-4"><QuizTab /></TabsContent>
        <TabsContent value="videos" className="mt-4"><VideosTab canManage={canManage} /></TabsContent>
      </Tabs>
    </div>
  );
};

/* ========== Karteikarten Tab ========== */
const FlashcardsTab = ({ canManage }: { canManage: boolean }) => {
  const [source, setSource] = useState<"theory" | "custom">("custom");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const { user } = useAuth();

  const { data: customCards, refetch: refetchCustom } = useQuery({
    queryKey: ["flashcards-custom"],
    queryFn: async () => {
      const { data } = await supabase.from("flashcards").select("*").eq("is_active", true).order("sort_order");
      return (data || []).map((c: any) => ({ id: c.id, front: c.front, back: c.back, image_url: c.image_url }));
    },
  });
  const { data: theoryCards } = useQuery({
    queryKey: ["flashcards-theory"],
    queryFn: async () => {
      const { data } = await supabase.from("theory_exam_questions").select("*").order("sort_order");
      return (data || []).map((q: any) => ({ id: q.id, front: q.question, back: q.solution || "(keine Lösung)", image_url: q.image_url }));
    },
  });

  const cards = source === "custom" ? customCards : theoryCards;
  const card = cards?.[index];

  const next = () => { setFlipped(false); setIndex((i) => (cards && cards.length ? (i + 1) % cards.length : 0)); };
  const reset = () => { setFlipped(false); setIndex(0); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant={source === "custom" ? "default" : "outline"} onClick={() => { setSource("custom"); reset(); }}>Eigene Karten ({customCards?.length ?? 0})</Button>
        <Button size="sm" variant={source === "theory" ? "default" : "outline"} onClick={() => { setSource("theory"); reset(); }}>Theorie-Fragen ({theoryCards?.length ?? 0})</Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> Reset</Button>
          {canManage && source === "custom" && (
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Neue Karte</Button></DialogTrigger>
              <DialogContent><AddCardForm onDone={() => { setShowAdd(false); refetchCustom(); }} userId={user?.id} /></DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!card ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Keine Karten vorhanden.</CardContent></Card>
      ) : (
        <>
          <div className="text-xs text-muted-foreground text-center">Karte {index + 1} / {cards!.length}</div>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="w-full max-w-2xl mx-auto block aspect-[3/2] rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card to-card/60 p-6 sm:p-10 shadow-xl hover:scale-[1.01] transition-transform text-left"
          >
            <p className="text-[10px] uppercase tracking-widest text-primary mb-4">{flipped ? "Antwort" : "Frage"}</p>
            {card.image_url && <img src={card.image_url} alt="" className="max-h-32 mb-3 rounded" />}
            <p className="text-base sm:text-xl font-medium whitespace-pre-wrap">{flipped ? card.back : card.front}</p>
            <p className="text-xs text-muted-foreground mt-6">Klick zum {flipped ? "Umdrehen" : "Aufdecken"}</p>
          </button>
          <div className="flex justify-center gap-2">
            <Button onClick={next}><ArrowRight className="w-4 h-4 mr-1" /> Nächste Karte</Button>
          </div>

          {canManage && source === "custom" && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-primary mb-2">Verwaltung – alle eigenen Karten</h3>
              <div className="space-y-1 max-h-80 overflow-auto">
                {customCards?.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 bg-card border border-border rounded text-xs">
                    <span className="flex-1 truncate">{c.front}</span>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm("Wirklich löschen?")) return;
                      await supabase.from("flashcards").delete().eq("id", c.id);
                      refetchCustom();
                    }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AddCardForm = ({ onDone, userId }: { onDone: () => void; userId?: string }) => {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const submit = async () => {
    if (!front.trim() || !back.trim()) return toast.error("Bitte beide Seiten ausfüllen.");
    const { error } = await supabase.from("flashcards").insert({ front, back, category, created_by: userId });
    if (error) return toast.error("Fehler: " + error.message);
    toast.success("Karte hinzugefügt.");
    onDone();
  };
  return (
    <>
      <DialogHeader><DialogTitle>Neue Karteikarte</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-2">
        <div><Label>Vorderseite (Frage)</Label><Textarea value={front} onChange={(e) => setFront(e.target.value)} rows={3} /></div>
        <div><Label>Rückseite (Antwort)</Label><Textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} /></div>
        <div><Label>Kategorie</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <Button className="w-full" onClick={submit}>Speichern</Button>
      </div>
    </>
  );
};

/* ========== Quiz Tab ========== */
const QuizTab = () => {
  const { data: questions } = useQuery({
    queryKey: ["quiz-questions"],
    queryFn: async () => {
      const { data } = await supabase.from("theory_exam_questions").select("*");
      return data || [];
    },
  });
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const shuffled = useMemo(() => (questions ? [...questions].sort(() => Math.random() - 0.5) : []), [questions]);
  const q = shuffled[idx];

  const check = () => {
    if (!q) return;
    const correct = (q.solution || "").trim().toLowerCase() && answer.trim().toLowerCase().includes((q.solution || "").trim().toLowerCase().substring(0, 8));
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setRevealed(true);
  };
  const nextQ = () => { setRevealed(false); setAnswer(""); setIdx((i) => (i + 1) % shuffled.length); };

  if (!q) return <Card><CardContent className="py-12 text-center text-muted-foreground">Keine Quiz-Fragen vorhanden.</CardContent></Card>;

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Frage {idx + 1} / {shuffled.length}</span>
        <span>Score: <strong className="text-primary">{score.correct}</strong> / {score.total}</span>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          {q.image_url && <img src={q.image_url} alt="" className="max-h-40 rounded" />}
          <p className="text-base sm:text-lg font-medium whitespace-pre-wrap">{q.question}</p>
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Deine Antwort…" disabled={revealed} rows={3} />
          {!revealed ? (
            <Button className="w-full" onClick={check}>Antwort prüfen</Button>
          ) : (
            <div className="space-y-2">
              <div className="p-3 rounded bg-primary/10 border border-primary/30">
                <p className="text-xs uppercase text-primary mb-1">Lösung</p>
                <p className="text-sm whitespace-pre-wrap">{q.solution || "(keine Musterlösung hinterlegt)"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setScore((s) => ({ ...s, correct: s.correct - 1 }))}><X className="w-4 h-4 mr-1 text-red-400" /> Falsch</Button>
                <Button variant="outline" className="flex-1" onClick={() => setScore((s) => ({ ...s, correct: s.correct + 1 }))}><Check className="w-4 h-4 mr-1 text-emerald-400" /> Richtig</Button>
                <Button className="flex-1" onClick={nextQ}>Nächste</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ========== Videos Tab ========== */
const VideosTab = ({ canManage }: { canManage: boolean }) => {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const { data: videos, refetch } = useQuery({
    queryKey: ["video-tutorials"],
    queryFn: async () => {
      const { data } = await supabase.from("video_tutorials").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const getEmbed = (url: string) => {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Video hinzufügen</Button></DialogTrigger>
            <DialogContent><AddVideoForm onDone={() => { setShowAdd(false); refetch(); }} userId={user?.id} /></DialogContent>
          </Dialog>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {videos?.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">Noch keine Videos vorhanden.</p>}
        {videos?.map((v: any) => (
          <Card key={v.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <span className="truncate">{v.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{v.category}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full rounded overflow-hidden bg-black">
                <iframe src={getEmbed(v.youtube_url)} title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
              </div>
              {v.description && <p className="text-xs text-muted-foreground mt-2">{v.description}</p>}
              {canManage && (
                <Button size="sm" variant="ghost" className="mt-2 text-red-400" onClick={async () => {
                  if (!confirm("Video löschen?")) return;
                  await supabase.from("video_tutorials").delete().eq("id", v.id);
                  refetch();
                }}><Trash2 className="w-3 h-3 mr-1" /> Löschen</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AddVideoForm = ({ onDone, userId }: { onDone: () => void; userId?: string }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Allgemein");
  const submit = async () => {
    if (!title.trim() || !url.trim()) return toast.error("Titel und YouTube-Link sind Pflicht.");
    const { error } = await supabase.from("video_tutorials").insert({ title, description, youtube_url: url, category, created_by: userId });
    if (error) return toast.error("Fehler: " + error.message);
    toast.success("Video hinzugefügt.");
    onDone();
  };
  return (
    <>
      <DialogHeader><DialogTitle>Neues Video</DialogTitle></DialogHeader>
      <div className="space-y-3 mt-2">
        <div><Label>Titel</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>YouTube-Link</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></div>
        <div><Label>Kategorie</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <div><Label>Beschreibung</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <Button className="w-full" onClick={submit}>Speichern</Button>
      </div>
    </>
  );
};

export default LernenPage;
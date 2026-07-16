import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invokeEdgeFunction } from "@/lib/supabaseFunctions";
import { logActivity } from "@/lib/activityLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronRight, Archive, CheckCircle2, ShieldAlert } from "lucide-react";

const PARAGRAPHS = [
  "§1. Arbeitsmoral",
  "§2. Mitnahme von Zivilisten",
  "§3. Tragen der Unit-Kleidung",
  "§4. Unerlaubtes Helikopter-Tuning",
  "§5. A.S.D. Gunner-Regelung",
  "§6. Teamverhalten",
  "§7. Abmeldungen",
  "§8. Verstöße im Flugverhalten",
  "§8.1 Gefährdung der Bodenkräfte durch unsachgemäße Flughöhe",
  "§8.2 Missachtung von Flugverbotszonen",
  "§8.3 Falsche Zielübermittlung",
  "§8.4 Unnötiges Kreisen über Einsatzorten",
  "§8.5 Fehlende Kommunikation",
  "§8.6 Unprofessionelles Verhalten im Luftfahrzeug",
  "§8.7 Landung in unzulässigen Bereichen",
  "§8.8 Unsichere Flugmanöver während einem Einsatz",
  "§8.9 Missbrauch der Bordkamera",
  "§8.10 Falsche Landung an Polizeistationen",
  "§8.11 Verlust des Luftfahrzeugs durch Fahrlässigkeit",
  "§8.12 Verstoß gegen Mindestbesatzung",
  "§9. Schlussregeln",
];

const SCHLUSSREGELN = "§9. Schlussregeln";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("de-DE");
}

function fmtAmount(n: number) {
  return `$${Math.round(n).toLocaleString("de-DE")}`;
}

const SanktionenPage = () => {
  const { role, user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isDirection = role === "director" || role === "co_director";

  const [showForm, setShowForm] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [schlussregelnText, setSchlussregelnText] = useState("");
  const [zeugen, setZeugen] = useState("");
  const [von, setVon] = useState(todayStr());
  const [bis, setBis] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [notiz, setNotiz] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [archiveOpen, setArchiveOpen] = useState(false);

  const toggle = (id: string) => setOpenIds((p) => ({ ...p, [id]: !p[id] }));

  const { data: members } = useQuery({
    queryKey: ["sanktionen-members"],
    enabled: isDirection,
    queryFn: async () => {
      const [{ data: profiles }, { data: priv }] = await Promise.all([
        supabase.from("profiles").select("id, name, dienstnummer").eq("is_approved", true).order("name"),
        supabase.from("profiles_private").select("user_id, discord_id"),
      ]);
      const discordMap: Record<string, string> = {};
      for (const p of priv || []) if (p.discord_id) discordMap[p.user_id] = p.discord_id;
      return (profiles || []).map((p) => ({ ...p, discord_id: discordMap[p.id] ?? null }));
    },
  });

  const { data: ownDiscordId } = useQuery({
    queryKey: ["sanktionen-own-discord", user?.id],
    enabled: isDirection && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles_private").select("discord_id").eq("user_id", user!.id).maybeSingle();
      return data?.discord_id ?? null;
    },
  });

  const { data: sanctions, isLoading } = useQuery({
    queryKey: ["sanctions"],
    enabled: isDirection,
    queryFn: async () => {
      const { data, error } = await supabase.from("sanctions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setTargetUserId(""); setParagraph(""); setSchlussregelnText(""); setZeugen("");
    setVon(todayStr()); setBis(todayStr()); setAmount(""); setNotiz("");
    setShowForm(false);
  };

  const isSchlussregeln = paragraph === SCHLUSSREGELN;

  const issueSanction = useMutation({
    mutationFn: async () => {
      const target = members?.find((m) => m.id === targetUserId);
      if (!target) throw new Error("Bitte ein Mitglied auswählen");
      if (!paragraph) throw new Error("Bitte einen Grund auswählen");
      if (isSchlussregeln && !schlussregelnText.trim()) throw new Error("Bitte den individuellen Verstoß beschreiben");
      const amountNum = Number(amount.replace(/\./g, "").replace(",", "."));
      if (!amountNum || amountNum <= 0) throw new Error("Bitte eine gültige Sanktionshöhe eintragen");

      const finalParagraph = isSchlussregeln ? `${paragraph}: ${schlussregelnText.trim()}` : paragraph;

      const { data, error } = await supabase
        .from("sanctions")
        .insert({
          target_user_id: target.id,
          target_name: target.name,
          target_dienstnummer: target.dienstnummer,
          target_discord_id: target.discord_id,
          paragraph: finalParagraph,
          zeugen: zeugen || null,
          tatzeitraum_start: von,
          tatzeitraum_end: bis,
          amount: amountNum,
          notiz: notiz || null,
          issued_by: user!.id,
          issued_by_name: profile?.name || "Direction",
          issued_by_discord_id: ownDiscordId || null,
        })
        .select()
        .single();
      if (error) throw error;

      try {
        await invokeEdgeFunction(supabase, "discord-send-sanction", { sanction_id: data.id });
      } catch (e: any) {
        toast.error(`Sanktion gespeichert, aber Discord-Versand fehlgeschlagen: ${e.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sanctions"] });
      toast.success("Sanktion ausgestellt");
      logActivity("Sanktion ausgestellt", "sanktion", { sanction_id: data.id, target: data.target_name, paragraph: data.paragraph, amount: data.amount });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sanctions").update({ status: "bezahlt", paid_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["sanctions"] });
      toast.success("Als bezahlt markiert");
      logActivity("Sanktion als bezahlt markiert", "sanktion", { sanction_id: id });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSanction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sanctions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["sanctions"] });
      toast.success("Gelöscht");
      logActivity("Sanktion gelöscht", "sanktion", { sanction_id: id });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { open: openSanctions, paid: paidSanctions } = useMemo(() => {
    const open = (sanctions || []).filter((s) => s.status === "offen");
    const paid = (sanctions || []).filter((s) => s.status === "bezahlt");
    return { open, paid };
  }, [sanctions]);

  if (!isDirection) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Kein Zugriff</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Dieser Bereich ist ausschließlich der Direction (Director / Co-Director) vorbehalten.
        </p>
      </div>
    );
  }

  const renderRow = (s: any) => {
    const isOpen = !!openIds[s.id];
    const overdue = s.status === "offen" && new Date(s.due_at).getTime() < Date.now();
    return (
      <Collapsible key={s.id} open={isOpen} onOpenChange={() => toggle(s.id)}>
        <div className={`bg-card border rounded-lg overflow-hidden transition-colors ${
          overdue ? "border-destructive/40" : s.status === "bezahlt" ? "border-border opacity-80" : "border-border"
        }`}>
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 flex items-center gap-3 hover:bg-primary/[0.03] transition-colors text-left">
              <div className="shrink-0">
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 md:gap-4 items-center">
                <p className="font-semibold text-foreground truncate">{s.target_name}{s.target_dienstnummer ? ` (#${s.target_dienstnummer})` : ""}</p>
                <p className="text-xs text-muted-foreground truncate">{s.paragraph}</p>
                <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(s.tatzeitraum_start)}{s.tatzeitraum_start !== s.tatzeitraum_end ? ` – ${fmtDate(s.tatzeitraum_end)}` : ""}</span>
                <span className="font-semibold text-sm tabular-nums">{fmtAmount(Number(s.amount))}</span>
                <span className={`justify-self-start md:justify-self-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.status === "bezahlt" ? "bg-emerald-500/15 text-emerald-500" : overdue ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-500"
                }`}>
                  {s.status === "bezahlt" ? "Bezahlt" : overdue ? "Überfällig" : "Offen"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {s.status === "offen" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markPaid.mutate(s.id); }}
                    className="text-muted-foreground hover:text-emerald-500 transition-colors p-1.5 rounded"
                    aria-label="Als bezahlt markieren"
                    title="Als bezahlt markieren"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSanction.mutate(s.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded"
                  aria-label="Löschen"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-1 border-t border-border/50 ml-7 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Zeugen:</span> {s.zeugen || "-"}</p>
              <p><span className="text-muted-foreground">Ausgeführt von:</span> {s.issued_by_name}</p>
              <p><span className="text-muted-foreground">Fällig bis:</span> {fmtDate(s.due_at)}</p>
              {s.paid_at && <p><span className="text-muted-foreground">Bezahlt am:</span> {fmtDate(s.paid_at)}</p>}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Notiz</p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background/50 border border-border/50 rounded-md p-3">
                  {s.notiz || "Keine Notiz hinterlegt."}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Sanktionen</h1>
            <p className="text-xs text-muted-foreground">{openSanctions.length} offen · {paidSanctions.length} bezahlt</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {showForm ? "Abbrechen" : "Sanktion ausstellen"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-destructive/20 rounded-lg p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Mitarbeiter/in</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger className="mt-1.5 bg-background border-border"><SelectValue placeholder="Mitglied auswählen..." /></SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}{m.dienstnummer ? ` (#${m.dienstnummer})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grund</Label>
              <Select value={paragraph} onValueChange={setParagraph}>
                <SelectTrigger className="mt-1.5 bg-background border-border"><SelectValue placeholder="Paragraph auswählen..." /></SelectTrigger>
                <SelectContent>
                  {PARAGRAPHS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isSchlussregeln && (
            <div className="animate-in slide-in-from-top-1 duration-150">
              <Label>Individueller Verstoß (freie Beschreibung)</Label>
              <Textarea
                className="mt-1.5 bg-background border-border"
                placeholder="Beschreibe den Verstoß, der nicht unter §1-§8 fällt..."
                value={schlussregelnText}
                onChange={(e) => setSchlussregelnText(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                §9 erlaubt der Unitleitung, nicht aufgeführte Verstöße individuell zu bewerten. Diese Beschreibung erscheint als „Grund" in der Discord-Nachricht.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Tatzeitraum von</Label><Input type="date" className="mt-1.5 bg-background border-border" value={von} onChange={(e) => setVon(e.target.value)} /></div>
            <div><Label>Tatzeitraum bis</Label><Input type="date" className="mt-1.5 bg-background border-border" value={bis} onChange={(e) => setBis(e.target.value)} /></div>
            <div><Label>Sanktion ($)</Label><Input type="text" inputMode="numeric" placeholder="z. B. 35000" className="mt-1.5 bg-background border-border" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>

          <div><Label>Zeugen (optional)</Label><Input className="mt-1.5 bg-background border-border" placeholder="Name(n) der Zeugen..." value={zeugen} onChange={(e) => setZeugen(e.target.value)} /></div>
          <div><Label>Notiz / Begründung</Label><Textarea className="mt-1.5 bg-background border-border" placeholder="Kurze Begründung, warum die Sanktion vergeben wurde..." value={notiz} onChange={(e) => setNotiz(e.target.value)} /></div>

          <p className="text-xs text-muted-foreground">
            Die Sanktion wird automatisch in den Discord-Channel für Sanktionen sowie eine kurze Begründung in den Begründungs-Channel gepostet. Bei Nichtzahlung erfolgt am 6. Tag automatisch eine Erinnerung an das Mitglied und die Direction.
          </p>

          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => issueSanction.mutate()}
              disabled={issueSanction.isPending || !targetUserId || !paragraph || !amount || (isSchlussregeln && !schlussregelnText.trim())}
            >
              Sanktion aussprechen
            </Button>
          </div>
        </div>
      )}


      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade...</div></div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {openSanctions.map(renderRow)}
            {openSanctions.length === 0 && <p className="text-center text-muted-foreground py-8">Keine offenen Sanktionen</p>}
          </div>

          {paidSanctions.length > 0 && (
            <Collapsible open={archiveOpen} onOpenChange={setArchiveOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-primary/[0.03] transition-colors text-left">
                  {archiveOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <Archive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Bezahlte Sanktionen</span>
                  <span className="text-xs text-muted-foreground">({paidSanctions.length})</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 mt-3 pl-2 border-l-2 border-border/50">
                  {paidSanctions.map(renderRow)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
};

export default SanktionenPage;

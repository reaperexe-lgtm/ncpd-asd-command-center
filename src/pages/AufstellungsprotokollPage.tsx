import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Plus, Trash2, FileText, Save, ChevronDown, Clock, User } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import asdLogoFull from "@/assets/asd-logo-full.png";
import heliWatermark from "@/assets/heli-watermark.png";

const ROLE_DISPLAY: Record<string, { label: string; order: number }> = {
  director: { label: "Direction", order: 1 },
  co_director: { label: "Co.Direction", order: 2 },
  admin: { label: "Admin", order: 3 },
  supervisor: { label: "Supervisor", order: 4 },
  ausbilder: { label: "Ausbilder", order: 5 },
  trial_ausbilder: { label: "Trial Ausbilder", order: 6 },
  member: { label: "Mitglied", order: 7 },
  trial_member: { label: "Trial Member", order: 8 },
};

type AttendanceStatus = "Anwesend" | "Abgemeldet" | "Im Einsatz";

interface MemberAttendance {
  id: string;
  name: string;
  dienstnummer: string | null;
  role: string;
  roleLabel: string;
  roleOrder: number;
  status: AttendanceStatus;
}

interface ProtocolSection {
  id: string;
  title: string;
  content: string;
}

const AufstellungsprotokollPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const protocolRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingProtocol, setViewingProtocol] = useState<any | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const [titel, setTitel] = useState("Air Support Division");
  const [untertitel, setUntertitel] = useState("Narco City Police Department");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [uhrzeit, setUhrzeit] = useState(
    new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr"
  );
  const [protokollfuehrer, setProtokollfuehrer] = useState("");
  const [sections, setSections] = useState<ProtocolSection[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const { data: members = [] } = useQuery({
    queryKey: ["protocol-members"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer, is_approved")
        .eq("is_approved", true);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      if (!profiles || !roles) return [];
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      return profiles
        .filter((p) => {
          const role = roleMap.get(p.id);
          return role && role !== "asd_applicant" && role !== "admin";
        })
        .map((p) => {
          const role = roleMap.get(p.id) || "member";
          const rd = ROLE_DISPLAY[role] || { label: role, order: 99 };
          return { id: p.id, name: p.name, dienstnummer: p.dienstnummer, role, roleLabel: rd.label, roleOrder: rd.order };
        })
        .sort((a, b) => a.roleOrder - b.roleOrder);
    },
  });

  const [attendance, setAttendance] = useState<MemberAttendance[]>([]);

  useEffect(() => {
    if (members.length > 0) {
      setAttendance((prev) => {
        const existingMap = new Map(prev.map((a) => [a.id, a.status]));
        return members.map((m) => ({
          ...m,
          status: existingMap.get(m.id) || (onlineUserIds.has(m.id) ? "Anwesend" : "Abgemeldet"),
        }));
      });
    }
  }, [members, onlineUserIds]);

  useEffect(() => {
    if (user && members.length > 0) {
      const me = members.find((m) => m.id === user.id);
      if (me && !protokollfuehrer) setProtokollfuehrer(me.name);
    }
  }, [user, members]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("protocol-presence", { config: { presence: { key: user.id } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineUserIds(new Set<string>(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: user.id });
      });
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateAttendanceStatus = (memberId: string, status: AttendanceStatus) => {
    setAttendance((prev) => prev.map((a) => (a.id === memberId ? { ...a, status } : a)));
  };

  const addSection = () => {
    setSections((prev) => [...prev, { id: crypto.randomUUID(), title: "", content: "" }]);
  };

  const updateSection = (id: string, field: "title" | "content", value: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const statusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "Anwesend": return "bg-green-600 text-white";
      case "Abgemeldet": return "bg-orange-500 text-white";
      case "Im Einsatz": return "bg-blue-600 text-white";
    }
  };

  const groupedAttendance = () => {
    const groups: { role: string; members: MemberAttendance[] }[] = [];
    let currentRole = "";
    attendance.forEach((m) => {
      if (m.roleLabel !== currentRole) {
        currentRole = m.roleLabel;
        groups.push({ role: currentRole, members: [m] });
      } else {
        groups[groups.length - 1].members.push(m);
      }
    });
    return groups;
  };

  // Fetch saved protocols
  const { data: savedProtocols = [] } = useQuery({
    queryKey: ["formation-protocols"],
    queryFn: async () => {
      const { data } = await supabase
        .from("formation_protocols")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const deleteProtocol = async (id: string) => {
    if (!confirm("Möchtest du dieses Protokoll wirklich löschen?")) return;
    try {
      const { error } = await supabase.from("formation_protocols").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["formation-protocols"] });
      if (viewingProtocol?.id === id) setViewingProtocol(null);
      toast.success("Protokoll gelöscht");
    } catch (err: any) {
      toast.error("Fehler beim Löschen: " + err.message);
    }
  };

  const saveProtocol = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("formation_protocols").insert({
        titel,
        untertitel,
        datum,
        uhrzeit,
        protokollfuehrer,
        ort: "Dach Police Department",
        sections: sections as any,
        attendance: attendance.map((a) => ({
          name: a.name,
          dienstnummer: a.dienstnummer,
          roleLabel: a.roleLabel,
          status: a.status,
        })) as any,
        created_by: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["formation-protocols"] });
      toast.success("Aufstellungsprotokoll gespeichert!");
    } catch (err: any) {
      toast.error("Fehler beim Speichern: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!protocolRef.current) return;
    setGenerating(true);
    try {
      const el = protocolRef.current;
      el.style.display = "block";
      await new Promise((r) => setTimeout(r, 500));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position -= 297;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= 297;
      }

      pdf.save(`Aufstellungsprotokoll_${formatDate(datum)}.pdf`);
      toast.success("PDF wurde erstellt!");
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Erstellen der PDF");
    } finally {
      if (protocolRef.current) protocolRef.current.style.display = "none";
      setGenerating(false);
    }
  };

  const [savedPdfData, setSavedPdfData] = useState<{
    titel: string; untertitel: string; datum: string; uhrzeit: string;
    protokollfuehrer: string; sections: ProtocolSection[];
    attendance: MemberAttendance[];
  } | null>(null);

  const generatePDFFromSaved = async (protocol: any) => {
    // Temporarily override state for PDF rendering
    const savedAttendance: MemberAttendance[] = ((protocol.attendance as any[]) || []).map((a: any, i: number) => ({
      id: `saved-${i}`,
      name: a.name,
      dienstnummer: a.dienstnummer || null,
      role: "",
      roleLabel: a.roleLabel || "",
      roleOrder: i,
      status: a.status || "Anwesend",
    }));
    const savedSections: ProtocolSection[] = ((protocol.sections as any[]) || []).map((s: any, i: number) => ({
      id: `saved-${i}`,
      title: s.title || "",
      content: s.content || "",
    }));

    // Store current state
    const prevTitel = titel, prevUntertitel = untertitel, prevDatum = datum;
    const prevUhrzeit = uhrzeit, prevProtokollfuehrer = protokollfuehrer;
    const prevSections = sections, prevAttendance = attendance;

    // Set saved protocol data
    setTitel(protocol.titel);
    setUntertitel(protocol.untertitel || "");
    setDatum(protocol.datum);
    setUhrzeit(protocol.uhrzeit);
    setProtokollfuehrer(protocol.protokollfuehrer);
    setSections(savedSections);
    setAttendance(savedAttendance);

    // Wait for re-render then generate
    await new Promise((r) => setTimeout(r, 100));
    await generatePDF();

    // Restore state
    setTitel(prevTitel);
    setUntertitel(prevUntertitel);
    setDatum(prevDatum);
    setUhrzeit(prevUhrzeit);
    setProtokollfuehrer(prevProtokollfuehrer);
    setSections(prevSections);
    setAttendance(prevAttendance);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Aufstellungsprotokoll
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveProtocol} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Speichern..." : "Speichern"}
          </Button>
          <Button onClick={generatePDF} disabled={generating} className="gap-2">
            <Download className="w-4 h-4" />
            {generating ? "Wird erstellt..." : "PDF Download"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Protokoll-Informationen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Überschrift</Label><Input value={titel} onChange={(e) => setTitel(e.target.value)} /></div>
          <div><Label>Untertitel</Label><Input value={untertitel} onChange={(e) => setUntertitel(e.target.value)} /></div>
          <div><Label>Datum</Label><Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
          <div><Label>Uhrzeit</Label><Input value={uhrzeit} onChange={(e) => setUhrzeit(e.target.value)} /></div>
          <div><Label>Protokollführer</Label><Input value={protokollfuehrer} onChange={(e) => setProtokollfuehrer(e.target.value)} /></div>
          <div><Label>Ort</Label><Input value="Dach Police Department" disabled className="opacity-70" /></div>
        </div>
      </div>

      {/* Attendance */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">1. Anwesenheit</h2>
        <p className="text-sm text-muted-foreground">
          Aktuell online: {onlineUserIds.size} Mitglieder — Online-Mitglieder werden automatisch als "Anwesend" markiert.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground font-medium">Name</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Position</th>
                <th className="text-left p-2 text-muted-foreground font-medium">Anwesenheit</th>
              </tr>
            </thead>
            <tbody>
              {groupedAttendance().map((group, gi) => (
                <>
                  {group.members.map((m, mi) => (
                    <tr key={m.id} className={`border-b border-border/50 ${mi === 0 && gi > 0 ? "border-t-2 border-t-border" : ""}`}>
                      <td className="p-2 text-foreground">
                        {m.dienstnummer ? `[${m.dienstnummer}] ` : ""}{m.name}
                      </td>
                      <td className="p-2 text-foreground">{m.roleLabel}</td>
                      <td className="p-2">
                        <select
                          value={m.status}
                          onChange={(e) => updateAttendanceStatus(m.id, e.target.value as AttendanceStatus)}
                          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${statusColor(m.status)}`}
                        >
                          <option value="Anwesend">Anwesend ✓</option>
                          <option value="Abgemeldet">Abgemeldet ✗</option>
                          <option value="Im Einsatz">Im Einsatz</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sections */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Absätze / Tagesordnungspunkte</h2>
          <Button variant="outline" size="sm" onClick={addSection} className="gap-1">
            <Plus className="w-4 h-4" /> Absatz hinzufügen
          </Button>
        </div>
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Noch keine Absätze hinzugefügt.</p>
        )}
        {sections.map((s, i) => (
          <div key={s.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground font-medium">Absatz {i + 2}</Label>
              <Button variant="ghost" size="sm" onClick={() => removeSection(s.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input placeholder="Überschrift des Absatzes" value={s.title} onChange={(e) => updateSection(s.id, "title", e.target.value)} />
            <Textarea placeholder="Inhalt..." value={s.content} onChange={(e) => updateSection(s.id, "content", e.target.value)} rows={4} />
          </div>
        ))}
      </div>

      {/* Saved Protocols */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Gespeicherte Protokolle ({savedProtocols.length})
          </h2>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showSaved ? "rotate-180" : ""}`} />
        </button>

        {showSaved && (
          <div className="space-y-3">
            {savedProtocols.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Noch keine Protokolle gespeichert.</p>
            ) : (
              savedProtocols.map((p) => (
                <div key={p.id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewingProtocol(viewingProtocol?.id === p.id ? null : p)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.titel}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(p.datum).toLocaleDateString("de-DE")} · {p.uhrzeit}
                          <span className="text-muted-foreground/50">·</span>
                          <User className="w-3 h-3" />
                          {p.protokollfuehrer}
                        </p>
                      </div>
                    </div>
                   <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          generatePDFFromSaved(p);
                        }}
                        disabled={generating}
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${viewingProtocol?.id === p.id ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {viewingProtocol?.id === p.id && (
                    <div className="border-t border-border px-4 py-4 space-y-4 bg-secondary/10">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Untertitel:</span> <span className="text-foreground">{p.untertitel || "–"}</span></div>
                        <div><span className="text-muted-foreground">Ort:</span> <span className="text-foreground">{p.ort}</span></div>
                      </div>

                      {/* Attendance */}
                      {(p.attendance as any[])?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-2">Anwesenheit</h3>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left p-1.5 text-muted-foreground">Name</th>
                                <th className="text-left p-1.5 text-muted-foreground">Position</th>
                                <th className="text-left p-1.5 text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(p.attendance as any[]).map((a: any, i: number) => (
                                <tr key={i} className="border-b border-border/30">
                                  <td className="p-1.5 text-foreground">{a.dienstnummer ? `[${a.dienstnummer}] ` : ""}{a.name}</td>
                                  <td className="p-1.5 text-foreground">{a.roleLabel}</td>
                                  <td className="p-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      a.status === "Anwesend" ? "bg-green-600 text-white"
                                      : a.status === "Im Einsatz" ? "bg-blue-600 text-white"
                                      : "bg-orange-500 text-white"
                                    }`}>
                                      {a.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Sections */}
                      {(p.sections as any[])?.length > 0 && (
                        <div className="space-y-2">
                          {(p.sections as any[]).map((s: any, i: number) => (
                            <div key={i}>
                              <h3 className="text-sm font-semibold text-foreground">{i + 2}. {s.title || "Ohne Titel"}</h3>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{s.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* PDF Preview (hidden, rendered for html2canvas) */}
      <div
        ref={protocolRef}
        style={{
          display: "none",
          width: "794px",
          fontFamily: "Arial, sans-serif",
          background: "#ffffff",
          color: "#000000",
          position: "absolute",
          left: "-9999px",
          top: 0,
        }}
      >
        {/* Cover Page */}
        <div style={{ width: "794px", minHeight: "1123px", position: "relative", overflow: "hidden", pageBreakAfter: "always" }}>
          {/* Top-right diagonal stripe */}
          <div style={{
            position: "absolute", top: "-60px", right: "-60px", width: "400px", height: "200px",
            background: "linear-gradient(135deg, transparent 30%, #808080 30%, #808080 50%, transparent 50%)",
          }} />

          {/* ASD Logo top-right */}
          <div style={{ position: "absolute", top: "20px", right: "30px", width: "150px", height: "150px", borderRadius: "50%", overflow: "hidden", zIndex: 10 }}>
            <img src={asdLogoFull} alt="ASD Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} crossOrigin="anonymous" />
          </div>

          {/* Helicopter watermark - opacity 1 */}
          <div style={{
            position: "absolute", top: "200px", left: "50%", transform: "translateX(-50%)",
            width: "500px", opacity: 1, zIndex: 0,
          }}>
            <img src={heliWatermark} alt="" style={{ width: "100%", height: "auto" }} crossOrigin="anonymous" />
          </div>

          {/* Title content */}
          <div style={{ position: "absolute", top: "450px", left: "0", right: "0", textAlign: "center", padding: "0 60px" }}>
            <hr style={{ border: "none", borderTop: "2px solid #333", marginBottom: "20px" }} />
            <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#2d5016", margin: "10px 0" }}>{titel}</h1>
            <p style={{ fontSize: "16px", color: "#333", margin: "5px 0 30px" }}>{untertitel}</p>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#000", margin: "10px 0" }}>
              → Aufstellungsprotokoll ←
            </h2>
            <hr style={{ border: "none", borderTop: "2px solid #333", marginTop: "20px" }} />
          </div>

          {/* Bottom-right stripes */}
          <div style={{ position: "absolute", bottom: "0", right: "0", width: "300px", height: "120px", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: "-20px", right: "-40px", width: "400px", height: "40px", background: "#000", transform: "rotate(-25deg)", transformOrigin: "bottom right" }} />
            <div style={{ position: "absolute", bottom: "-20px", right: "-40px", width: "400px", height: "30px", background: "#6b7a3a", transform: "rotate(-25deg)", transformOrigin: "bottom right", marginBottom: "35px" }} />
          </div>
        </div>

        {/* Content Pages */}
        <div style={{ padding: "40px 50px", position: "relative", minHeight: "1123px" }}>
          {/* Header info */}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
              <p><strong>Datum: {formatDate(datum)}</strong></p>
              <p><strong>Uhrzeit: {uhrzeit}</strong></p>
              <p><strong>Ort: Dach Police Department</strong></p>
              <p><strong>Protokollführer: {protokollfuehrer}</strong></p>
            </div>

            {/* Small logo top-right */}
            <div style={{ position: "absolute", top: "0", right: "0", width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden" }}>
              <img src={asdLogoFull} alt="ASD" style={{ width: "100%", height: "100%", objectFit: "contain" }} crossOrigin="anonymous" />
            </div>
          </div>

          {/* Helicopter watermark on content page */}
          <div style={{
            position: "absolute", top: "300px", left: "50%", transform: "translateX(-50%)",
            width: "400px", opacity: 0.08, zIndex: 0,
          }}>
            <img src={heliWatermark} alt="" style={{ width: "100%", height: "auto" }} crossOrigin="anonymous" />
          </div>

          {/* 1. Anwesenheit */}
          <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "30px 0 15px", color: "#000" }}>
            1. Anwesenheit
          </h2>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", position: "relative", zIndex: 1 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #333" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#555", fontWeight: "600" }}>Name</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#555", fontWeight: "600" }}>Position</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#555", fontWeight: "600" }}>Anwesenheit</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const groups = groupedAttendance();
                const rows: JSX.Element[] = [];
                groups.forEach((group, gi) => {
                  group.members.forEach((m, mi) => {
                    const statusBg =
                      m.status === "Anwesend" ? "#e65100"
                      : m.status === "Abgemeldet" ? "#e65100"
                      : "#1565c0";
                    const statusText =
                      m.status === "Anwesend" ? "Abgemeldet ✓"
                      : m.status === "Abgemeldet" ? "Abgemeldet ✗"
                      : "Im Einsatz";
                    rows.push(
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: "1px solid #ddd",
                          borderTop: mi === 0 && gi > 0 ? "3px solid #ccc" : undefined,
                        }}
                      >
                        <td style={{ padding: "6px 8px" }}>
                          {m.dienstnummer ? `[${m.dienstnummer}] ` : ""}{m.name}
                        </td>
                        <td style={{ padding: "6px 8px" }}>{m.roleLabel}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{
                            background: statusBg, color: "#fff", padding: "2px 10px",
                            borderRadius: "4px", fontSize: "10px", fontWeight: "bold",
                          }}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                });
                return rows;
              })()}
            </tbody>
          </table>

          {/* Additional sections */}
          {sections.map((s, i) => (
            <div key={s.id} style={{ marginTop: "30px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 10px", color: "#000" }}>
                {i + 2}. {s.title || "Ohne Titel"}
              </h2>
              <p style={{ fontSize: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{s.content}</p>
            </div>
          ))}

          {/* Signature */}
          <div style={{ marginTop: "80px", paddingTop: "20px" }}>
            <hr style={{ border: "none", borderTop: "1px solid #333", width: "250px" }} />
            <p style={{ fontSize: "12px", marginTop: "5px" }}>
              <strong>Protokollführer: {protokollfuehrer}</strong>
            </p>
          </div>

          {/* Bottom stripes */}
          <div style={{ position: "absolute", bottom: "0", right: "0", width: "300px", height: "100px", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: "-15px", right: "-40px", width: "400px", height: "35px", background: "#000", transform: "rotate(-25deg)", transformOrigin: "bottom right" }} />
            <div style={{ position: "absolute", bottom: "-15px", right: "-40px", width: "400px", height: "25px", background: "#6b7a3a", transform: "rotate(-25deg)", transformOrigin: "bottom right", marginBottom: "30px" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AufstellungsprotokollPage;

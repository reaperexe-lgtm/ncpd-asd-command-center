import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, FileText, Siren, Plane, Upload, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
};
const ROLE_COLORS: Record<string, string> = {
  director: "from-red-500/20 to-red-500/5 border-red-500/30",
  co_director: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
  supervisor: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  ausbilder: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  trial_ausbilder: "from-lime-500/20 to-lime-500/5 border-lime-500/30",
  member: "from-primary/20 to-primary/5 border-primary/30",
  trial_member: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
};
const ROLE_TEXT: Record<string, string> = {
  director: "text-red-400", co_director: "text-orange-400", supervisor: "text-yellow-400",
  ausbilder: "text-amber-300", trial_ausbilder: "text-lime-400", member: "text-primary", trial_member: "text-purple-400",
};
const ROLE_ORDER = ["director","co_director","supervisor","ausbilder","trial_ausbilder","member","trial_member"];
const HIDDEN_ROLES = ["admin", "asd_applicant"];

const MemberPage = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageLicenses = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");

  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").eq("is_approved", true);
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role || "trial_member",
      })).filter((m) => !HIDDEN_ROLES.includes(m.role))
        .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
    },
  });

  // Stats for selected member
  const { data: memberStats } = useQuery({
    queryKey: ["member-stats", selectedMember?.id],
    enabled: !!selectedMember,
    queryFn: async () => {
      const uid = selectedMember.id;
      const name = selectedMember.name;
      const { count: missionsCreated } = await supabase.from("missions").select("*", { count: "exact", head: true }).eq("created_by", uid);
      const { count: protokolle } = await supabase.from("missions").select("*", { count: "exact", head: true }).eq("protokollschreiber", uid);
      const { count: pursuitsCreated } = await supabase.from("pursuits").select("*", { count: "exact", head: true }).eq("created_by", uid);
      const { data: allMissions } = await supabase.from("missions").select("pilot, co_pilot, left_gunner, right_gunner");
      let missionsCrew = 0;
      allMissions?.forEach((m) => {
        if ([m.pilot, m.co_pilot, m.left_gunner, m.right_gunner].includes(name)) missionsCrew++;
      });
      const { data: allPursuits } = await supabase.from("pursuits").select("pilot, co_pilot, left_gunner, right_gunner");
      let pursuitsCrew = 0;
      allPursuits?.forEach((p) => {
        if ([p.pilot, p.co_pilot, p.left_gunner, p.right_gunner].includes(name)) pursuitsCrew++;
      });
      const { count: flightLicenses } = await supabase.from("flight_licenses").select("*", { count: "exact", head: true }).eq("name", name);
      return {
        missionsCreated: missionsCreated || 0,
        protokolle: protokolle || 0,
        pursuitsCreated: pursuitsCreated || 0,
        missionsCrew,
        pursuitsCrew,
        flightLicenses: flightLicenses || 0,
      };
    },
  });

  // Flight licenses for selected member
  const { data: memberLicenses } = useQuery({
    queryKey: ["member-licenses", selectedMember?.name],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_licenses")
        .select("*")
        .eq("name", selectedMember.name)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Upload license image
  const uploadImageMutation = useMutation({
    mutationFn: async ({ licenseId, file }: { licenseId: string; file: File }) => {
      const ext = file.name.split(".").pop();
      const path = `licenses/${licenseId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("flight_licenses")
        .update({ image_url: urlData.publicUrl })
        .eq("id", licenseId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-licenses"] });
      toast.success("Bild hochgeladen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Remove license image
  const removeImageMutation = useMutation({
    mutationFn: async (licenseId: string) => {
      const { error } = await supabase
        .from("flight_licenses")
        .update({ image_url: null })
        .eq("id", licenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-licenses"] });
      toast.success("Bild entfernt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add new flight license
  const addLicenseMutation = useMutation({
    mutationFn: async ({ name, team }: { name: string; team: string }) => {
      const { error } = await supabase.from("flight_licenses").insert({
        name,
        team,
        status: "Aktiv",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-licenses"] });
      queryClient.invalidateQueries({ queryKey: ["member-stats"] });
      toast.success("Fluglizenz hinzugefügt");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [uploadingLicenseId, setUploadingLicenseId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showAddLicense, setShowAddLicense] = useState(false);
  const [newLicenseTeam, setNewLicenseTeam] = useState("ASD");

  // Group by role
  const grouped: Record<string, typeof members> = {};
  members?.forEach((m) => {
    if (!grouped[m.role]) grouped[m.role] = [];
    grouped[m.role]!.push(m);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Member</h1>
          <p className="text-xs text-muted-foreground">{members?.length || 0} aktive Mitglieder</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade Mitglieder...</div></div>
      ) : (
        <div className="space-y-8">
          {ROLE_ORDER.filter((r) => grouped[r]?.length).map((role) => (
            <div key={role}>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${ROLE_TEXT[role]}`}>
                {ROLE_LABELS[role]} ({grouped[role]!.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {grouped[role]!.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`bg-gradient-to-b ${ROLE_COLORS[role]} border rounded-lg p-4 hover:scale-[1.02] transition-transform duration-150 text-left`}
                  >
                    <div className="aspect-square bg-background/50 rounded-md overflow-hidden border border-border/50 mb-3">
                      {m.image_url ? (
                        <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground/20">
                          {m.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <h3 className={`font-bold text-sm ${ROLE_TEXT[role]}`}>{m.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ROLE_LABELS[role]}</p>
                    {m.dienstnummer && <p className="text-[10px] text-muted-foreground font-mono">{m.dienstnummer}</p>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingLicenseId) {
            uploadImageMutation.mutate({ licenseId: uploadingLicenseId, file });
            setUploadingLicenseId(null);
          }
          e.target.value = "";
        }}
      />

      {/* Member Profile Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => { if (!open) setSelectedMember(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:hover:bg-destructive/20 [&>button]:transition-colors [&>button>svg]:w-5 [&>button>svg]:h-5">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-3">
              {selectedMember?.image_url ? (
                <img src={selectedMember.image_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {selectedMember?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div>
                <span>{selectedMember?.name}</span>
                <p className="text-xs text-muted-foreground font-normal">
                  {ROLE_LABELS[selectedMember?.role] || selectedMember?.role}
                  {selectedMember?.dienstnummer && ` · ${selectedMember.dienstnummer}`}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Statistiken</h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: FileText, label: "Einsätze erstellt", value: memberStats?.missionsCreated },
                { icon: FileText, label: "Protokolle geschrieben", value: memberStats?.protokolle },
                { icon: Siren, label: "10-80 erstellt", value: memberStats?.pursuitsCreated },
                { icon: Users, label: "Einsatz-Besatzung", value: memberStats?.missionsCrew },
                { icon: Siren, label: "10-80 Besatzung", value: memberStats?.pursuitsCrew },
                { icon: Plane, label: "Fluglizenzen", value: memberStats?.flightLicenses },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-background/50 border border-border/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-xl font-bold text-primary tabular-nums">{value ?? "–"}</p>
                </div>
              ))}
            </div>

            {/* Flight Licenses with Images */}
            {memberLicenses && memberLicenses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fluglizenzen</h3>
                {memberLicenses.map((license) => (
                  <div key={license.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{license.team}</p>
                        <p className="text-xs text-muted-foreground">
                          {license.status} · {new Date(license.license_date).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      {canManageLicenses && !license.image_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => {
                            setUploadingLicenseId(license.id);
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Bild
                        </Button>
                      )}
                    </div>
                    {license.image_url && (
                      <div className="relative group">
                        <img
                          src={license.image_url}
                          alt="Fluglizenz"
                          className="w-full rounded-md border border-border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setViewingImage(license.image_url)}
                        />
                        {canManageLicenses && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImageMutation.mutate(license.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => { if (!open) setViewingImage(null); }}>
        <DialogContent className="sm:max-w-3xl bg-card border-border p-2 [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:hover:bg-destructive/20 [&>button]:transition-colors [&>button>svg]:w-5 [&>button>svg]:h-5">
          {viewingImage && (
            <img src={viewingImage} alt="Fluglizenz" className="w-full rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberPage;

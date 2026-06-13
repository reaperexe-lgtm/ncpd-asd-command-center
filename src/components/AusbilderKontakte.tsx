import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Save, Pencil, X } from "lucide-react";

const TRAINER_ROLES = ["director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"];

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  co_director: "Co-Director",
  supervisor: "Supervisor",
  ausbilder: "Ausbilder",
  trial_ausbilder: "Trial-Ausbilder",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  director: "bg-red-500/20 text-red-400 border-red-500/30",
  co_director: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  supervisor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ausbilder: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  trial_ausbilder: "bg-lime-500/20 text-lime-400 border-lime-500/30",
};

const AusbilderKontakte = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState("");

  const { data: trainers } = useQuery({
    queryKey: ["trainer-contacts"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", TRAINER_ROLES as any);
      if (!roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer, internal_dienstnummer")
        .in("id", userIds);
      const { data: privs } = await supabase
        .from("profiles_private")
        .select("user_id, phone_number")
        .in("user_id", userIds);

      return (profiles || []).map((p) => ({
        ...p,
        phone_number: privs?.find((pp: any) => pp.user_id === p.id)?.phone_number ?? null,
        role: roles.find((r) => r.user_id === p.id)?.role || "member",
      }));
    },
  });

  const updatePhone = useMutation({
    mutationFn: async ({ userId, phone }: { userId: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles_private")
        .upsert(
          { user_id: userId, phone_number: phone || null },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-contacts"] });
      toast.success("Telefonnummer gespeichert");
      setEditingId(null);
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const startEdit = (trainer: any) => {
    setEditingId(trainer.id);
    setEditPhone(trainer.phone_number || "");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-lg flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Ausbilder-Kontaktdaten
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Telefonnummern für ASD-Bewerber hinterlegen. Diese werden im Bewerber-Portal angezeigt.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(trainers || []).map((trainer) => (
            <div
              key={trainer.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-foreground">{trainer.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${ROLE_BADGE_COLORS[trainer.role] || ""}`}>
                      {ROLE_LABELS[trainer.role] || trainer.role}
                    </Badge>
                    {(trainer as any).internal_dienstnummer && (
                      <span className="text-xs text-primary font-mono font-semibold">{(trainer as any).internal_dienstnummer}</span>
                    )}
                    {trainer.dienstnummer && (
                      <span className="text-xs text-muted-foreground">#{trainer.dienstnummer}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingId === trainer.id ? (
                  <>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="z.B. 555-1234"
                      className="w-40 h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updatePhone.mutate({ userId: trainer.id, phone: editPhone })}
                    >
                      <Save className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-foreground font-mono">
                      {trainer.phone_number || <span className="text-muted-foreground italic">Keine Nr.</span>}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(trainer)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!trainers || trainers.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Keine Ausbilder gefunden.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AusbilderKontakte;

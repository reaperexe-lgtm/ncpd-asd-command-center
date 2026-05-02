import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PresenceUser = {
  user_id: string;
  name: string;
  role: string;
  image_url?: string | null;
  online_at: string;
};

/**
 * Tracks all currently active users on the website via Supabase Realtime presence.
 * One global channel "online-users" — every authenticated user joins on mount.
 */
export function usePresence() {
  const { user, profile, role } = useAuth();
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        for (const id in state) {
          const entry = state[id]?.[0];
          if (entry) users.push(entry);
        }
        users.sort((a, b) => a.name.localeCompare(b.name));
        setOnline(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name: profile.name || "Unbekannt",
            role: role || "trial_member",
            image_url: (profile as any).image_url || null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.name, role]);

  return online;
}
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Cake, PartyPopper } from "lucide-react";
import { logActivity } from "@/lib/activityLog";

const BIRTHDAY_GIFT = 500_000;
const ANNIVERSARY_GIFT = 1_000_000;

type MilestoneState = {
  isBirthday: boolean;
  isAnniversary: boolean;
  anniversaryYears: number;
};

const MilestoneCelebrations = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MilestoneState>({
    isBirthday: false,
    isAnniversary: false,
    anniversaryYears: 0,
  });
  const handled = useRef(false);

  useEffect(() => {
    if (!user || handled.current) return;
    handled.current = true;

    const run = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, birthday, asd_join_date")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile) return;

        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        const todayYear = today.getFullYear();

        const matchesAnnualDate = (iso?: string | null) => {
          if (!iso) return false;
          const d = new Date(iso);
          return d.getMonth() === todayMonth && d.getDate() === todayDay;
        };

        const isBirthday = matchesAnnualDate((profile as any).birthday);
        const joinDate = (profile as any).asd_join_date as string | null;
        const isAnniversaryDate = matchesAnnualDate(joinDate);
        const anniversaryYears = isAnniversaryDate && joinDate
          ? Math.max(0, todayYear - new Date(joinDate).getFullYear())
          : 0;
        // Erstes Beitrittsjahr zählt nicht als „Jubiläum"
        const isAnniversary = isAnniversaryDate && anniversaryYears >= 1;

        setState({ isBirthday, isAnniversary, anniversaryYears });

        if (!isBirthday && !isAnniversary) return;

        // Casino-Balance laden / anlegen
        let { data: bal } = await supabase
          .from("casino_balances")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!bal) {
          const { data: created } = await supabase
            .from("casino_balances")
            .insert({ user_id: user.id, balance: 1000 })
            .select("*")
            .single();
          bal = created;
        }
        if (!bal) return;

        let balance = Number(bal.balance ?? 0);
        const updates: Record<string, any> = {};

        if (isBirthday && bal.last_birthday_gift_year !== todayYear) {
          balance += BIRTHDAY_GIFT;
          updates.last_birthday_gift_year = todayYear;
          updates.balance = balance;
        }
        if (isAnniversary && bal.last_anniversary_gift_year !== todayYear) {
          balance += ANNIVERSARY_GIFT;
          updates.last_anniversary_gift_year = todayYear;
          updates.balance = balance;
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await (supabase as any)
            .from("casino_balances")
            .update(updates)
            .eq("user_id", user.id);
          if (!error) {
            if (updates.last_birthday_gift_year === todayYear) {
              toast.success(
                `🎂 Alles Gute zum Geburtstag, ${profile.name}! +${BIRTHDAY_GIFT.toLocaleString("de-DE")} $ aufs Casino-Konto`,
                { duration: 8000 }
              );
              await logActivity("birthday_gift", "casino", { amount: BIRTHDAY_GIFT });
            }
            if (updates.last_anniversary_gift_year === todayYear) {
              toast.success(
                `🎉 Glückwunsch zum ${anniversaryYears}-jährigen ASD-Jubiläum! +${ANNIVERSARY_GIFT.toLocaleString("de-DE")} Coins`,
                { duration: 10000 }
              );
              await logActivity("anniversary_gift", "casino", {
                amount: ANNIVERSARY_GIFT,
                years: anniversaryYears,
              });
            }
          }
        }

        // Großer Begrüßungs-Konfetti-Burst
        burstConfetti();
      } catch (e) {
        console.error("Milestone check failed:", e);
      }
    };

    run();
  }, [user]);

  // Sanfter Konfetti-Regen den ganzen Tag
  useEffect(() => {
    if (!state.isBirthday && !state.isAnniversary) return;
    const interval = window.setInterval(() => {
      gentleRain(state.isAnniversary);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [state.isBirthday, state.isAnniversary]);

  if (!state.isBirthday && !state.isAnniversary) return null;

  return (
    <div className="fixed top-14 md:top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-fade-in">
      <div
        className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-lg ${
          state.isAnniversary
            ? "bg-purple-500/15 border-purple-400/40 text-purple-200"
            : "bg-pink-500/15 border-pink-400/40 text-pink-200"
        }`}
      >
        {state.isAnniversary ? (
          <PartyPopper className="w-4 h-4" />
        ) : (
          <Cake className="w-4 h-4" />
        )}
        <span className="text-xs font-semibold tracking-wide">
          {state.isAnniversary
            ? `${state.anniversaryYears} Jahr${state.anniversaryYears === 1 ? "" : "e"} in der ASD — wir feiern dich heute! 🎉`
            : "Heute hast du Geburtstag — viel Spaß beim Feiern! 🎂"}
        </span>
      </div>
    </div>
  );
};

function burstConfetti() {
  const defaults = { startVelocity: 35, spread: 360, ticks: 90, zIndex: 9999 };
  const colors = ["#ec4899", "#f59e0b", "#a855f7", "#22c55e", "#38bdf8"];
  confetti({ ...defaults, particleCount: 120, origin: { x: 0.2, y: 0.3 }, colors });
  confetti({ ...defaults, particleCount: 120, origin: { x: 0.8, y: 0.3 }, colors });
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.1 }, colors });
}

function gentleRain(rich: boolean) {
  const colors = rich
    ? ["#a855f7", "#f59e0b", "#ec4899", "#22c55e"]
    : ["#ec4899", "#f9a8d4", "#fde047"];
  confetti({
    particleCount: rich ? 30 : 18,
    angle: 270,
    spread: 70,
    startVelocity: 25,
    gravity: 0.6,
    ticks: 200,
    origin: { x: Math.random(), y: -0.05 },
    colors,
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}

export default MilestoneCelebrations;
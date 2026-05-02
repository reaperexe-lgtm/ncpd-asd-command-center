import { usePresence } from "@/hooks/usePresence";
import { Circle, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  director: "Director",
  co_director: "Co-Director",
  supervisor: "Supervisor",
  ausbilder: "Ausbilder",
  trial_ausbilder: "Trial-Ausbilder",
  member: "Member",
  trial_member: "Trial Member",
  asd_applicant: "ASD-Bewerber",
  flight_applicant: "Fluglizenz-Bewerber",
  flight_license: "Fluglizenz",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "text-red-400",
  director: "text-red-400",
  co_director: "text-orange-400",
  supervisor: "text-yellow-400",
  ausbilder: "text-amber-300",
  trial_ausbilder: "text-lime-400",
  member: "text-primary",
  trial_member: "text-purple-400",
  asd_applicant: "text-blue-400",
  flight_applicant: "text-cyan-400",
  flight_license: "text-sky-400",
};

const OnlineUsersCard = () => {
  const online = usePresence();

  return (
    <div className="border border-border rounded-xl bg-card/60 backdrop-blur p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Aktiv auf der Website
          </h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-semibold">
          {online.length} online
        </span>
      </div>

      {online.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Niemand online.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {online.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-background/60 border border-border/60"
              title={`${u.name} — ${ROLE_LABELS[u.role] || u.role}`}
            >
              {u.image_url ? (
                <img src={u.image_url} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold uppercase">
                  {u.name?.charAt(0) || "?"}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                <span className="text-xs font-medium text-foreground">{u.name}</span>
                <span className={`text-[10px] ${ROLE_COLORS[u.role] || "text-muted-foreground"}`}>
                  · {ROLE_LABELS[u.role] || u.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnlineUsersCard;
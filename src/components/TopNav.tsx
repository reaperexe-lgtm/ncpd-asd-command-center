import { NavLink } from "react-router-dom";
import { Home, Dice5, Siren, FileText, Users2, BarChart3, UserCog, PlaneTakeoff, ShieldBan } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/", icon: Home, label: "Home", emoji: "🏠" },
  { to: "/gambling", icon: Dice5, label: "Gambling", emoji: "🎰" },
  { to: "/einsatz", icon: Siren, label: "Einsatz", emoji: "🚨" },
  { to: "/protokolle", icon: FileText, label: "Protokolle", emoji: "📄" },
  { to: "/familien", icon: Users2, label: "Familien", emoji: "👥" },
  { to: "/statistik", icon: BarChart3, label: "Statistik", emoji: "📊" },
  { to: "/member", icon: UserCog, label: "Member", emoji: "👤" },
  { to: "/fluglizenzen", icon: PlaneTakeoff, label: "Fluglizenzen", emoji: "✈️" },
  { to: "/bewerbungssperre", icon: ShieldBan, label: "Bewerbungssperre", emoji: "🚫" },
];

const TopNav = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-center gap-1 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-2 rounded-md text-xs font-medium transition-all duration-200
              ${isActive
                ? "bg-secondary border border-primary/40 text-primary shadow-[0_0_12px_hsl(185_100%_50%/0.15)]"
                : "text-muted-foreground hover:text-primary hover:bg-secondary/50"
              }`
            }
          >
            <span className="text-base">{item.emoji}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="ml-6 text-primary font-mono text-sm tabular-nums">
        {time.toLocaleTimeString("de-DE")}
      </div>
    </nav>
  );
};

export default TopNav;

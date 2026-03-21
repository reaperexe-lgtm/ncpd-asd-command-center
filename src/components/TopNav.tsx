import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { LogOut, Shield, User } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", emoji: "🏠" },
  { to: "/gambling", label: "Gambling", emoji: "🎰" },
  { to: "/einsatz", label: "Einsatz", emoji: "🚨" },
  { to: "/protokolle", label: "Protokolle", emoji: "📄" },
  { to: "/familien", label: "Familien", emoji: "👥" },
  { to: "/statistik", label: "Statistik", emoji: "📊" },
  { to: "/member", label: "Member", emoji: "👤" },
  { to: "/fluglizenzen", label: "Fluglizenzen", emoji: "✈️" },
  { to: "/bewerbungssperre", label: "Bewerbungssperre", emoji: "🚫" },
];

const TopNav = () => {
  const [time, setTime] = useState(new Date());
  const { isAdmin, signOut, profile } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-center gap-1 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
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
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
              ${isActive ? "bg-secondary border border-primary/40 text-primary" : "text-muted-foreground hover:text-primary hover:bg-secondary/50"}`
            }
          >
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </NavLink>
        )}
      </div>
      <div className="ml-4 flex items-center gap-3">
        <NavLink to="/profil" className={({ isActive }) => `transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary"}`} title="Profil">
          <User className="w-4 h-4" />
        </NavLink>
        <span className="text-primary font-mono text-sm tabular-nums">
          {time.toLocaleTimeString("de-DE")}
        </span>
        <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors" title="Abmelden">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};

export default TopNav;

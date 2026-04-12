import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { LogOut, Shield, User, Menu, X } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", emoji: "🏠" },
  { to: "/gambling", label: "Gambling", emoji: "🎰" },
  { to: "/verfolgung", label: "10-80", emoji: "🚔" },
  { to: "/einsatz", label: "Einsatz", emoji: "🚨" },
  { to: "/protokolle", label: "Protokolle", emoji: "📄" },
  { to: "/familien", label: "Familien", emoji: "👥" },
  { to: "/statistik", label: "Statistik", emoji: "📊" },
  { to: "/member", label: "Member", emoji: "👤" },
  { to: "/fluglizenzen", label: "Fluglizenzen", emoji: "✈️" },
  { to: "/bewerbungssperre", label: "Sperre", emoji: "🚫" },
  { to: "/aufstellungsprotokoll", label: "Aufstellung", emoji: "📋" },
];

const TopNav = () => {
  const [time, setTime] = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin, signOut, profile, role } = useAuth();
  const canReviewExams = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on route change
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="sticky top-0 z-50 hidden md:flex items-center justify-center gap-1 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
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
          {canReviewExams && (
            <NavLink
              to="/ausbilder"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
                ${isActive ? "bg-secondary border border-primary/40 text-primary" : "text-muted-foreground hover:text-primary hover:bg-secondary/50"}`
              }
            >
              <span className="text-base">🎓</span>
              <span>Ausbilder</span>
            </NavLink>
          )}
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
            <User className="w-6 h-6" />
          </NavLink>
          <span className="text-primary font-mono text-sm tabular-nums">
            {time.toLocaleTimeString("de-DE")}
          </span>
          <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10" title="Abmelden">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile nav bar */}
      <nav className="sticky top-0 z-50 md:hidden flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-primary p-1.5 rounded-md hover:bg-secondary/50 transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="text-primary font-mono text-sm tabular-nums">
          {time.toLocaleTimeString("de-DE")}
        </span>
        <div className="flex items-center gap-2">
          <NavLink to="/profil" onClick={closeMobile} className={({ isActive }) => `transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            <User className="w-5 h-5" />
          </NavLink>
          <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md" title="Abmelden">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="fixed inset-0 top-[53px] z-40 md:hidden">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={closeMobile} />
          <div className="relative bg-background/95 backdrop-blur-md border-b border-border shadow-lg max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-1 p-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? "bg-secondary border border-primary/40 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-secondary/50"
                    }`
                  }
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
              {canReviewExams && (
                <NavLink
                  to="/ausbilder"
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-xs font-medium transition-all
                    ${isActive ? "bg-secondary border border-primary/40 text-primary" : "text-muted-foreground hover:text-primary hover:bg-secondary/50"}`
                  }
                >
                  <span className="text-xl">🎓</span>
                  <span>Ausbilder</span>
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-xs font-medium transition-all
                    ${isActive ? "bg-secondary border border-primary/40 text-primary" : "text-muted-foreground hover:text-primary hover:bg-secondary/50"}`
                  }
                >
                  <Shield className="w-5 h-5" />
                  <span>Admin</span>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNav;

import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";

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
  { to: "/fluglizenz-member", label: "Lizenz-Inhaber", emoji: "🛩️" },
  { to: "/bewerbungssperre", label: "Sperre", emoji: "🚫" },
  { to: "/aufstellungsprotokoll", label: "Aufstellung", emoji: "📋" },
  { to: "/uebungen", label: "Übungen", emoji: "🎯" },
  { to: "/lernen", label: "Lernen", emoji: "📚" },
  { to: "/achievements", label: "Achievements", emoji: "🏆" },
  { to: "/search-rescue", label: "Search & Rescue", emoji: "🚁" },
];

const FLIGHT_LICENSE_VISIBLE = new Set([
  "/", "/gambling", "/verfolgung", "/einsatz", "/protokolle",
  "/familien", "/statistik", "/member", "/fluglizenz-member", "/uebungen", "/lernen", "/achievements",
]);

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin, signOut, role } = useAuth();
  const canReviewExams = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");
  const isFlightLicense = role === "flight_license";
  const visibleNavItems = isFlightLicense
    ? navItems.filter((i) => FLIGHT_LICENSE_VISIBLE.has(i.to))
    : navItems;

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const isActive = (path: string) => path === "/" ? pathname === "/" : pathname.startsWith(path);

  const navClass = (active: boolean) =>
    active
      ? "bg-secondary border border-primary/40 text-primary"
      : "text-muted-foreground hover:text-primary hover:bg-secondary/50";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 py-3">
        <div className="flex items-center justify-between gap-2">
          <SidebarTrigger className="shrink-0" />
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-primary font-bold text-sm truncate">ASD</span>
              <span className="text-primary font-mono text-xs tabular-nums">
                {time.toLocaleTimeString("de-DE")}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <NavLink to={item.to} end={item.to === "/"} className={navClass(isActive(item.to))}>
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(canReviewExams || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Verwaltung</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {canReviewExams && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/ausbilder")} tooltip="Ausbilder">
                      <NavLink to="/ausbilder" className={navClass(isActive("/ausbilder"))}>
                        <span className="text-base shrink-0">🎓</span>
                        <span>Ausbilder</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Admin">
                      <NavLink to="/admin" className={navClass(isActive("/admin"))}>
                        <Shield className="w-4 h-4 shrink-0" />
                        <span>Admin</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profil")} tooltip="Profil">
              <NavLink to="/profil" className={navClass(isActive("/profil"))}>
                <UserIcon className="w-4 h-4 shrink-0" />
                <span>Profil</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Abmelden" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Abmelden</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

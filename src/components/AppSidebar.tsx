import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, User as UserIcon, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  { to: "/achievements", label: "Achievements", emoji: "🏆" },
];

const FLIGHT_LICENSE_VISIBLE = new Set([
  "/", "/gambling", "/verfolgung", "/einsatz", "/protokolle",
  "/familien", "/statistik", "/member", "/fluglizenz-member", "/achievements",
]);

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin, signOut, role } = useAuth();
  const canReviewExams = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "team_red"].includes(role || "");
  const isFlightLicense = role === "flight_license";
  const isDirection = role === "director" || role === "co_director" || isAdmin;

  const { data: navOrder } = useQuery({
    queryKey: ["nav-order"],
    queryFn: async () => {
      const { data } = await supabase.from("nav_order").select("nav_key, sort_order").order("sort_order");
      return data || [];
    },
    staleTime: 60_000,
  });

  const baseItems = isFlightLicense ? navItems.filter(i => FLIGHT_LICENSE_VISIBLE.has(i.to)) : navItems;
  const visibleNavItems = (() => {
    if (!navOrder || navOrder.length === 0) return baseItems;
    const orderMap = new Map(navOrder.map(o => [o.nav_key, o.sort_order]));
    return [...baseItems].sort((a, b) => {
      const ao = orderMap.has(a.to) ? orderMap.get(a.to)! : 9999;
      const bo = orderMap.has(b.to) ? orderMap.get(b.to)! : 9999;
      return ao - bo;
    });
  })();

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const isActive = (path: string) => path === "/" ? pathname === "/" : pathname.startsWith(path);

  const navClass = (active: boolean) =>
    active
      ? "bg-secondary text-primary"
      : "text-muted-foreground hover:text-primary hover:bg-secondary/50";

  return (
    <Sidebar collapsible="icon" className="hud-sidebar">
      <SidebarHeader className="px-2 py-3">
        <div className="flex items-center justify-between gap-2">
          <SidebarTrigger className="shrink-0" />
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-4 h-4 shrink-0">
                <div className="hud-radar" />
              </div>
              <span className="text-primary font-bold text-sm truncate tracking-wide">ASD</span>
              <span className="hud-time text-primary text-xs tabular-nums">
                {time.toLocaleTimeString("de-DE")}
              </span>
            </div>
          )}
        </div>
        {!collapsed && <div className="hud-tick mt-3" />}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      data-active={isActive(item.to)}
                      className={`hud-nav-item ${navClass(isActive(item.to))}`}
                    >
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <span className="flex-1">{item.label}</span>
                      {isActive(item.to) && <span className="hud-dot shrink-0" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(canReviewExams || isAdmin) && (
          <SidebarGroup>
            {!collapsed && <div className="hud-tick mb-2" />}
            <SidebarGroupLabel>Verwaltung</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {canReviewExams && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/ausbilder")} tooltip="Ausbilder">
                      <NavLink
                        to="/ausbilder"
                        data-active={isActive("/ausbilder")}
                        className={`hud-nav-item ${navClass(isActive("/ausbilder"))}`}
                      >
                        <span className="text-base shrink-0">🎓</span>
                        <span>Ausbilder</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isDirection && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/direction")} tooltip="Direction">
                      <NavLink
                        to="/direction"
                        data-active={isActive("/direction")}
                        className={`hud-nav-item ${navClass(isActive("/direction"))}`}
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Direction</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Admin">
                      <NavLink
                        to="/admin"
                        data-active={isActive("/admin")}
                        className={`hud-nav-item ${navClass(isActive("/admin"))}`}
                      >
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
        {!collapsed && <div className="hud-tick mb-2" />}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profil")} tooltip="Profil">
              <NavLink
                to="/profil"
                data-active={isActive("/profil")}
                className={`hud-nav-item ${navClass(isActive("/profil"))}`}
              >
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

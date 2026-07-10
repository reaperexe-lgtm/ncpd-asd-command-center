import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, FileText, Car, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  icon: any;
  label: string;
  path: string;
  color: string;
  hideOn?: string[];
}

const ACTIONS: ActionItem[] = [
  { icon: FileText, label: "Einsatz erfassen", path: "/einsatz", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", hideOn: ["/einsatz"] },
  { icon: Car, label: "10-80 starten", path: "/verfolgung", color: "bg-orange-500/15 text-orange-300 border-orange-500/40", hideOn: ["/verfolgung"] },
  { icon: BookOpen, label: "Protokolle", path: "/protokolle", color: "bg-purple-500/15 text-purple-300 border-purple-500/40", hideOn: ["/protokolle"] },
];

const QuickActionFAB = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isApproved, role } = useAuth();

  // Close on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Don't show for applicants or unapproved users
  if (!isApproved) return null;
  if (role === "asd_applicant" || role === "flight_applicant") return null;

  const visibleActions = ACTIONS.filter((a) => !a.hideOn?.includes(location.pathname));

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-background/40 backdrop-blur-[2px] z-40 animate-in fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-50 flex flex-col items-end gap-3">
        {/* Action buttons */}
        {open && visibleActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={cn(
                "flex items-center gap-3 pl-4 pr-5 py-3 rounded-full border-2 shadow-lg backdrop-blur-md",
                "transition-all hover:scale-105 active:scale-95 animate-in slide-in-from-bottom-2 fade-in",
                action.color,
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-semibold whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}

        {/* Main FAB */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Schnellaktionen schließen" : "Schnellaktionen öffnen"}
          className={cn(
            "w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl transition-all border-2",
            "flex items-center justify-center active:scale-90 hover:scale-105",
            open
              ? "bg-destructive border-destructive/60 text-destructive-foreground rotate-90"
              : "bg-primary border-primary/40 text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]",
          )}
        >
          {open ? <X className="w-6 h-6 sm:w-7 sm:h-7" /> : <Plus className="w-6 h-6 sm:w-7 sm:h-7" />}
        </button>
      </div>
    </>
  );
};

export default QuickActionFAB;

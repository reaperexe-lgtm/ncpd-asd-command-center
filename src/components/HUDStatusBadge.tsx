import { cn } from "@/lib/utils";

type BadgeVariant = "gold" | "green" | "red" | "blue" | "purple";

interface HUDStatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  gold: "hud-badge-gold",
  green: "hud-badge-green",
  red: "hud-badge-red",
  blue: "hud-badge-blue",
  purple: "hud-badge-purple",
};

export const HUDStatusBadge = ({
  label,
  variant = "green",
  icon,
  className,
  pulse,
}: HUDStatusBadgeProps) => {
  return (
    <span className={cn("hud-badge", variantClasses[variant], pulse && "animate-pulse", className)}>
      {icon}
      {label}
    </span>
  );
};

export default HUDStatusBadge;

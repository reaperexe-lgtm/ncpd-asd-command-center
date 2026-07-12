import { Bike, Skull, Home, Crosshair } from "lucide-react";

export const GANG_CATEGORIES = [
  { value: "Street Gang", label: "Street Gang", icon: Skull },
  { value: "Familie", label: "Kartell/Mafia", icon: Home },
  { value: "Kartell", label: "Sonstiges", icon: Crosshair },
  { value: "Biker Club", label: "Biker Club", icon: Bike },
] as const;

export type MemberRole =
  | "Director"
  | "Co-Director"
  | "Supervisor"
  | "Ausbilder"
  | "Trial-Ausbilder"
  | "Member"
  | "Trial Member";

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  imageUrl?: string;
  dienstnummer?: string;
}

export const ROLE_ORDER: MemberRole[] = [
  "Director",
  "Co-Director",
  "Supervisor",
  "Ausbilder",
  "Trial-Ausbilder",
  "Member",
  "Trial Member",
];

export const ROLE_COLORS: Record<MemberRole, string> = {
  "Director": "text-red-400",
  "Co-Director": "text-orange-400",
  "Supervisor": "text-yellow-400",
  "Ausbilder": "text-amber-300",
  "Trial-Ausbilder": "text-lime-400",
  "Member": "text-primary",
  "Trial Member": "text-purple-400",
};

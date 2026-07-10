export type AppRole =
  | "admin"
  | "director"
  | "co_director"
  | "supervisor"
  | "ausbilder"
  | "trial_ausbilder"
  | "member"
  | "trial_member"
  | "asd_applicant"
  | "flight_applicant"
  | "flight_license"
  | "team_red";

const ROLE_RANK: Record<string, number> = {
  admin: 0,
  team_red: 0,
  director: 1,
  co_director: 2,
  supervisor: 3,
  ausbilder: 4,
  trial_ausbilder: 5,
  member: 6,
  trial_member: 7,
  asd_applicant: 8,
  flight_applicant: 8,
  flight_license: 8,
};

const ADMIN_LIKE = new Set(["admin", "director", "co_director", "supervisor", "team_red"]);

export const getEffectiveRole = (roles: AppRole[]): AppRole | null => {
  if (!roles.length) return null;

  const nonAdminRoles = roles.filter((role) => role !== "admin");
  const ordered = [...(nonAdminRoles.length ? nonAdminRoles : roles)].sort((a, b) => (ROLE_RANK[a] ?? 99) - (ROLE_RANK[b] ?? 99));
  if (ordered.includes("director")) return "director";
  if (ordered.includes("co_director")) return "co_director";
  if (ordered.includes("supervisor")) return "supervisor";
  if (ordered.includes("team_red")) return "team_red";
  if (ordered.includes("admin")) return "admin";

  return ordered[0] || null;
};

export const hasAdminPermissions = (roles: AppRole[]): boolean => roles.some((role) => ADMIN_LIKE.has(role));

export const hasAdminOverride = (user: { email?: string | null } | null, profile?: { name?: string | null; dienstnummer?: string | null } | null): boolean => {
  const haystacks = [
    user?.email,
    profile?.name,
    profile?.dienstnummer,
    (user as { user_metadata?: { name?: string | null } } | null)?.user_metadata?.name,
    (user as { user_metadata?: { dienstnummer?: string | null } } | null)?.user_metadata?.dienstnummer,
  ].filter((value): value is string => Boolean(value));

  return haystacks.some((value) => /asd-?007/i.test(value));
};

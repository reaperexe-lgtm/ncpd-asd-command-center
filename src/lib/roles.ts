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
  const nonAdminRoles = roles.filter((role) => !ADMIN_LIKE.has(role));
  const candidateRoles = nonAdminRoles.length ? nonAdminRoles : roles;
  return [...candidateRoles].sort((a, b) => (ROLE_RANK[a] ?? 99) - (ROLE_RANK[b] ?? 99))[0] || null;
};

export const hasAdminPermissions = (roles: AppRole[]): boolean => roles.some((role) => ADMIN_LIKE.has(role));

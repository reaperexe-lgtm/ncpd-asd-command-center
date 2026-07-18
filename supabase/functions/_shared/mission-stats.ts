function normalizeName(value?: string | null): string {
  return value
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim() || "";
}

export function countMissionsForUser(missions: Array<{ created_by?: string | null; protokollschreiber?: string | null }>, userId: string) {
  return missions.filter((mission) => {
    const writer = mission.protokollschreiber?.trim();
    if (writer) {
      return writer === userId;
    }
    return mission.created_by === userId;
  }).length;
}

type WriterNameLookup = Map<string, string> | Record<string, string>;

function resolveWriterName(lookup: WriterNameLookup | undefined, id: string): string {
  if (!lookup || !id) return "";
  if (lookup instanceof Map) return lookup.get(id) || "";
  return lookup[id] || "";
}

export function countHeliTeilnehmerForUser(
  entries: Array<{
    co_pilot?: string | null;
    left_gunner?: string | null;
    right_gunner?: string | null;
    protokollschreiber?: string | null;
    created_by?: string | null;
  }>,
  userName: string,
  userId?: string | null,
  writerNameById?: WriterNameLookup,
) {
  const normalizedUserName = normalizeName(userName);
  if (!normalizedUserName) return 0;

  return entries.filter((entry) => {
    const writerId = entry.protokollschreiber?.trim() || entry.created_by?.trim() || "";
    const resolvedWriterName = resolveWriterName(writerNameById, writerId);
    const normalizedWriter = normalizeName(resolvedWriterName);
    const isWriter = Boolean(
      (userId && writerId && writerId === userId) ||
      (normalizedWriter && normalizedWriter === normalizedUserName),
    );

    const matchingRoles = [entry.co_pilot, entry.left_gunner, entry.right_gunner].filter(
      (value): value is string => Boolean(normalizeName(value)),
    );

    const isCrew = matchingRoles.some((value) => normalizeName(value) === normalizedUserName);
    return isCrew && !isWriter;
  }).length;
}

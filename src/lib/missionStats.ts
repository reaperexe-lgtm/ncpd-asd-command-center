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

export function countCrewParticipationsForUser(
  missions: Array<{
    pilot?: string | null;
    co_pilot?: string | null;
    left_gunner?: string | null;
    right_gunner?: string | null;
  }>,
  userName: string,
) {
  if (!userName?.trim()) return 0;
  const normalized = userName.trim().toLowerCase();
  return missions.filter((mission) => {
    const crew = [mission.pilot, mission.co_pilot, mission.left_gunner, mission.right_gunner]
      .filter((value): value is string => Boolean(value));
    return crew.some((value) => value.trim().toLowerCase() === normalized);
  }).length;
}

// Für das "Heli-Teilnehmer"-Achievement: zählt NUR Unterstützungscrew (Co-Pilot, Left-
// und Right-Gunner) — der Pilot bekommt sein Achievement/seine Metrik separat. Außerdem
// zählt ein Eintrag nicht, wenn dieselbe Person für diese Mission/Verfolgung auch der
// Protokollschreiber ist (sonst würde man für die eigene Meldung zusätzlich als
// "Teilnehmer" gutgeschrieben werden).
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
    // Statistik-Parität: Protokollschreiber wird per ID ODER per aufgelöstem
    // Profilnamen ausgeschlossen (normalisiert, damit Groß/Kleinschreibung
    // und diakritische Zeichen egal sind).
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

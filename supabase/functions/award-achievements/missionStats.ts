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

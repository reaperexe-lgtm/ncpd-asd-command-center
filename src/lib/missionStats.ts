export function countMissionsForUser(missions: Array<{ created_by?: string | null; protokollschreiber?: string | null }>, userId: string) {
  return missions.filter((mission) => {
    const writer = mission.protokollschreiber?.trim();
    if (writer) {
      return writer === userId;
    }
    return mission.created_by === userId;
  }).length;
}

/**
 * Formatiert Dienstnummern: Bevorzugt Anzeige beider, falls vorhanden.
 * intern (ASD-XX) wird zuerst angezeigt, dann externe Dienstnummer (PD-XX).
 */
export function formatDn(internal?: string | null, external?: string | null): string {
  const i = internal?.trim();
  const e = external?.trim();
  if (i && e) return `${i} / ${e}`;
  return i || e || "";
}

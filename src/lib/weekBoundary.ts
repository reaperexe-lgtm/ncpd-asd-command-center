/**
 * Zentrale Definition der "Wochen"-Grenze für alle wöchentlichen Metriken
 * (Einsatz-Sprint / Verfolgungs-Marathon Challenges, "diese Woche"-Achievements, etc.).
 *
 * Reset-Zeitpunkt: JEDEN SONNTAG UM 20:00 UHR (Europe/Berlin) — nicht um Mitternacht.
 * D.h. z.B. Sonntag 19:59 zählt noch zur alten Woche, Sonntag 20:00 startet die neue.
 *
 * Die Berechnung nutzt Intl mit fester Zeitzone "Europe/Berlin", damit der Reset
 * unabhängig von der Zeitzone des Browsers/Servers und automatisch DST-korrekt ist.
 */

function getBerlinOffsetMs(date: Date): number {
  // Trick: dieselbe Formatierungslogik einmal in UTC und einmal in Europe/Berlin,
  // beide über new Date(string) im selben (Laufzeit-)Zeitzonen-Kontext geparst.
  // Die Differenz ist exakt der Berlin<->UTC Offset zu diesem Zeitpunkt (inkl. DST),
  // unabhängig davon, in welcher Zeitzone der Code tatsächlich läuft.
  const utcAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const berlinAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinAsLocal.getTime() - utcAsLocal.getTime();
}

/**
 * Liefert den echten UTC-Zeitstempel des letzten "Sonntag 20:00 Uhr Berlin",
 * der vor (oder exakt auf) dem übergebenen Zeitpunkt liegt.
 */
export function getChallengeWeekStart(reference: Date = new Date()): Date {
  const offset = getBerlinOffsetMs(reference);
  // berlinNow: Date-Objekt, dessen UTC-Getter die Berliner Wanduhrzeit liefern
  const berlinNow = new Date(reference.getTime() + offset);

  const dayOfWeek = berlinNow.getUTCDay(); // 0 = Sonntag
  const candidate = new Date(berlinNow);
  candidate.setUTCDate(candidate.getUTCDate() - dayOfWeek);
  candidate.setUTCHours(20, 0, 0, 0);

  // Falls "heute" Sonntag ist, aber vor 20 Uhr -> gehört noch zur Vorwoche
  if (candidate.getTime() > berlinNow.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() - 7);
  }

  // zurück in echte UTC-Zeit umrechnen
  return new Date(candidate.getTime() - offset);
}

/**
 * Liefert den Berliner Kalendertag (YYYY-MM-DD) des Wochenstart-Zeitpunkts.
 * Wird als "week_start" Bucket-Key in der weekly_challenges Tabelle verwendet.
 */
export function getChallengeWeekStartDateKey(reference: Date = new Date()): string {
  const weekStart = getChallengeWeekStart(reference);
  const offset = getBerlinOffsetMs(weekStart);
  const berlinWeekStart = new Date(weekStart.getTime() + offset);
  const y = berlinWeekStart.getUTCFullYear();
  const m = String(berlinWeekStart.getUTCMonth() + 1).padStart(2, "0");
  const d = String(berlinWeekStart.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

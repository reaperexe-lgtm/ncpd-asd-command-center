/**
 * Rundet einen Zeitpunkt auf das letzte volle 5-Minuten-Intervall ab
 * (z.B. 14:07 -> 14:05, 14:59 -> 14:55).
 */
export function roundDownTo5Minutes(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - (d.getMinutes() % 5));
  return d;
}

/**
 * Formatiert ein Date-Objekt als Wert für <input type="datetime-local">
 * (lokale Zeit, kein UTC-Versatz).
 */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Aktueller Zeitpunkt, direkt fertig für ein datetime-local-Feld, auf 5 Minuten abgerundet. */
export function nowRoundedForInput(): string {
  return toDatetimeLocalValue(roundDownTo5Minutes());
}

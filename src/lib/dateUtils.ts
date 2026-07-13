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
 * (lokale Zeit in Berlin, kein UTC-Versatz).
 */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  
  // Format the date in Berlin timezone
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }
  
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

/**
 * Converts a datetime-local string (interpreted as Berlin time) to UTC ISO string.
 * datetime-local format: "2024-01-15T14:30"
 * This is treated as Berlin local time and converted to UTC ISO format.
 */
export function convertLocalToUTC(datetimeLocalValue: string): string {
  if (!datetimeLocalValue) return new Date().toISOString();

  // Parse the datetime-local string: "2024-01-15T14:30"
  const [datePart, timePart] = datetimeLocalValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  // Start from the wall-clock time as if it were UTC, then convert to the Berlin-local instant.
  const testDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(testDate);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const berlinDate = new Date(
    Date.UTC(
      parseInt(values.year || "0", 10),
      parseInt(values.month || "0", 10) - 1,
      parseInt(values.day || "0", 10),
      parseInt(values.hour || "0", 10),
      parseInt(values.minute || "0", 10),
      parseInt(values.second || "0", 10),
    )
  );

  const targetUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const diffMs = targetUtcMs - berlinDate.getTime();
  const finalDate = new Date(testDate.getTime() + diffMs);

  return finalDate.toISOString();
}

/** Aktueller Zeitpunkt, direkt fertig für ein datetime-local-Feld, auf 5 Minuten abgerundet. */
export function nowRoundedForInput(): string {
  return toDatetimeLocalValue(roundDownTo5Minutes());
}

/**
 * Konvertiert einen UTC-ISO-Wert in das datetime-local-Format für Berlin-Zeit.
 */
export function convertUTCToLocalInput(isoString: string): string {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  return toDatetimeLocalValue(date);
}

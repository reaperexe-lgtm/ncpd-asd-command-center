// Geteilte Logik zur Prüfung/Auszahlung der Wochenziele (Einsatz-Sprint /
// Verfolgungs-Marathon). Ursprünglich nur im einmaligen Endpoint
// backfill-missed-rewards enthalten — seit dem 18.07.2026 zusätzlich Teil des
// 10-Minuten-Crons (award-achievements-batch), damit die Prüfung + Discord-
// Meldung an die Direction dauerhaft automatisch läuft, nicht nur einmalig.
//
// WICHTIG: missions_week / pursuits_week sind Live-Zähler, die beim
// Wochenreset (Sonntag 20 Uhr Berlin) auf 0 fallen. Der Check kann daher nur
// die AKTUELL laufende Woche auswerten.

function getBerlinOffsetMs(date: Date): number {
  const utcAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const berlinAsLocal = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  return berlinAsLocal.getTime() - utcAsLocal.getTime();
}

function getChallengeWeekStartDateKey(reference: Date = new Date()): string {
  const offset = getBerlinOffsetMs(reference);
  const berlinNow = new Date(reference.getTime() + offset);
  const dayOfWeek = berlinNow.getUTCDay();
  const candidate = new Date(berlinNow);
  candidate.setUTCDate(candidate.getUTCDate() - dayOfWeek);
  candidate.setUTCHours(20, 0, 0, 0);
  if (candidate.getTime() > berlinNow.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() - 7);
  }
  const y = candidate.getUTCFullYear();
  const m = String(candidate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(candidate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const REMOVED_CHALLENGE_TITLES = ["10-80-Sammler", "Missionen-Master"];
const getRewardDestination = (c: { title?: string }) =>
  c.title === "Einsatz-Sprint" || c.title === "Verfolgungs-Marathon" ? "cash" : "casino";

/**
 * Prüft für ALLE übergebenen Profile, ob die aktuellen Wochenziele
 * (Einsatz-Sprint / Verfolgungs-Marathon) erreicht wurden, zahlt die
 * Belohnung aus (Cash-Ziele -> Discord-Meldung an Direction, sonstige ->
 * Casino-Guthaben) und markiert die Challenge als reward_paid. Idempotent:
 * bereits ausgezahlte Ziele werden nie doppelt vergeben/gemeldet.
 */
export async function runWeeklyChallengeCheckForAllUsers(
  admin: any,
  profiles: { id: string; name?: string | null; dienstnummer?: string | null }[],
) {
  const errors: { user_id: string; message: string }[] = [];
  let weeklyChallengesClaimed = 0;

  const weekStartIso = getChallengeWeekStartDateKey();
  const { data: challenges, error: challengesErr } = await admin
    .from("weekly_challenges")
    .select("*")
    .eq("week_start", weekStartIso)
    .eq("is_active", true);
  if (challengesErr) throw challengesErr;

  const visibleChallenges = (challenges || []).filter(
    (c: any) => c.title !== "Aktiver Pilot" && !REMOVED_CHALLENGE_TITLES.includes(c.title),
  );

  if (!visibleChallenges.length || !profiles?.length) {
    return { weeklyChallengesClaimed, errors };
  }

  const weekStartTimestamp = new Date(`${weekStartIso}T00:00:00.000Z`).toISOString();
  // Grobfilter reicht: alle Missionen/Verfolgungen ab dem Kalendertag des
  // Wochenstarts holen und pro Nutzer clientseitig zählen (kleine
  // Datenmenge, läuft nur alle 10 Minuten — kein Performance-kritischer Pfad).
  const [{ data: weekMissions }, { data: weekPursuits }] = await Promise.all([
    admin.from("missions").select("id, created_by, created_at").gte("created_at", weekStartTimestamp),
    admin.from("pursuits").select("id, created_by, pursuit_date").gte("pursuit_date", weekStartTimestamp),
  ]);

  for (const p of profiles) {
    try {
      const { data: completions } = await admin
        .from("challenge_completions")
        .select("*")
        .eq("user_id", p.id);

      const missionsWeek = (weekMissions || []).filter((m: any) => m.created_by === p.id).length;
      const pursuitsWeek = (weekPursuits || []).filter((m: any) => m.created_by === p.id).length;
      const metricValues: Record<string, number> = {
        missions_week: missionsWeek,
        pursuits_week: pursuitsWeek,
      };

      for (const c of visibleChallenges) {
        const value = metricValues[c.metric];
        if (value === undefined) continue; // nur missions_week/pursuits_week hier abgedeckt
        const existing = completions?.find((x: any) => x.challenge_id === c.id);
        if (existing?.reward_paid) continue;
        if (value < c.target) continue;

        await admin.from("challenge_completions").upsert(
          { challenge_id: c.id, user_id: p.id, reward_paid: false },
          { onConflict: "challenge_id,user_id" },
        );

        const destination = getRewardDestination(c);

        if (destination === "casino") {
          // Keine Discord-Meldung nötig -> Belohnung + reward_paid=true bleiben
          // atomar gekoppelt, hier reicht der ursprüngliche Flip.
          const { data: updated } = await admin
            .from("challenge_completions")
            .update({ reward_paid: true })
            .eq("challenge_id", c.id)
            .eq("user_id", p.id)
            .eq("reward_paid", false)
            .select("id");
          if (!updated || (Array.isArray(updated) && updated.length === 0)) continue;

          weeklyChallengesClaimed++;
          const { data: bal } = await admin.from("casino_balances").select("balance").eq("user_id", p.id).maybeSingle();
          const newBal = ((bal as any)?.balance || 0) + c.reward_amount;
          await admin.from("casino_balances").upsert({ user_id: p.id, balance: newBal } as any, { onConflict: "user_id" });
          continue;
        }

        // Cash-Ziel: reward_paid darf erst true werden, wenn discord-notify
        // eine BESTÄTIGTE Zustellung an mind. ein Direction-Mitglied (oder den
        // Fallback-Channel) zurückmeldet. Vorher: nur ein kurzes Lock setzen
        // (notify_attempted_at), damit parallele Läufe (Client + Cron) nicht
        // doppelt pingen. Läuft der Versand schief, bleibt reward_paid=false
        // und der nächste Cron-Zyklus (10 Min später, sobald der Lock
        // abgelaufen ist) probiert automatisch erneut — es geht also nichts
        // mehr "stillschweigend verloren".
        const lockCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: locked } = await admin
          .from("challenge_completions")
          .update({ notify_attempted_at: new Date().toISOString() })
          .eq("challenge_id", c.id)
          .eq("user_id", p.id)
          .eq("reward_paid", false)
          .or(`notify_attempted_at.is.null,notify_attempted_at.lt.${lockCutoff}`)
          .select("id");
        if (!locked || (Array.isArray(locked) && locked.length === 0)) continue; // schon in Bearbeitung

        let directionNotified = false;
        try {
          const { data: notifyRes } = await admin.functions.invoke("discord-notify", {
            body: {
              type: "challenge_completed",
              data: {
                user_id: p.id,
                user_name: p.name || "",
                dienstnummer: p.dienstnummer ?? null,
                challenge_title: c.title,
                challenge_description: c.description,
                reward_amount: c.reward_amount,
              },
            },
          });
          directionNotified = notifyRes?.direction_notified === true;
        } catch (e) {
          errors.push({ user_id: p.id, message: `discord-notify (challenge ${c.title}) fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` });
        }

        if (!directionNotified) {
          errors.push({ user_id: p.id, message: `Wochenziel "${c.title}" erreicht, aber Direction wurde NICHT erreicht (kein DM/Fallback erfolgreich) — wird beim nächsten Lauf erneut versucht.` });
          continue;
        }

        await admin
          .from("challenge_completions")
          .update({ reward_paid: true, direction_notified_at: new Date().toISOString() })
          .eq("challenge_id", c.id)
          .eq("user_id", p.id);
        weeklyChallengesClaimed++;
      }
    } catch (e) {
      errors.push({ user_id: p.id, message: `weekly_challenges: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  return { weeklyChallengesClaimed, errors };
}

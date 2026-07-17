-- Generic Discord-Embed-Verwaltung (Mehrfach-Embeds pro Eintrag, z.B. Regelwerke, Ankündigungen)
-- Analog zu heli_data_embeds, aber "embeds" ist ein JSON-Array (mehrere Embeds in einer Nachricht).

CREATE TABLE public.discord_embeds (
  id text PRIMARY KEY,
  label text NOT NULL,
  channel_id text NOT NULL,
  embeds jsonb NOT NULL,
  discord_message_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discord_embeds TO authenticated;
GRANT ALL ON public.discord_embeds TO service_role;

ALTER TABLE public.discord_embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view discord embeds" ON public.discord_embeds
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'co_director'));

CREATE POLICY "Admins can manage discord embeds" ON public.discord_embeds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'co_director'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'co_director'));

CREATE TRIGGER discord_embeds_updated_at
  BEFORE UPDATE ON public.discord_embeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed: A.S.D. Interne Unitregeln (5 Embeds in einer Nachricht)
INSERT INTO public.discord_embeds (id, label, channel_id, embeds) VALUES
('asd-unitregeln', 'A.S.D. Interne Unitregeln', '1354386739766104156', '[
  {
    "title": "🚁 Air Support Division — Interne Unitregeln",
    "description": "**Narco City Police Department**\nAir Support Division\n\nNachfolgend die verbindlichen internen Regelungen für alle Mitglieder der A.S.D. Unkenntnis schützt nicht vor Konsequenzen — bei Fragen wendet euch an die Unitleitung.",
    "color": 3097651,
    "footer": { "text": "A.S.D. Dienstordnung" }
  },
  {
    "title": "🎖️ Haltung, Teamgeist & Ordnung",
    "color": 3900150,
    "fields": [
      { "name": "§1 Arbeitsmoral", "value": "**(1)** Von allen Angehörigen der A.S.D. wird eine hohe Arbeitsmoral erwartet. Einsätze sind mit Entschlossenheit, Verantwortungsbewusstsein und Ehrgeiz zu absolvieren.\n**(2)** Ein passives oder unmotiviertes Verhalten („Kein-Bock-Mindset“) ist mit den Aufgaben und der Verantwortung in der A.S.D. unvereinbar und daher unzulässig.\n**(3)** Während eines Einsatzes ist der Fokus ausschließlich auf die Einsatzdurchführung und deren bestmögliche Umsetzung zu richten." },
      { "name": "§6 Teamverhalten und Kameradschaft", "value": "**(1)** Die A.S.D. agiert als geschlossene Einheit. Jeder Einsatz beginnt gemeinsam und wird gemeinsam beendet.\n**(2)** Konflikte und Meinungsverschiedenheiten sind außerhalb aktiver Einsatzzeiten respektvoll und sachlich zu klären.\n**(3)** Bockiges Verhalten, Respektlosigkeit sowie Störung des Teamgeists sind untersagt." },
      { "name": "§13 Ordnung", "value": "**(1)** Jedes Mitglied hat stets darauf zu achten, dass jegliche Art von Ordnung innerhalb der Unit gewahrt wird." }
    ]
  },
  {
    "title": "🚁 Einsatzdurchführung & Verhältnismäßigkeit",
    "color": 15680580,
    "fields": [
      { "name": "§2 Mitnahme von Zivilpersonen", "value": "**(1)** Die Beförderung von Zivilisten im Helikopter ist grundsätzlich untersagt.\n**(2)** Eine Ausnahme besteht ausschließlich dann, wenn dies im Rahmen einer polizeilichen Maßnahme notwendig und angeordnet ist." },
      { "name": "§5 Aufgabenbereich von A.S.D. Gunners", "value": "**(1)** Mitglieder der A.S.D., die ausschließlich als Gunner eingestellt wurden, sind nicht berechtigt, einen Helikopter zu steuern oder zu führen.\n**(2)** Die Tätigkeiten dieser Mitglieder beschränken sich auf ihre spezifische Rolle innerhalb von Einsätzen." },
      { "name": "§11 Gefährdung von Boden Kräften", "value": "**(1)** Jedes Mitglied ist verpflichtet, die Unversehrtheit der am Einsatz beteiligten Bodenkräfte jederzeit zu wahren.\n**(2)** Absichtliche Tiefflüge oder sonstige Flugmanöver, die zur Gefährdung von Bodenkräften führen können, sind strikt untersagt." },
      { "name": "§12 Verhältnismäßigkeit", "value": "**(1)** Jedes Mitglied hat jederzeit auf die Verhältnismäßigkeit des Einsatzes im Rahmen der Luftunterstützung zu achten.\n**(2)** Pro Einsatz darf maximal ein Helikopter durch das Police Department (unabhängig ob A.S.D oder S.W.A.T) eingesetzt werden.\n**(3)** Wird der eingesetzte Helikopter während des Einsatzes zerstört, unabhängig von Eigen- oder Fremdverschulden, darf kein Hubschrauber nachgeführt werden." }
    ]
  },
  {
    "title": "🎽 Ausrüstung, Erscheinung & Technik",
    "color": 16097027,
    "fields": [
      { "name": "§3 Dienstkleidung", "value": "**(1)** Bei der aktiven Ausübung der Tätigkeit innerhalb der A.S.D. ist die dienstlich vorgeschriebene Unit-Kleidung zu tragen.\n**(2)** Außerhalb des Dienstes oder außerhalb A.S.D.-bezogener Tätigkeiten ist das Tragen der Unit-Kleidung untersagt." },
      { "name": "§4 Helikopter-Tuning", "value": "**(1)** Zulässige Modifikationen am Helikopter beschränken sich auf:\n• Scheibentönung\n• Leistungsbezogene Tunings (Motor, Getriebe, Bremsen, etc.)\n**(2)** Alle anderen Tuningmaßnahmen (optisch oder funktional) sind untersagt." },
      { "name": "§9 Einsatzfähigkeit und Equipment-Pflege", "value": "**(1)** Jedes Mitglied ist dafür verantwortlich, seine Ausrüstung regelmäßig auf Vollständigkeit zu überprüfen.\n**(2)** Fehlende Ausrüstungsgegenstände sind unverzüglich aufzurüsten." }
    ]
  },
  {
    "title": "📋 Organisatorisches & Sanktionen",
    "color": 10038562,
    "fields": [
      { "name": "§7 Abmeldungen vom Dienst", "value": "**(1)** Bei dienstlicher Abwesenheit von mehr als 48 Stunden ist die Unitleitung rechtzeitig und aktiv zu informieren.\n**(2)** Die Mitteilung muss unter Angabe von Dauer und Grund der Abwesenheit erfolgen." },
      { "name": "§10 Ausbildungsbereitschaft", "value": "**(1)** Jedes Mitglied verpflichtet sich zur Teilnahme an regelmäßigen Fortbildungsmaßnahmen und Einsatztrainings.\n**(2)** Verweigerung oder wiederholte Nichtteilnahme kann verwaltungsrechtliche Folgen nach sich ziehen." },
      { "name": "⚠️ §8 Sanktionen bei Verstößen", "value": "**(1)** Verstöße gegen die in dieser Dienstordnung aufgeführten Bestimmungen führen zu internen Verwarnungen.\n**(2)** Bei zwei internen Verwarnungen erfolgt eine automatische Entlassung aus der Einheit.\n**(3)** Die Liste der Regelungen erhebt keinen Anspruch auf Vollständigkeit. Auch nicht ausdrücklich aufgeführte Fehlverhaltensweisen können durch die Unitleitung geahndet werden.\n**(4)** In Fällen groben Fehlverhaltens behält sich die Unitleitung das Recht vor, eine sofortige Entlassung ohne vorherige Verwarnung auszusprechen." }
    ],
    "footer": { "text": "Bei Fragen wende dich an die Unitleitung · Stand: Juli 2026" }
  }
]'::jsonb);

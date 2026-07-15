#!/usr/bin/env node
/**
 * Sendet/aktualisiert Discord-Embeds über den vorhandenen ASD-Bot.
 *
 * Nutzung:
 *   1. DISCORD_BOT_TOKEN in .env.discord eintragen (einmalig, siehe .env.discord.example)
 *   2. Inhalte in scripts/heli-embeds.json anpassen
 *   3. npm run discord:heli
 *
 * Beim ersten Lauf wird pro Eintrag eine NEUE Nachricht im Channel erstellt.
 * Bei jedem weiteren Lauf wird DIESELBE Nachricht bearbeitet (kein Spam/Duplikate),
 * solange die IDs in scripts/.discord-message-ids.json erhalten bleiben.
 *
 * Um stattdessen bewusst neue Nachrichten zu erzeugen: die betroffene(n)
 * Zeile(n) in scripts/.discord-message-ids.json löschen und erneut ausführen.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMBEDS_FILE = path.join(__dirname, "heli-embeds.json");
const STATE_FILE = path.join(__dirname, ".discord-message-ids.json");
const DISCORD_API = "https://discord.com/api/v10";

async function loadEnvFile() {
  // Lädt scripts/../.env.discord (ohne zusätzliche Abhängigkeit wie dotenv)
  const envPath = path.join(__dirname, "..", ".env.discord");
  try {
    const content = await readFile(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.discord ist optional, falls DISCORD_BOT_TOKEN schon anders gesetzt ist
  }
}

async function loadJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function main() {
  await loadEnvFile();

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error(
      "Fehler: DISCORD_BOT_TOKEN fehlt. Trag ihn in .env.discord ein (siehe .env.discord.example)."
    );
    process.exit(1);
  }

  const embedDefs = await loadJson(EMBEDS_FILE, []);
  if (embedDefs.length === 0) {
    console.log("Keine Einträge in scripts/heli-embeds.json gefunden.");
    return;
  }

  const state = await loadJson(STATE_FILE, {});

  for (const def of embedDefs) {
    const { id, channelId, embed } = def;
    const existingMessageId = state[id];
    const url = existingMessageId
      ? `${DISCORD_API}/channels/${channelId}/messages/${existingMessageId}`
      : `${DISCORD_API}/channels/${channelId}/messages`;
    const method = existingMessageId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[${id}] Fehler (${method} ${res.status}): ${errText}`);
      continue;
    }

    const data = await res.json();
    state[id] = data.id;
    console.log(
      `[${id}] ${existingMessageId ? "aktualisiert" : "neu erstellt"} -> message_id ${data.id}`
    );
  }

  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});

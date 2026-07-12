// Einfache, lokale Farberkennung anhand von Stichwörtern (keine externe KI/API nötig).
// Erkennt Farbnamen (DE/EN) im Text und gibt sie in der Reihenfolge ihres Auftretens
// als Hex-Codes zurück. Der erste Treffer gilt als Primärfarbe, der zweite als Perlfarbe.

type ColorEntry = { keywords: string[]; hex: string };

// Wichtig: Zusammengesetzte/spezifischere Begriffe stehen bewusst VOR den generischen
// (z.B. "dunkelblau" vor "blau"), damit sie zuerst geprüft werden.
const COLOR_MAP: ColorEntry[] = [
  // Schwarz-Töne
  { keywords: ["mattschwarz", "matte black", "matt schwarz", "matt-schwarz"], hex: "#1c1c1c" },
  { keywords: ["glanzschwarz", "hochglanz schwarz", "gloss black"], hex: "#0d0d0d" },
  { keywords: ["tiefschwarz", "jet black", "pechschwarz"], hex: "#000000" },
  { keywords: ["schwarz", "black"], hex: "#000000" },

  // Grau-Töne
  { keywords: ["dunkelgrau", "anthrazit", "gunmetal", "gun metal"], hex: "#3a3a3a" },
  { keywords: ["hellgrau", "light grey", "light gray"], hex: "#b0b0b0" },
  { keywords: ["steingrau", "stone grey", "stone gray"], hex: "#8f8f8f" },
  { keywords: ["graphit", "graphite"], hex: "#41424c" },
  { keywords: ["grau", "grey", "gray"], hex: "#808080" },

  // Weiß/Silber
  { keywords: ["perlweiß", "perlweiss", "pearl white"], hex: "#f5f5f0" },
  { keywords: ["cremeweiß", "cremeweiss", "creme", "cream", "ivory", "elfenbein"], hex: "#f2e8d5" },
  { keywords: ["weiß", "weiss", "white"], hex: "#ffffff" },
  { keywords: ["silber", "silver", "silbergrau"], hex: "#c0c0c0" },
  { keywords: ["chrom", "chrome"], hex: "#d9d9d9" },
  { keywords: ["platin", "platinum"], hex: "#e5e4e2" },

  // Blau-Töne
  { keywords: ["dunkelblau", "navy", "marineblau", "marine", "mitternachtsblau", "midnight blue"], hex: "#0a1f5c" },
  { keywords: ["hellblau", "himmelblau", "babyblau", "eisblau", "ice blue"], hex: "#7ec8f2" },
  { keywords: ["stahlblau", "steel blue"], hex: "#4682b4" },
  { keywords: ["königsblau", "royal blue", "koenigsblau"], hex: "#1e3a8a" },
  { keywords: ["petrol", "petroleum"], hex: "#0f4c5c" },
  { keywords: ["blau", "blue"], hex: "#1d4ed8" },

  // Grün-Töne
  { keywords: ["dunkelgrün", "dunkelgruen", "tannengrün", "tannengruen", "waldgrün", "waldgruen", "forest green"], hex: "#0b3d1e" },
  { keywords: ["hellgrün", "hellgruen", "limette", "lime", "limone"], hex: "#7ed321" },
  { keywords: ["olivgrün", "olivgruen", "oliv", "olive"], hex: "#556b2f" },
  { keywords: ["mintgrün", "mintgruen", "mint"], hex: "#98ff98" },
  { keywords: ["neongrün", "neongruen", "neon green"], hex: "#39ff14" },
  { keywords: ["grün", "gruen", "green"], hex: "#16a34a" },

  // Rot-Töne
  { keywords: ["dunkelrot", "weinrot", "bordeaux", "burgund", "burgundy", "maroon"], hex: "#6e0a1e" },
  { keywords: ["hellrot", "kirschrot", "cherry red"], hex: "#e0393e" },
  { keywords: ["feuerrot", "fire red", "signalrot"], hex: "#ff2400" },
  { keywords: ["korallenrot", "coral"], hex: "#ff7f50" },
  { keywords: ["rot", "red"], hex: "#c1121f" },

  // Gelb/Orange
  { keywords: ["senfgelb", "mustard"], hex: "#c9a227" },
  { keywords: ["zitronengelb", "lemon"], hex: "#fff44f" },
  { keywords: ["gelb", "yellow"], hex: "#facc15" },
  { keywords: ["dunkelorange", "burnt orange"], hex: "#c05a1c" },
  { keywords: ["orange"], hex: "#ea580c" },

  // Lila/Pink
  { keywords: ["dunkellila", "dunkelviolett", "aubergine"], hex: "#3b0a45" },
  { keywords: ["lila", "violett", "purple", "lavendel", "lavender"], hex: "#7c3aed" },
  { keywords: ["pink", "rosa", "magenta", "fuchsia"], hex: "#ec4899" },
  { keywords: ["hellrosa", "hellpink", "pastellrosa"], hex: "#f9a8d4" },

  // Braun/Beige
  { keywords: ["dunkelbraun", "kaffeebraun", "espresso"], hex: "#3b2412" },
  { keywords: ["hellbraun", "sandbraun", "tan"], hex: "#c19a6b" },
  { keywords: ["schokobraun", "schokoladenbraun", "chocolate"], hex: "#4a2c1a" },
  { keywords: ["braun", "brown"], hex: "#5c3a21" },
  { keywords: ["beige"], hex: "#e8d9b5" },
  { keywords: ["khaki"], hex: "#8b8354" },
  { keywords: ["sand"], hex: "#d9c396" },

  // Gold/Metall
  { keywords: ["roségold", "rosegold", "rosé gold"], hex: "#b76e79" },
  { keywords: ["gold", "golden"], hex: "#d4af37" },
  { keywords: ["bronze"], hex: "#8c5e3c" },
  { keywords: ["kupfer", "copper"], hex: "#b87333" },

  // Türkis/Cyan
  { keywords: ["türkis", "tuerkis", "turquoise"], hex: "#06b6d4" },
  { keywords: ["cyan", "aquamarin", "aqua"], hex: "#00ced1" },
  { keywords: ["smaragd", "emerald"], hex: "#046307" },
];

// Nach Stichwortlänge absteigend sortieren, damit z.B. "dunkelblau" vor "blau" matcht.
const SORTED_ENTRIES = [...COLOR_MAP].sort(
  (a, b) => Math.max(...b.keywords.map((k) => k.length)) - Math.max(...a.keywords.map((k) => k.length))
);

/**
 * Durchsucht einen Freitext nach Farbnamen und gibt die gefundenen Hex-Codes
 * in der Reihenfolge ihres ersten Auftretens zurück (Duplikate werden entfernt).
 */
export function extractColorsFromText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();

  const matches: { index: number; hex: string }[] = [];
  for (const entry of SORTED_ENTRIES) {
    for (const keyword of entry.keywords) {
      const idx = lower.indexOf(keyword);
      if (idx !== -1) {
        matches.push({ index: idx, hex: entry.hex });
        break; // ein Treffer pro Eintrag reicht
      }
    }
  }

  matches.sort((a, b) => a.index - b.index);

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of matches) {
    if (!seen.has(m.hex)) {
      seen.add(m.hex);
      ordered.push(m.hex);
    }
  }
  return ordered;
}

/**
 * Praktischer Helfer: liefert direkt { primary, pearl } (oder undefined, falls nichts erkannt wurde).
 */
export function detectPrimaryAndPearl(text: string): { primary?: string; pearl?: string } {
  const colors = extractColorsFromText(text);
  return { primary: colors[0], pearl: colors[1] };
}

// Einfache, lokale Farberkennung anhand von Stichwörtern (keine externe KI/API nötig).
// Erkennt Farbnamen (DE/EN) im Text und gibt sie in der Reihenfolge ihres Auftretens
// als Hex-Codes zurück. Der erste Treffer gilt als Primärfarbe, der zweite als Perlfarbe.

type ColorEntry = { keywords: string[]; hex: string };

// Wichtig: Zusammengesetzte/spezifischere Begriffe stehen bewusst VOR den generischen
// (z.B. "dunkelblau" vor "blau"), damit sie zuerst geprüft werden.
const COLOR_MAP: ColorEntry[] = [
  { keywords: ["mattschwarz", "matte black", "matt schwarz"], hex: "#1c1c1c" },
  { keywords: ["dunkelgrau", "anthrazit"], hex: "#3a3a3a" },
  { keywords: ["hellgrau"], hex: "#b0b0b0" },
  { keywords: ["dunkelblau", "navy", "marineblau", "marine"], hex: "#0a1f5c" },
  { keywords: ["hellblau", "himmelblau", "babyblau"], hex: "#7ec8f2" },
  { keywords: ["dunkelgrün", "tannengrün"], hex: "#0b3d1e" },
  { keywords: ["hellgrün", "limette", "lime"], hex: "#7ed321" },
  { keywords: ["dunkelrot", "weinrot", "bordeaux"], hex: "#6e0a1e" },
  { keywords: ["schwarz", "black"], hex: "#000000" },
  { keywords: ["weiß", "weiss", "white"], hex: "#ffffff" },
  { keywords: ["grau", "grey", "gray"], hex: "#808080" },
  { keywords: ["silber", "silver"], hex: "#c0c0c0" },
  { keywords: ["rot", "red"], hex: "#c1121f" },
  { keywords: ["blau", "blue"], hex: "#1d4ed8" },
  { keywords: ["grün", "gruen", "green"], hex: "#16a34a" },
  { keywords: ["gelb", "yellow"], hex: "#facc15" },
  { keywords: ["orange"], hex: "#ea580c" },
  { keywords: ["lila", "violett", "purple", "lavendel"], hex: "#7c3aed" },
  { keywords: ["pink", "rosa", "magenta"], hex: "#ec4899" },
  { keywords: ["braun", "brown"], hex: "#5c3a21" },
  { keywords: ["gold", "golden"], hex: "#d4af37" },
  { keywords: ["bronze"], hex: "#8c5e3c" },
  { keywords: ["chrom", "chrome"], hex: "#d9d9d9" },
  { keywords: ["beige"], hex: "#e8d9b5" },
  { keywords: ["türkis", "tuerkis", "turquoise", "cyan"], hex: "#06b6d4" },
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

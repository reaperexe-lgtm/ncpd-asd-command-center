export const HELI_EMBED_IMAGE_URLS: Record<string, string> = {
  "jcon-1": "https://ostuzusncwkmfwzuhhmc.supabase.co/storage/v1/object/public/assets/heli-embeds/jcon.png",
  "maverick-1": "https://ostuzusncwkmfwzuhhmc.supabase.co/storage/v1/object/public/assets/heli-embeds/maverick.png",
};

export function getHeliEmbedImageUrl(rowId: string, fallback = ""): string {
  return HELI_EMBED_IMAGE_URLS[rowId] ?? fallback;
}

export function applyHeliEmbedImageBinding(embedJson: any, rowId: string): any {
  if (!embedJson || typeof embedJson !== "object") return embedJson;

  const mappedUrl = getHeliEmbedImageUrl(rowId);
  if (!mappedUrl) return embedJson;

  const next = { ...embedJson };
  next.image = { ...(next.image ?? {}), url: mappedUrl };
  return next;
}

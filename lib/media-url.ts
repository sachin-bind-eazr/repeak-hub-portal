const baseOrigin = () => globalThis.location?.origin || "https://repeak.invalid";

function isDirectRepeakStorageUrl(url: URL): boolean {
  if (url.hostname === "storage.googleapis.com") {
    return /^\/repeak[^/]*media(?:\/|$)/i.test(url.pathname);
  }
  return /^repeak[^.]*media\.storage\.googleapis\.com$/i.test(url.hostname);
}

export function usableMediaUrl(value?: string | null, now = Date.now()): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, baseOrigin());
    if (isDirectRepeakStorageUrl(url)) {
      return null;
    }
    const marker = "/v2/media/content/";
    const index = url.pathname.indexOf(marker);
    if (index < 0) return value;
    const token = url.pathname.slice(index + marker.length);
    const encoded = token.slice(0, token.lastIndexOf("."));
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return Number.isFinite(payload.exp) && payload.exp! * 1000 > now ? value : null;
  } catch {
    return null;
  }
}

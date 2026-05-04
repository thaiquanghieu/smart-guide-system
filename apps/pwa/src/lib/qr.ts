export type ResolvedQrPayload = {
  entryCode: string;
  poiId?: string;
};

export function resolveQrPayload(rawValue: string): ResolvedQrPayload | null {
  const raw = rawValue.trim();
  if (!raw) return null;

  const pathMatch = raw.match(/\/qr\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    const entryCode = decodeURIComponent(pathMatch[1]);
    const poiIdMatch = raw.match(/[?&]poiId=([^&#]+)/i);
    return {
      entryCode,
      poiId: poiIdMatch?.[1] ? decodeURIComponent(poiIdMatch[1]) : undefined,
    };
  }

  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "https://smartguide.local");
    const urlMatch = url.pathname.match(/\/qr\/([^/?#]+)/i);
    if (urlMatch?.[1]) {
      return {
        entryCode: decodeURIComponent(urlMatch[1]),
        poiId: url.searchParams.get("poiId") || undefined,
      };
    }
  } catch {
    // fall through to plain text support
  }

  return { entryCode: raw };
}

export function buildQrEntryPath(payload: ResolvedQrPayload) {
  const encodedEntry = encodeURIComponent(payload.entryCode);
  const poiQuery = payload.poiId ? `?poiId=${encodeURIComponent(payload.poiId)}` : "";
  return `/qr/${encodedEntry}${poiQuery}`;
}

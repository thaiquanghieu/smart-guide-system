import apiClient from "@/lib/api";

const DEVICE_UUID_KEY = "pwa_device_uuid";
const DEVICE_ID_KEY = "pwa_device_id";
const PENDING_POI_KEY = "pwa_pending_poi_id";
const RETURN_TO_KEY = "pwa_return_to";
const ENTRY_CONTEXT_KEY = "pwa_entry_context";
const AUDIO_LANG_KEY = "pwa_audio_lang";

function canUseStorage() {
  return typeof window !== "undefined";
}

function getStorage() {
  if (!canUseStorage()) return null;
  return window.localStorage;
}

function generateUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getDeviceUuid() {
  const storage = getStorage();
  if (!storage) return "";

  let uuid = storage.getItem(DEVICE_UUID_KEY);
  if (!uuid) {
    uuid = generateUuid();
    storage.setItem(DEVICE_UUID_KEY, uuid);
  }

  return uuid;
}

export function getDeviceId() {
  const storage = getStorage();
  if (!storage) return 0;

  return Number(storage.getItem(DEVICE_ID_KEY) || 0);
}

export function setDeviceId(deviceId: number) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(DEVICE_ID_KEY, String(deviceId));
}

export async function ensureDeviceReady() {
  const payload = {
    deviceUuid: getDeviceUuid(),
    name: typeof navigator !== "undefined" ? navigator.userAgent : "browser",
    platform: "web",
    model: typeof navigator !== "undefined" ? navigator.platform : "browser",
    appVersion: "pwa-1.0",
    metadata: {
      language: typeof navigator !== "undefined" ? navigator.language : "vi-VN",
      standalone:
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches,
    },
  };

  const response = await apiClient.post("/devices/register", payload);
  setDeviceId(response.data.deviceId);
  return response.data;
}

export function setPendingPoiId(poiId: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PENDING_POI_KEY, poiId);
}

export function getPendingPoiId() {
  const storage = getStorage();
  if (!storage) return "";
  return storage.getItem(PENDING_POI_KEY) || "";
}

export function clearPendingPoiId() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(PENDING_POI_KEY);
}

export function setReturnTo(path: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(RETURN_TO_KEY, path);
}

export function getReturnTo() {
  const storage = getStorage();
  if (!storage) return "/map";
  return storage.getItem(RETURN_TO_KEY) || "/map";
}

export function clearReturnTo() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(RETURN_TO_KEY);
}

export function saveEntryContext(value: { entryCode: string; poiId?: string | null }) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ENTRY_CONTEXT_KEY, JSON.stringify(value));
}

export function getEntryContext() {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(ENTRY_CONTEXT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { entryCode: string; poiId?: string | null };
  } catch {
    return null;
  }
}

export function clearEntryContext() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(ENTRY_CONTEXT_KEY);
}

export function setAudioLanguage(languageCode: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AUDIO_LANG_KEY, languageCode);
}

export function getAudioLanguage() {
  const storage = getStorage();
  if (!storage) return "vi";
  return storage.getItem(AUDIO_LANG_KEY) || "vi";
}

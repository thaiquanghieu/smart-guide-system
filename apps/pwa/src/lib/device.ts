import apiClient from "@/lib/api";

const DEVICE_UUID_KEY = "pwa_device_uuid";
const DEVICE_ID_KEY = "pwa_device_id";
const PENDING_POI_KEY = "pwa_pending_poi_id";
const RETURN_TO_KEY = "pwa_return_to";
const ENTRY_CONTEXT_KEY = "pwa_entry_context";
const AUDIO_LANG_KEY = "pwa_audio_lang";
const APP_LANG_KEY = "pwa_app_lang";
const AUTO_PLAY_KEY = "pwa_auto_play";
const BATTERY_SAVER_KEY = "pwa_battery_saver";
const TRACKING_RADIUS_KEY = "pwa_tracking_radius";
const TRACKING_INTERVAL_KEY = "pwa_tracking_interval";
const AUDIO_CUSTOM_KEY = "pwa_audio_custom";

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

function getBrowserFingerprint() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "browser";
  }

  const parts = [
    navigator.userAgent || "",
    navigator.platform || "",
    navigator.language || "",
    String(window.screen?.width || 0),
    String(window.screen?.height || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  ];

  return parts.join("|");
}

function hashToUuid(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const hex = Array.from({ length: 32 }, (_, index) => {
    const value = ((hash >> ((index % 4) * 8)) & 0xff) ^ (index * 37);
    return (value & 0xff).toString(16).padStart(2, "0");
  }).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function initializeSettingsDefaults() {
  const storage = getStorage();
  if (!storage) return;

  if (!storage.getItem(APP_LANG_KEY)) storage.setItem(APP_LANG_KEY, "vi");
  if (!storage.getItem(AUDIO_LANG_KEY)) storage.setItem(AUDIO_LANG_KEY, "vi");
  if (!storage.getItem(AUTO_PLAY_KEY)) storage.setItem(AUTO_PLAY_KEY, "true");
  if (!storage.getItem(BATTERY_SAVER_KEY)) storage.setItem(BATTERY_SAVER_KEY, "false");
  if (!storage.getItem(AUDIO_CUSTOM_KEY)) storage.setItem(AUDIO_CUSTOM_KEY, "false");
  if (!storage.getItem(TRACKING_RADIUS_KEY)) storage.setItem(TRACKING_RADIUS_KEY, "0.2");
  if (!storage.getItem(TRACKING_INTERVAL_KEY)) storage.setItem(TRACKING_INTERVAL_KEY, "5000");
}

export function getDeviceUuid() {
  const storage = getStorage();
  if (!storage) return "";

  const stableUuid = hashToUuid(getBrowserFingerprint());
  storage.setItem(DEVICE_UUID_KEY, stableUuid);

  return stableUuid;
}

export function resetDeviceIdentity() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(DEVICE_ID_KEY);
  storage.removeItem(DEVICE_UUID_KEY);
  storage.removeItem(PENDING_POI_KEY);
  storage.removeItem(RETURN_TO_KEY);
  storage.removeItem(ENTRY_CONTEXT_KEY);
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
  initializeSettingsDefaults();

  const payload = {
    deviceUuid: getDeviceUuid(),
    name: typeof navigator !== "undefined" ? (navigator.userAgent.includes("iPhone") ? "iPhone" : navigator.userAgent) : "browser",
    platform: "web",
    model: typeof navigator !== "undefined" ? navigator.platform : "browser",
    appVersion: "pwa-1.0",
    fingerprint: getBrowserFingerprint(),
    metadata: {
      fingerprint: getBrowserFingerprint(),
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

export function setAppLanguage(languageCode: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(APP_LANG_KEY, languageCode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("app-language-change"));
  }
}

export function getAppLanguage() {
  const storage = getStorage();
  if (!storage) return "vi";
  return storage.getItem(APP_LANG_KEY) || "vi";
}

export function setAutoPlay(value: boolean) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AUTO_PLAY_KEY, String(value));
}

export function getAutoPlay() {
  const storage = getStorage();
  if (!storage) return true;
  return storage.getItem(AUTO_PLAY_KEY) !== "false";
}

export function setBatterySaver(value: boolean) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(BATTERY_SAVER_KEY, String(value));

  if (value) {
    setTrackingRadiusKm(0.3);
    setTrackingIntervalMs(10000);
  }
}

export function getBatterySaver() {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(BATTERY_SAVER_KEY) === "true";
}

export function setTrackingRadiusKm(value: number) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(TRACKING_RADIUS_KEY, String(value));
}

export function getTrackingRadiusKm() {
  const storage = getStorage();
  if (!storage) return 0.2;
  return Number(storage.getItem(TRACKING_RADIUS_KEY) || 0.2);
}

export function setTrackingIntervalMs(value: number) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(TRACKING_INTERVAL_KEY, String(value));
}

export function getTrackingIntervalMs() {
  const storage = getStorage();
  if (!storage) return 5000;
  return Number(storage.getItem(TRACKING_INTERVAL_KEY) || 5000);
}

export function setAudioCustom(value: boolean) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AUDIO_CUSTOM_KEY, String(value));

  if (!value) {
    setAudioLanguage(getAppLanguage());
  }
}

export function getAudioCustom() {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(AUDIO_CUSTOM_KEY) === "true";
}

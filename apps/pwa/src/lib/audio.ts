import apiClient from "@/lib/api";
import { getAudioLanguage, getDeviceId } from "@/lib/device";

export type PoiAudio = {
  languageCode: string;
  languageName: string;
  scriptText: string;
};

export type PoiLike = {
  id: string;
  name: string;
  audios: PoiAudio[];
};

export function stopSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export async function playPoiAudio(poi: PoiLike, options?: { consumeFreeListen?: boolean }) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { ok: false, message: "Thiết bị không hỗ trợ audio." };
  }

  const language = getAudioLanguage();
  const audio =
    poi.audios.find((item) => item.languageCode === language) ||
    poi.audios.find((item) => item.languageCode === "vi") ||
    poi.audios[0];

  if (!audio?.scriptText) {
    return { ok: false, message: "POI chưa có audio." };
  }

  if (options?.consumeFreeListen) {
    await apiClient.post("/access/free-listen/consume", {
      deviceId: getDeviceId(),
      poiId: poi.id,
    });
  }

  await apiClient.post(`/pois/listened/${poi.id}?deviceId=${getDeviceId()}`);

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(audio.scriptText);
    utterance.lang = audio.languageCode === "vi" ? "vi-VN" : audio.languageCode;
    utterance.rate = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Phát audio thất bại"));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });

  return { ok: true, message: "" };
}

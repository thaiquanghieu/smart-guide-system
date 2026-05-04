import apiClient from "@/lib/api";
import { getAudioLanguage, getDeviceId } from "@/lib/device";

export type PoiAudio = {
  languageCode: string;
  languageName: string;
  scriptText: string;
  voiceName?: string;
};

export type PoiLike = {
  id: string;
  name: string;
  audios: PoiAudio[];
};

let stopRequested = false;
let audioPrimed = false;

function resolveSpeechLanguage(code?: string) {
  if (!code) return "vi-VN";
  if (code === "vi") return "vi-VN";
  if (code === "en") return "en-US";
  if (code === "ja") return "ja-JP";
  if (code === "ko") return "ko-KR";
  if (code === "zh") return "zh-CN";
  return code;
}

export function stopSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  stopRequested = true;
  window.speechSynthesis.cancel();
}

export async function primeAudioPlayback() {
  if (typeof window === "undefined") return;
  if (audioPrimed) return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      const context = new AudioContextClass();
      if (context.state === "suspended") {
        await context.resume().catch(() => undefined);
      }
      context.close().catch(() => undefined);
    }
  } catch {
  }

  try {
    if (window.speechSynthesis) {
      stopRequested = false;
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(".");
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        utterance.volume = 0;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.lang = resolveSpeechLanguage(getAudioLanguage());
        utterance.onend = finish;
        utterance.onerror = finish;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        window.setTimeout(() => {
          window.speechSynthesis.cancel();
          finish();
        }, 60);
      });
    }
  } catch {
  }

  audioPrimed = true;
}

export async function playTrackingTransitionCue() {
  if (typeof window === "undefined") return;

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([18, 24, 18]);
    }
  } catch {
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const startAt = context.currentTime + 0.01;
    const segments = [
      { frequency: 880, duration: 0.07, gain: 0.025 },
      { frequency: 1174, duration: 0.09, gain: 0.02 },
    ];

    let cursor = startAt;
    segments.forEach((segment, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(segment.frequency, cursor);
      gainNode.gain.setValueAtTime(0.0001, cursor);
      gainNode.gain.exponentialRampToValueAtTime(segment.gain, cursor + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, cursor + segment.duration);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(cursor);
      oscillator.stop(cursor + segment.duration);
      cursor += segment.duration + (index === 0 ? 0.045 : 0);
    });

    window.setTimeout(() => {
      context.close().catch(() => undefined);
    }, 450);

    await new Promise((resolve) => window.setTimeout(resolve, 230));
  } catch {
  }
}

function waitForVoices(timeoutMs = 2500) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve<SpeechSynthesisVoice[]>([]);
  }

  const existingVoices = window.speechSynthesis.getVoices();
  if (existingVoices.length) {
    return Promise.resolve(existingVoices);
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.speechSynthesis.onvoiceschanged = previousHandler;
      resolve(window.speechSynthesis.getVoices());
    };

    const previousHandler = window.speechSynthesis.onvoiceschanged;
    const timer = window.setTimeout(finish, timeoutMs);
    window.speechSynthesis.onvoiceschanged = () => {
      previousHandler?.call(window.speechSynthesis, new Event("voiceschanged"));
      finish();
    };
  });
}

async function speakScript(scriptText: string, languageCode?: string) {
  const speechLang = resolveSpeechLanguage(languageCode);
  const synth = window.speechSynthesis;

  await waitForVoices();

  const runAttempt = async () => {
    const voices = synth.getVoices();
    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(scriptText);
      let started = false;
      let settled = false;
      const startGuard = window.setTimeout(() => {
        if (!started && !settled) {
          settled = true;
          synth.cancel();
          reject(new Error("Audio không khởi động được"));
        }
      }, 4500);

      const finish = (handler: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(startGuard);
        handler();
      };

      utterance.lang = speechLang;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      const matchedVoice =
        voices.find((voice) => voice.lang === speechLang) ||
        voices.find((voice) => voice.lang?.startsWith(languageCode || ""));

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        started = true;
      };
      utterance.onend = () => finish(resolve);
      utterance.onerror = () => {
        if (stopRequested) {
          finish(resolve);
          return;
        }

        finish(() => reject(new Error("Phát audio thất bại")));
      };

      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
      synth.resume();
      synth.speak(utterance);
    });
  };

  try {
    await runAttempt();
  } catch (error) {
    if (stopRequested) {
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 350));
    await waitForVoices(1500);
    await runAttempt();
  }
}

export async function playPoiAudio(
  poi: PoiLike,
  options?: { consumeFreeListen?: boolean; onListenedCount?: (count: number) => void }
) {
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

  await primeAudioPlayback();
  stopRequested = false;
  await speakScript(audio.scriptText, audio.languageCode);

  if (options?.consumeFreeListen) {
    await apiClient.post("/access/free-listen/consume", {
      deviceId: getDeviceId(),
      poiId: poi.id,
    }).catch(() => null);
  }

  const listenedResponse = await apiClient
    .post(`/pois/listened/${poi.id}?deviceId=${getDeviceId()}`)
    .then((response) => {
      const listenedCount = Number(response?.data?.listened_count || 0);
      if (listenedCount) {
        options?.onListenedCount?.(listenedCount);
      }
      return response;
    })
    .catch(() => null);

  const listenedCount = Number((listenedResponse as any)?.data?.listened_count || 0);

  return { ok: true, message: "", listenedCount };
}

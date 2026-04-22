import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ToastBanner from "@/components/ToastBanner";
import apiClient from "@/lib/api";
import {
  ensureDeviceReady,
  getAppLanguage,
  getAudioCustom,
  getAudioLanguage,
  getAutoPlay,
  getBatterySaver,
  getDeviceId,
  getTrackingIntervalMs,
  getTrackingRadiusKm,
  initializeSettingsDefaults,
  resetDeviceIdentity,
  setAppLanguage,
  setAudioCustom,
  setAudioLanguage,
  setAutoPlay,
  setBatterySaver,
  setReturnTo,
  setTrackingIntervalMs,
  setTrackingRadiusKm,
} from "@/lib/device";

type ProfileSummary = {
  deviceName: string;
  platform: string;
  model: string;
  appVersion: string;
  favoriteCount: number;
  listenedPoiCount: number;
};

let profileCache:
  | {
      profile: ProfileSummary | null;
      daysLeftText: string;
      appLang: string;
      audioLang: string;
      audioCustom: boolean;
      autoPlay: boolean;
      batterySaver: boolean;
      trackingRadiusIndex: number;
      trackingIntervalIndex: number;
    }
  | null = null;

const languages = [
  { code: "vi", name: "Tiếng Việt" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [daysLeftText, setDaysLeftText] = useState("Đang kiểm tra...");
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState("");
  const [appLang, setAppLangState] = useState("vi");
  const [audioLang, setAudioLangState] = useState("vi");
  const [audioCustom, setAudioCustomState] = useState(false);
  const [autoPlay, setAutoPlayState] = useState(true);
  const [batterySaver, setBatterySaverState] = useState(false);
  const [trackingRadiusIndex, setTrackingRadiusIndex] = useState(1);
  const [trackingIntervalIndex, setTrackingIntervalIndex] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");

  const radiusValue = trackingRadiusIndex === 0 ? 0.1 : trackingRadiusIndex === 2 ? 0.3 : 0.2;
  const intervalValue = trackingIntervalIndex === 0 ? 2000 : trackingIntervalIndex === 2 ? 10000 : 5000;

  useEffect(() => {
    initializeSettingsDefaults();

    setAppLangState(getAppLanguage());
    setAudioLangState(getAudioLanguage());
    setAudioCustomState(getAudioCustom());
    setAutoPlayState(getAutoPlay());
    setBatterySaverState(getBatterySaver());

    const radius = getTrackingRadiusKm();
    const interval = getTrackingIntervalMs();
    setTrackingRadiusIndex(radius === 0.1 ? 0 : radius === 0.3 ? 2 : 1);
    setTrackingIntervalIndex(interval === 2000 ? 0 : interval === 10000 ? 2 : 1);

    const load = async () => {
      try {
        if (profileCache) {
          setProfile(profileCache.profile);
          setDaysLeftText(profileCache.daysLeftText);
          setAppLangState(profileCache.appLang);
          setAudioLangState(profileCache.audioLang);
          setAudioCustomState(profileCache.audioCustom);
          setAutoPlayState(profileCache.autoPlay);
          setBatterySaverState(profileCache.batterySaver);
          setTrackingRadiusIndex(profileCache.trackingRadiusIndex);
          setTrackingIntervalIndex(profileCache.trackingIntervalIndex);
          return;
        }

        await ensureDeviceReady();

        const [profileResponse, paymentResponse] = await Promise.all([
          apiClient.get(`/profiles/${getDeviceId()}`),
          apiClient.get(`/payments/check?deviceId=${getDeviceId()}`),
        ]);

        setProfile(profileResponse.data);

        if (paymentResponse.data?.isActive && paymentResponse.data?.expire) {
          const expireDate = new Date(paymentResponse.data.expire);
          const diffDays = Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          setDaysLeftText(`Còn ${diffDays} ngày sử dụng`);
        } else {
          setDaysLeftText("Chưa có gói hoạt động");
        }
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || "Không thể tải hồ sơ.");
      }
    };

    load();
  }, []);

  useEffect(() => {
    profileCache = {
      profile,
      daysLeftText,
      appLang,
      audioLang,
      audioCustom,
      autoPlay,
      batterySaver,
      trackingRadiusIndex,
      trackingIntervalIndex,
    };
  }, [appLang, audioCustom, audioLang, autoPlay, batterySaver, daysLeftText, profile, trackingIntervalIndex, trackingRadiusIndex]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const menuItems = [
    { icon: "history.png", label: "Lịch sử nghe" },
    { icon: "favorite.png", label: "Địa điểm yêu thích" },
    { icon: "settings.png", label: "Cài đặt", onClick: () => setShowSettings(true) },
    { icon: "support.png", label: "Liên hệ hỗ trợ" },
    { icon: "language.png", label: "Ngôn ngữ" },
    { icon: "info.png", label: "Về ứng dụng" },
  ];

  return (
    <>
      <ToastBanner message={toast} />

      <main className="app-shell space-y-5">
        <AppHeader
          actionLabel="Gia hạn"
          onActionClick={() => {
            setReturnTo("/profile");
            router.push("/paywall?returnTo=%2Fprofile");
          }}
        />

        <section className="flex flex-col items-center">
          <div className="relative">
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-[3px] border-[#0F5BD7] bg-white shadow-[0_8px_20px_rgba(15,91,215,0.16)]">
              <img src="/assets/user.png" alt="Avatar" className="h-[86px] w-[86px] object-contain" />
            </div>
            <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#0F5BD7]">
              <img src="/assets/edit.png" alt="Edit" className="h-[18px] w-[18px]" />
            </div>
          </div>

          <h2 className="mt-4 text-[24px] font-bold text-[#111827]">{profile?.deviceName || "iPhone"}</h2>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            {(profile?.platform || "IOS").toUpperCase()} • {profile?.model || "iPhone"} • v{profile?.appVersion || "1.0"}
          </p>
          <div className="mt-2 rounded bg-[#E8F0FF] px-2 py-1 text-[15px] font-bold text-[#0F5BD7]">
            {daysLeftText}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-[15px]">
          <div className="ios-card rounded-[16px] px-4 py-4 text-center">
            <div className="text-[22px] font-bold text-[#0F5BD7]">{profile?.favoriteCount ?? 0}</div>
            <div className="mt-1 text-[12px] text-[#6B7280]">YÊU THÍCH</div>
          </div>
          <div className="ios-card rounded-[16px] px-4 py-4 text-center">
            <div className="text-[22px] font-bold text-[#0F5BD7]">{profile?.listenedPoiCount ?? 0}</div>
            <div className="mt-1 text-[12px] text-[#6B7280]">ĐIỂM ĐÃ NGHE</div>
          </div>
        </section>

        <section className="ios-card overflow-hidden rounded-[20px]">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`grid w-full grid-cols-[60px,1fr,auto] items-center px-4 py-4 text-left ${
                index < menuItems.length - 1 ? "border-b border-[#E5E7EB]" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F9FAFB]">
                <img src={`/assets/${item.icon}`} alt={item.label} className="h-5 w-5" />
              </div>
              <span className="text-[16px] text-[#111827]">{item.label}</span>
              <span className="text-[18px] text-[#9CA3AF]">›</span>
            </button>
          ))}
        </section>

        <button
          type="button"
          className="ios-card grid grid-cols-[60px,1fr] items-center rounded-[20px] px-4 py-4 text-left"
          onClick={async () => {
            const deviceId = getDeviceId();
            if (deviceId) {
              await apiClient.delete(`/devices/${deviceId}`).catch(() => undefined);
            }
            resetDeviceIdentity();
            router.replace("/");
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F9FAFB]">
            <img src="/assets/logout.png" alt="Delete" className="h-5 w-5" />
          </div>
          <span className="text-[16px] text-[#EF4444]">Xóa thiết bị</span>
        </button>

        <section className="pb-4 text-center text-[12px] text-[#9CA3AF]">
          {errorMessage ? <p className="mb-2 text-[#DC2626]">{errorMessage}</p> : null}
          <p>Điều khoản   Bảo mật   Về chúng tôi</p>
          <p className="mt-1">© 2024 SMART GUIDE VIETNAM</p>
          <p className="mt-1">Version 2.4.0</p>
        </section>
      </main>

      {showSettings ? (
        <div className="fixed inset-0 z-30 bg-black/40">
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[540px] rounded-t-[20px] bg-white px-5 pb-6 pt-5">
            <h3 className="text-[18px] font-bold text-[#111827]">Cài đặt</h3>

            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <span>Tự động phát audio</span>
                <button
                  type="button"
                  className={`flex h-8 w-[52px] rounded-full p-1 ${autoPlay ? "justify-end bg-[#0F5BD7]" : "justify-start bg-[#E5E7EB]"}`}
                  onClick={() => {
                    const nextValue = !autoPlay;
                    setAutoPlayState(nextValue);
                    setAutoPlay(nextValue);
                  }}
                >
                  <span className="h-6 w-6 rounded-full bg-white" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>Tiết kiệm pin</span>
                <button
                  type="button"
                  className={`flex h-8 w-[52px] rounded-full p-1 ${batterySaver ? "justify-end bg-[#0F5BD7]" : "justify-start bg-[#E5E7EB]"}`}
                  onClick={() => {
                    const nextValue = !batterySaver;
                    setBatterySaverState(nextValue);
                    setBatterySaver(nextValue);
                    if (nextValue) {
                      setTrackingRadiusIndex(2);
                      setTrackingIntervalIndex(2);
                    }
                  }}
                >
                  <span className="h-6 w-6 rounded-full bg-white" />
                </button>
              </div>

              <div>
                <p className="text-[13px] text-[#9CA3AF]">Bán kính nhận diện</p>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={trackingRadiusIndex}
                  disabled={batterySaver}
                  onChange={(event) => {
                    const nextIndex = Number(event.target.value);
                    setTrackingRadiusIndex(nextIndex);
                    setTrackingRadiusKm(nextIndex === 0 ? 0.1 : nextIndex === 2 ? 0.3 : 0.2);
                  }}
                  className="mt-4 w-full accent-[#0F5BD7]"
                />
                <p className="mt-2 text-[12px] text-[#9CA3AF]">{Math.round(radiusValue * 1000)}m</p>
              </div>

              <div>
                <p className="text-[13px] text-[#9CA3AF]">Tần suất quét</p>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={trackingIntervalIndex}
                  disabled={batterySaver}
                  onChange={(event) => {
                    const nextIndex = Number(event.target.value);
                    setTrackingIntervalIndex(nextIndex);
                    setTrackingIntervalMs(nextIndex === 0 ? 2000 : nextIndex === 2 ? 10000 : 5000);
                  }}
                  className="mt-4 w-full accent-[#0F5BD7]"
                />
                <p className="mt-2 text-[12px] text-[#9CA3AF]">{intervalValue / 1000} giây</p>
                <p className="mt-2 text-[12px] text-[#9CA3AF]">
                  Đang dùng: {Math.round(radiusValue * 1000)}m / {intervalValue / 1000} giây
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[14px] font-bold">Ngôn ngữ</h4>
                <div className="grid grid-cols-[1fr,160px] items-center gap-3">
                  <span>Ngôn ngữ ứng dụng</span>
                  <select
                    value={appLang}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setAppLangState(nextValue);
                      setAppLanguage(nextValue);
                      if (!audioCustom) {
                        setAudioLangState(nextValue);
                        setAudioLanguage(nextValue);
                      }
                    }}
                    className="rounded-[10px] border border-[#E5E7EB] px-3 py-3 text-[#6B7280]"
                  >
                    {languages.map((language) => (
                      <option key={language.code} value={language.code}>{language.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span>Tùy chỉnh ngôn ngữ đọc</span>
                  <button
                    type="button"
                    className={`flex h-8 w-[52px] rounded-full p-1 ${audioCustom ? "justify-end bg-[#0F5BD7]" : "justify-start bg-[#E5E7EB]"}`}
                    onClick={() => {
                      const nextValue = !audioCustom;
                      setAudioCustomState(nextValue);
                      setAudioCustom(nextValue);
                      if (!nextValue) {
                        setAudioLangState(appLang);
                      }
                    }}
                  >
                    <span className="h-6 w-6 rounded-full bg-white" />
                  </button>
                </div>

                <div className="grid grid-cols-[1fr,160px] items-center gap-3">
                  <span>Ngôn ngữ thuyết minh</span>
                  <select
                    value={audioLang}
                    disabled={!audioCustom}
                    onChange={(event) => {
                      setAudioLangState(event.target.value);
                      setAudioLanguage(event.target.value);
                    }}
                    className="rounded-[10px] border border-[#E5E7EB] px-3 py-3 text-[#6B7280] disabled:bg-[#F3F4F6]"
                  >
                    {languages.map((language) => (
                      <option key={language.code} value={language.code}>{language.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-full rounded-[12px] bg-[#0F5BD7] py-3 text-white"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

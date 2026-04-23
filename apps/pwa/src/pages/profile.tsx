import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ToastBanner from "@/components/ToastBanner";
import apiClient, { assetUrl } from "@/lib/api";
import { useAppI18n } from "@/lib/i18n";
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

type ProfilePoiItem = {
  id: string;
  name: string;
  category: string;
  address: string;
  imageUrl: string;
  listened_count: number;
  rating_avg: number;
  created_at?: string;
  last_listened_at?: string;
  listen_count?: number;
};

type PaymentHistoryItem = {
  id: number;
  code: string;
  amount: number;
  status: string;
  status_label: string;
  payment_type: string;
  description?: string;
  plan_name?: string;
  created_at?: string;
  used_at?: string;
  confirmed_at?: string;
  rejected_reason?: string;
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
      historyItems: ProfilePoiItem[];
      favoriteItems: ProfilePoiItem[];
      paymentItems: PaymentHistoryItem[];
      historyLoaded: boolean;
      favoritesLoaded: boolean;
      paymentsLoaded: boolean;
      reopenOverlay: "" | "history" | "favorites" | "payments";
    }
  | null = null;

const PROFILE_OVERLAY_KEY = "profile_overlay_state";
const PROFILE_REFRESH_KEY = "profile_force_refresh";

const languages = [
  { code: "vi", name: "Tiếng Việt" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { lang, t } = useAppI18n();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [daysLeftText, setDaysLeftText] = useState(t("profile.checking"));
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const [appLang, setAppLangState] = useState("vi");
  const [audioLang, setAudioLangState] = useState("vi");
  const [audioCustom, setAudioCustomState] = useState(false);
  const [autoPlay, setAutoPlayState] = useState(true);
  const [batterySaver, setBatterySaverState] = useState(false);
  const [trackingRadiusIndex, setTrackingRadiusIndex] = useState(1);
  const [trackingIntervalIndex, setTrackingIntervalIndex] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [historyItems, setHistoryItems] = useState<ProfilePoiItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<ProfilePoiItem[]>([]);
  const [paymentItems, setPaymentItems] = useState<PaymentHistoryItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

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
        const forceRefresh =
          typeof window !== "undefined" && sessionStorage.getItem(PROFILE_REFRESH_KEY) === "1";

        if (profileCache && !forceRefresh) {
          setProfile(profileCache.profile);
          setDaysLeftText(profileCache.daysLeftText);
          setAppLangState(profileCache.appLang);
          setAudioLangState(profileCache.audioLang);
          setAudioCustomState(profileCache.audioCustom);
          setAutoPlayState(profileCache.autoPlay);
          setBatterySaverState(profileCache.batterySaver);
          setTrackingRadiusIndex(profileCache.trackingRadiusIndex);
          setTrackingIntervalIndex(profileCache.trackingIntervalIndex);
          setHistoryItems(profileCache.historyItems || []);
          setFavoriteItems(profileCache.favoriteItems || []);
          setPaymentItems(profileCache.paymentItems || []);
          setHistoryLoaded(!!profileCache.historyLoaded);
          setFavoritesLoaded(!!profileCache.favoritesLoaded);
          setPaymentsLoaded(!!profileCache.paymentsLoaded);

          const reopenOverlay = sessionStorage.getItem(PROFILE_OVERLAY_KEY) || profileCache.reopenOverlay;
          if (reopenOverlay === "history") {
            setShowHistory(true);
          } else if (reopenOverlay === "favorites") {
            setShowFavorites(true);
          } else if (reopenOverlay === "payments") {
            setShowPayments(true);
          }
          sessionStorage.removeItem(PROFILE_OVERLAY_KEY);
          return;
        }

        if (typeof window !== "undefined") {
          sessionStorage.removeItem(PROFILE_REFRESH_KEY);
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
          setDaysLeftText(t("profile.daysLeft", { count: diffDays }));
        } else {
          setDaysLeftText(t("profile.noPlan"));
        }
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || t("profile.loadError"));
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
      historyItems,
      favoriteItems,
      paymentItems,
      historyLoaded,
      favoritesLoaded,
      paymentsLoaded,
      reopenOverlay: showHistory ? "history" : showFavorites ? "favorites" : showPayments ? "payments" : "",
    };
  }, [appLang, audioCustom, audioLang, autoPlay, batterySaver, daysLeftText, favoriteItems, favoritesLoaded, historyItems, historyLoaded, paymentItems, paymentsLoaded, profile, showFavorites, showHistory, showPayments, trackingIntervalIndex, trackingRadiusIndex]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const hasOverlay = showSettings || showLanguage || showHistory || showFavorites || showPayments || showDeleteConfirm;
    if (!hasOverlay) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [showDeleteConfirm, showFavorites, showHistory, showLanguage, showPayments, showSettings]);

  useEffect(() => {
    if (!showLanguage) return;
    setAppLangState(getAppLanguage());
    setAudioLangState(getAudioLanguage());
    setAudioCustomState(getAudioCustom());
  }, [showLanguage]);

  useEffect(() => {
    setAppLangState(lang);
    if (!audioCustom) {
      setAudioLangState(lang);
    }
  }, [audioCustom, lang]);

  const formatDateTime = (value?: string) => {
    if (!value) return "";

    try {
      return new Intl.DateTimeFormat(
        appLang === "vi" ? "vi-VN" : appLang === "ja" ? "ja-JP" : appLang === "ko" ? "ko-KR" : appLang === "zh" ? "zh-CN" : "en-US",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(new Date(value));
    } catch {
      return value;
    }
  };

  const openHistory = async () => {
    setShowHistory(true);
    if (historyLoaded || historyLoading) return;

    try {
      setHistoryLoading(true);
      await ensureDeviceReady();
      const response = await apiClient.get(`/profiles/${getDeviceId()}/history?lang=${lang}`);
      setHistoryItems(response.data || []);
      setHistoryLoaded(true);
    } catch (error: any) {
      setToast(error?.response?.data?.message || t("profile.loadError"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openFavorites = async () => {
    setShowFavorites(true);
    if (favoritesLoaded || favoritesLoading) return;

    try {
      setFavoritesLoading(true);
      await ensureDeviceReady();
      const response = await apiClient.get(`/profiles/${getDeviceId()}/favorites?lang=${lang}`);
      setFavoriteItems(response.data || []);
      setFavoritesLoaded(true);
    } catch (error: any) {
      setToast(error?.response?.data?.message || t("profile.loadError"));
    } finally {
      setFavoritesLoading(false);
    }
  };

  const openPayments = async () => {
    setShowPayments(true);
    if (paymentsLoaded || paymentsLoading) return;

    try {
      setPaymentsLoading(true);
      await ensureDeviceReady();
      const response = await apiClient.get(`/payments/history?deviceId=${getDeviceId()}`);
      setPaymentItems(response.data || []);
      setPaymentsLoaded(true);
    } catch (error: any) {
      setToast(error?.response?.data?.message || t("profile.loadError"));
    } finally {
      setPaymentsLoading(false);
    }
  };

  const openDetailFromOverlay = (poiId: string, overlay: "history" | "favorites") => {
    sessionStorage.setItem(PROFILE_OVERLAY_KEY, overlay);
    router.push(`/detail?poiId=${poiId}`);
  };

  const menuItems = [
    { icon: "history.png", label: t("profile.history"), onClick: openHistory },
    { icon: "favorite.png", label: t("profile.favoritePlaces"), onClick: openFavorites },
    { icon: "ticket.png", label: "Lịch sử thanh toán", onClick: openPayments },
    { icon: "settings.png", label: t("profile.settings"), onClick: () => setShowSettings(true) },
    { icon: "language.png", label: t("profile.language"), onClick: () => setShowLanguage(true) },
    { icon: "support.png", label: t("profile.support") },
    { icon: "info.png", label: t("profile.about") },
  ];

  return (
    <>
      <ToastBanner message={toast} />

      <main className="app-shell space-y-5">
        <AppHeader
          actionLabel={t("profile.renew")}
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
            <div className="mt-1 text-[12px] text-[#6B7280]">{t("profile.favoriteCount")}</div>
          </div>
          <div className="ios-card rounded-[16px] px-4 py-4 text-center">
            <div className="text-[22px] font-bold text-[#0F5BD7]">{profile?.listenedPoiCount ?? 0}</div>
            <div className="mt-1 text-[12px] text-[#6B7280]">{t("profile.listenedCount")}</div>
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
          onClick={() => setShowDeleteConfirm(true)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F9FAFB]">
            <img src="/assets/logout.png" alt="Delete" className="h-5 w-5" />
          </div>
          <span className="text-[16px] text-[#EF4444]">{t("profile.deleteDevice")}</span>
        </button>

        <section className="pb-4 text-center text-[12px] text-[#9CA3AF]">
          {errorMessage ? <p className="mb-2 text-[#DC2626]">{errorMessage}</p> : null}
          <p>Điều khoản   Bảo mật   Về chúng tôi</p>
          <p className="mt-1">© 2024 SMART GUIDE VIETNAM</p>
          <p className="mt-1">Version 2.4.0</p>
        </section>
      </main>

      {showSettings ? (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowSettings(false)}>
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[540px] rounded-t-[20px] bg-white px-5 pb-6 pt-5">
            <div onClick={(event) => event.stopPropagation()}>
              <h3 className="text-[18px] font-bold text-[#111827]">{t("profile.settingsTitle")}</h3>

            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <span>{t("profile.autoPlay")}</span>
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
                <span>{t("profile.batterySaver")}</span>
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
                <p className="text-[13px] text-[#9CA3AF]">{t("profile.detectRadius")}</p>
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
                <p className="text-[13px] text-[#9CA3AF]">{t("profile.scanRate")}</p>
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
                <p className="mt-2 text-[12px] text-[#9CA3AF]">{t("profile.currentUsage", { radius: Math.round(radiusValue * 1000), seconds: intervalValue / 1000 })}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-full rounded-[12px] bg-[#0F5BD7] py-3 text-white"
              >
                {t("common.close")}
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {showLanguage ? (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowLanguage(false)}>
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[540px] rounded-t-[20px] bg-white px-5 pb-6 pt-5">
            <div onClick={(event) => event.stopPropagation()}>
              <h3 className="text-[18px] font-bold text-[#111827]">{t("profile.languageTitle")}</h3>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-[1fr,160px] items-center gap-3">
                <span>{t("profile.appLanguage")}</span>
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
                <span>{t("profile.customAudioLanguage")}</span>
                <button
                  type="button"
                  className={`flex h-8 w-[52px] rounded-full p-1 ${audioCustom ? "justify-end bg-[#0F5BD7]" : "justify-start bg-[#E5E7EB]"}`}
                  onClick={() => {
                    const nextValue = !audioCustom;
                    setAudioCustomState(nextValue);
                    setAudioCustom(nextValue);
                    if (!nextValue) {
                      setAudioLangState(appLang);
                      setAudioLanguage(appLang);
                    }
                  }}
                >
                  <span className="h-6 w-6 rounded-full bg-white" />
                </button>
              </div>

              <div className="grid grid-cols-[1fr,160px] items-center gap-3">
                <span>{t("profile.audioLanguage")}</span>
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

              <button
                type="button"
                onClick={() => setShowLanguage(false)}
                className="w-full rounded-[12px] bg-[#0F5BD7] py-3 text-white"
              >
                {t("common.close")}
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {showHistory ? (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setShowHistory(false)}
          onTouchMove={(event) => event.preventDefault()}
        >
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto flex h-[78vh] max-w-[540px] flex-col overflow-hidden rounded-t-[20px] bg-white px-5 pb-6 pt-5"
          >
            <div className="flex h-full flex-col" onClick={(event) => event.stopPropagation()}>
              <h3 className="text-[18px] font-bold text-[#111827]">{t("profile.historyTitle")}</h3>

              <div
                className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-3"
                style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
                onTouchMove={(event) => event.stopPropagation()}
              >
                {historyLoading ? <p className="py-10 text-center text-[14px] text-[#6B7280]">{t("common.loading")}</p> : null}

                {!historyLoading && historyItems.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#D1D5DB] px-5 py-8 text-center text-[14px] text-[#6B7280]">
                    {t("profile.emptyHistory")}
                  </div>
                ) : null}

                {!historyLoading
                  ? historyItems.map((item) => (
                      <button
                        key={`history-${item.id}`}
                        type="button"
                        onClick={() => openDetailFromOverlay(item.id, "history")}
                        className="ios-card grid w-full grid-cols-[76px,1fr] gap-3 rounded-[18px] p-3 text-left"
                      >
                        <img
                          src={assetUrl(item.imageUrl) || "/icon-192.png"}
                          alt={item.name}
                          className="h-[76px] w-[76px] rounded-[16px] object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#0F5BD7]">{item.category}</p>
                          <p className="mt-1 line-clamp-2 text-[16px] font-semibold leading-[1.28] text-[#111827]">{item.name}</p>
                          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-[#6B7280]">{item.address}</p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                            <span className="font-semibold text-[#0F5BD7]">{t("profile.lastListened")}: {formatDateTime(item.last_listened_at)}</span>
                            <span className="font-semibold text-[#C47D00]">{t("profile.listenTimes", { count: item.listen_count || 0 })}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  : null}
              </div>

              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-full rounded-[12px] bg-[#0F5BD7] py-3 text-white"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFavorites ? (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setShowFavorites(false)}
          onTouchMove={(event) => event.preventDefault()}
        >
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto flex h-[78vh] max-w-[540px] flex-col overflow-hidden rounded-t-[20px] bg-white px-5 pb-6 pt-5"
          >
            <div className="flex h-full flex-col" onClick={(event) => event.stopPropagation()}>
              <h3 className="text-[18px] font-bold text-[#111827]">{t("profile.favoritesTitle")}</h3>

              <div
                className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-3"
                style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
                onTouchMove={(event) => event.stopPropagation()}
              >
                {favoritesLoading ? <p className="py-10 text-center text-[14px] text-[#6B7280]">{t("common.loading")}</p> : null}

                {!favoritesLoading && favoriteItems.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#D1D5DB] px-5 py-8 text-center text-[14px] text-[#6B7280]">
                    {t("profile.emptyFavorites")}
                  </div>
                ) : null}

                {!favoritesLoading
                  ? favoriteItems.map((item) => (
                      <button
                        key={`favorite-${item.id}`}
                        type="button"
                        onClick={() => openDetailFromOverlay(item.id, "favorites")}
                        className="ios-card grid w-full grid-cols-[76px,1fr] gap-3 rounded-[18px] p-3 text-left"
                      >
                        <img
                          src={assetUrl(item.imageUrl) || "/icon-192.png"}
                          alt={item.name}
                          className="h-[76px] w-[76px] rounded-[16px] object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#0F5BD7]">{item.category}</p>
                          <p className="mt-1 line-clamp-2 text-[16px] font-semibold leading-[1.28] text-[#111827]">{item.name}</p>
                          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-[#6B7280]">{item.address}</p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                            <span className="font-semibold text-[#0F5BD7]">{t("profile.addedFavorite")}: {formatDateTime(item.created_at)}</span>
                            <span className="font-semibold text-[#C47D00]">★ {Number(item.rating_avg || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  : null}
              </div>

              <button
                type="button"
                onClick={() => setShowFavorites(false)}
                className="w-full rounded-[12px] bg-[#0F5BD7] py-3 text-white"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPayments ? (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setShowPayments(false)}
          onTouchMove={(event) => event.preventDefault()}
        >
          <div className="absolute bottom-0 left-0 right-0 mx-auto flex h-[78vh] max-w-[540px] flex-col overflow-hidden rounded-t-[20px] bg-white px-5 pb-6 pt-5">
            <div className="flex h-full flex-col" onClick={(event) => event.stopPropagation()}>
              <h3 className="text-[18px] font-bold text-[#111827]">Lịch sử thanh toán</h3>

              <div
                className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-3"
                style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
                onTouchMove={(event) => event.stopPropagation()}
              >
                {paymentsLoading ? <p className="py-10 text-center text-[14px] text-[#6B7280]">{t("common.loading")}</p> : null}

                {!paymentsLoading && paymentItems.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#D1D5DB] px-5 py-8 text-center text-[14px] text-[#6B7280]">
                    Chưa có giao dịch thanh toán nào.
                  </div>
                ) : null}

                {!paymentsLoading
                  ? paymentItems.map((item) => {
                      const statusClass =
                        item.status === "confirmed" || item.status === "used"
                          ? "bg-[#ECFDF5] text-[#047857]"
                          : item.status === "rejected"
                            ? "bg-[#FEF2F2] text-[#B91C1C]"
                            : "bg-[#FFF7ED] text-[#C47D00]";
                      const dateText = item.confirmed_at || item.used_at || item.created_at;

                      return (
                        <button
                          key={`payment-${item.id}`}
                          type="button"
                          onClick={() => setSelectedPayment(item)}
                          className="ios-card w-full rounded-[18px] p-4 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[15px] font-bold text-[#111827]">
                                {item.plan_name || item.description || "Thanh toán Smart Guide"}
                              </p>
                              <p className="mt-1 text-[12px] font-semibold text-[#0F5BD7]">Mã: {item.code}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ${statusClass}`}>
                              {item.status_label || item.status}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                            <div className="rounded-[14px] bg-[#F3F7FF] px-3 py-3">
                              <p className="text-[#6B7280]">Số tiền</p>
                              <p className="mt-1 font-bold text-[#0F5BD7]">{Number(item.amount || 0).toLocaleString("vi-VN")}đ</p>
                            </div>
                            <div className="rounded-[14px] bg-[#F9FAFB] px-3 py-3">
                              <p className="text-[#6B7280]">Thời điểm</p>
                              <p className="mt-1 font-semibold text-[#111827]">{formatDateTime(dateText)}</p>
                            </div>
                          </div>

                          {item.rejected_reason ? (
                            <p className="mt-3 rounded-[12px] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">
                              {item.rejected_reason}
                            </p>
                          ) : null}
                        </button>
                      );
                    })
                  : null}
              </div>

              <button
                type="button"
                onClick={() => setShowPayments(false)}
                className="w-full rounded-[12px] bg-[#0F5BD7] py-3 text-white"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPayment ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-5" onClick={() => setSelectedPayment(null)}>
          <div className="w-full max-w-[360px] rounded-[20px] bg-white p-5 text-[#111827]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-bold">{selectedPayment.plan_name || selectedPayment.description || "Thanh toán Smart Guide"}</h3>
                <p className="mt-1 text-[12px] font-semibold text-[#0F5BD7]">Mã: {selectedPayment.code}</p>
              </div>
              <button type="button" onClick={() => setSelectedPayment(null)} className="text-[24px] leading-none text-[#9CA3AF]">×</button>
            </div>

            <div className="mt-5 space-y-3 text-[14px]">
              <PaymentInfoRow label="Trạng thái" value={selectedPayment.status_label || selectedPayment.status} />
              <PaymentInfoRow label="Số tiền" value={`${Number(selectedPayment.amount || 0).toLocaleString("vi-VN")}đ`} accent />
              <PaymentInfoRow label="Loại" value={selectedPayment.payment_type} />
              <PaymentInfoRow label="Tạo lúc" value={formatDateTime(selectedPayment.created_at)} />
              <PaymentInfoRow label="Xác nhận" value={formatDateTime(selectedPayment.confirmed_at || selectedPayment.used_at)} />
            </div>

            {selectedPayment.rejected_reason ? (
              <div className="mt-4 rounded-[12px] bg-[#FEF2F2] px-3 py-3 text-[13px] text-[#B91C1C]">
                {selectedPayment.rejected_reason}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setSelectedPayment(null)}
              className="mt-5 w-full rounded-[12px] bg-[#0F5BD7] py-3 text-white"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[540px] rounded-t-[20px] bg-white px-5 pb-6 pt-5">
            <div onClick={(event) => event.stopPropagation()}>
              <h3 className="text-[18px] font-bold text-[#111827]">{t("profile.deleteDevice")}</h3>
              <p className="mt-3 text-[14px] leading-[1.5] text-[#6B7280]">
                Thiết bị sẽ bị xóa, gói đã mua sẽ mất và khi vào lại sẽ như máy mới. Bạn có chắc muốn tiếp tục?
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-[12px] bg-[#F3F4F6] py-3 font-semibold text-[#111827]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const deviceId = getDeviceId();
                    if (deviceId) {
                      await apiClient.delete(`/devices/${deviceId}`).catch(() => undefined);
                    }
                    setShowDeleteConfirm(false);
                    resetDeviceIdentity();
                    profileCache = null;
                    router.replace("/paywall?returnTo=%2F");
                  }}
                  className="rounded-[12px] bg-[#EF4444] py-3 font-semibold text-white"
                >
                  {t("common.ok")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

function PaymentInfoRow({ label, value, accent = false }: { label: string; value?: string; accent?: boolean }) {
  return (
    <div className="rounded-[14px] bg-[#F8FAFC] px-3 py-3">
      <p className="text-[12px] text-[#6B7280]">{label}</p>
      <p className={`mt-1 font-semibold ${accent ? "text-[#0F5BD7]" : "text-[#111827]"}`}>{value || "Chưa có"}</p>
    </div>
  );
}

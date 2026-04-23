import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import ToastBanner from "@/components/ToastBanner";
import apiClient, { assetUrl } from "@/lib/api";
import { getLanguageName, translatePoi, useAppI18n } from "@/lib/i18n";
import { playPoiAudio, stopSpeech } from "@/lib/audio";
import { ensureDeviceReady, getAutoPlay, getDeviceId, notifyProfileDataChanged, setPendingPoiId, setReturnTo } from "@/lib/device";
import { calculateDistanceKm, type GeoPoint } from "@/lib/location";

type Poi = {
  id: string;
  name: string;
  category: string;
  short_description?: string;
  description: string;
  address: string;
  priceText: string;
  open_hours?: string;
  latitude: number;
  longitude: number;
  listened_count: number;
  rating_avg: number;
  rating_count?: number;
  user_rating?: number;
  is_favorite: boolean;
  images: string[];
  audios: { languageCode: string; languageName: string; voiceName: string; scriptText: string }[];
};

const detailCache = new Map<
  string,
  {
    poi: Poi;
    subscriptionActive: boolean;
    freePlaysRemaining: number;
    imageIndex: number;
  }
>();

export default function DetailPage() {
  const router = useRouter();
  const { lang, t } = useAppI18n();
  const [poi, setPoi] = useState<Poi | null>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [freePlaysRemaining, setFreePlaysRemaining] = useState(0);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [nameExpanded, setNameExpanded] = useState(false);
  const [addressExpanded, setAddressExpanded] = useState(false);
  const [priceExpanded, setPriceExpanded] = useState(false);
  const autoPlayedPoiRef = useRef("");

  useEffect(() => {
    if (!router.isReady) return;

    const load = async () => {
      try {
        const poiId = typeof router.query.poiId === "string" ? router.query.poiId : "";
        const cached = detailCache.get(poiId);

        if (cached) {
          setPoi(translatePoi<Poi>(cached.poi, lang));
          setRatingValue(Number(cached.poi.user_rating || 0));
          setSubscriptionActive(cached.subscriptionActive);
          setFreePlaysRemaining(cached.freePlaysRemaining);
          setImageIndex(cached.imageIndex);
          return;
        }

        await ensureDeviceReady();

        const deviceId = getDeviceId();
        const [poiResponse, accessResponse] = await Promise.all([
          apiClient.get(`/pois/${poiId}?deviceId=${deviceId}&lang=${lang}`),
          apiClient.get(`/access/free-listen?deviceId=${deviceId}`),
        ]);

        const hasActiveSubscription = !!accessResponse.data?.hasActiveSubscription;
        const remainingFreePlays = Number(accessResponse.data?.freePlaysRemaining || 0);

        if (!hasActiveSubscription && remainingFreePlays <= 0) {
          setReturnTo(`/detail?poiId=${encodeURIComponent(poiId)}`);
          router.replace(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poiId}`)}`);
          return;
        }

        setPoi(translatePoi<Poi>(poiResponse.data, lang));
        setRatingValue(Number(poiResponse.data?.user_rating || 0));
        setSubscriptionActive(hasActiveSubscription);
        setFreePlaysRemaining(remainingFreePlays);
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || t("detail.loadError"));
      }
    };

    load();
  }, [lang, router, router.isReady, router.query.poiId, t]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const poiId = typeof router.query.poiId === "string" ? router.query.poiId : "";
    if (!poiId || !poi) return;

    detailCache.set(poiId, {
      poi,
      subscriptionActive,
      freePlaysRemaining,
      imageIndex,
    });
  }, [freePlaysRemaining, imageIndex, poi, router.query.poiId, subscriptionActive]);

  useEffect(() => {
    setNameExpanded(false);
    setAddressExpanded(false);
    setPriceExpanded(false);
  }, [poi?.id]);

  const distanceText = useMemo(() => {
    if (!poi || !userLocation) return "2,4 km";

    const km = calculateDistanceKm(userLocation, { latitude: poi.latitude, longitude: poi.longitude });
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1).replace(".", ",")} km`;
  }, [poi, userLocation]);

  if (!poi) return <main className="app-shell">{errorMessage || t("detail.loading")}</main>;

  const currentImage = assetUrl(poi.images?.[imageIndex]) || "/assets/appiconfg.png";
  const currentAudio = poi.audios?.[0];
  const currentShareUrl = typeof window !== "undefined" ? window.location.href : "";

  const toggleFavorite = async () => {
    const nextFavorite = !poi.is_favorite;
    setPoi({ ...poi, is_favorite: nextFavorite });

    try {
      await apiClient.post(`/pois/favorite/${poi.id}?deviceId=${getDeviceId()}&isFavorite=${nextFavorite}`);
      notifyProfileDataChanged();
      if (nextFavorite) {
        setToast("Đã thêm vào yêu thích!");
      }
    } catch {
      setPoi({ ...poi, is_favorite: !nextFavorite });
    }
  };

  const playCurrentPoi = async (targetPoi: Poi) => {
    if (!subscriptionActive && freePlaysRemaining <= 0) {
      setReturnTo(`/detail?poiId=${targetPoi.id}`);
      router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${targetPoi.id}`)}`);
      return;
    }

    setPendingPoiId(targetPoi.id);
    setIsPlaying(true);
    setPoi((current) => current ? { ...current, listened_count: current.listened_count + 1 } : current);

    try {
      const result = await playPoiAudio(targetPoi, {
        consumeFreeListen: !subscriptionActive,
        onListenedCount: (count) => {
          setPoi((current) => current ? { ...current, listened_count: count } : current);
          notifyProfileDataChanged();
        },
      });
      if (result.listenedCount) {
        setPoi((current) => current ? { ...current, listened_count: result.listenedCount || current.listened_count } : current);
        notifyProfileDataChanged();
      }
    } finally {
      setIsPlaying(false);
    }

    if (!subscriptionActive) {
      setFreePlaysRemaining((value) => Math.max(0, value - 1));
      setReturnTo(`/detail?poiId=${targetPoi.id}`);
      router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${targetPoi.id}`)}`);
    }
  };

  const toggleAudio = async () => {
    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
      return;
    }

    await playCurrentPoi(poi);
  };

  useEffect(() => {
    if (!poi || isPlaying || !getAutoPlay()) return;
    if (autoPlayedPoiRef.current === poi.id) return;

    autoPlayedPoiRef.current = poi.id;
    void playCurrentPoi(poi);
  }, [freePlaysRemaining, isPlaying, poi, subscriptionActive]);

  const sharePoi = async () => {
    const shareData = {
      title: poi.name,
      text: poi.short_description || poi.description,
      url: currentShareUrl,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(currentShareUrl);
      window.alert("Đã sao chép liên kết.");
    }
  };

  const submitRating = async (nextRating: number) => {
    if (!poi || ratingLoading) return;

    const previousRating = ratingValue;
    const previousAvg = poi.rating_avg || 0;
    const previousCount = poi.rating_count || 0;
    const safeCount = previousCount > 0 ? previousCount : (previousRating > 0 ? 1 : 0);
    const totalScore = previousAvg * safeCount;
    const nextCount = previousRating > 0 ? safeCount : safeCount + 1;
    const nextAvg = nextCount > 0
      ? Number(((totalScore - previousRating + nextRating) / nextCount).toFixed(2))
      : nextRating;

    setRatingLoading(true);
    setRatingValue(nextRating);
    setPoi({
      ...poi,
      user_rating: nextRating,
      rating_avg: nextAvg,
      rating_count: nextCount,
    });

    try {
      const response = await apiClient.post("/ratings", {
        poiId: poi.id,
        deviceId: getDeviceId(),
        ratingValue: nextRating,
      });

      setPoi((current) => current ? {
        ...current,
        user_rating: nextRating,
        rating_avg: Number(response.data?.rating_avg || current.rating_avg || 0),
        rating_count: Number(response.data?.rating_count || current.rating_count || 0),
      } : current);
      setToast(previousRating > 0 ? t("detail.ratingUpdated") : t("detail.ratingSent"));
    } catch {
      setRatingValue(previousRating);
      setPoi((current) => current ? {
        ...current,
        user_rating: previousRating,
        rating_avg: previousAvg,
        rating_count: previousCount,
      } : current);
      setToast(t("detail.ratingUpdateFail"));
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <>
      <ToastBanner message={toast} />
      <main className="app-shell space-y-4">
        <div className="grid grid-cols-[24px,1fr,24px] items-center">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80"
            onClick={() => router.back()}
          >
            <img src="/assets/back.png" alt="Back" className="h-6 w-6" />
          </button>
          <h1 className="text-center text-[22px] font-bold text-[#0058BC]">Smart Guide</h1>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80"
            onClick={sharePoi}
          >
            <img src="/assets/share.png" alt="Share" className="h-7 w-7" />
          </button>
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white">
          <div className="relative h-[420px]">
            <img src={currentImage} alt={poi.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/15 p-[18px]">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <div className="rounded-[12px] bg-[#0058BC] px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)]">
                    {poi.category}
                  </div>
                  <div className="rounded-[12px] bg-[#805F4635] px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur-[2px]">
                    {distanceText}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur-[2px]"
                  onClick={toggleAudio}
                >
                  <img src={isPlaying ? "/assets/audio.png" : "/assets/audio2.png"} alt={t("detail.listenGuide")} className="h-[30px] w-[30px]" />
                </button>
              </div>

              {poi.images.length > 1 && imageIndex > 0 ? (
                <button
                  type="button"
                  className="absolute left-[18px] top-1/2 -translate-y-1/2"
                  onClick={() => setImageIndex((value) => Math.max(0, value - 1))}
                >
                  <img src="/assets/arrow_left.png" alt="Prev" className="h-6 w-6 opacity-45" />
                </button>
              ) : null}

              {poi.images.length > 1 && imageIndex < poi.images.length - 1 ? (
                <button
                  type="button"
                  className="absolute right-[18px] top-1/2 -translate-y-1/2"
                  onClick={() => setImageIndex((value) => Math.min(poi.images.length - 1, value + 1))}
                >
                  <img src="/assets/arrow_right.png" alt="Next" className="h-6 w-6 opacity-45" />
                </button>
              ) : null}

              <div className="absolute bottom-[18px] left-[18px] right-[18px] flex items-end justify-between">
                <div className="space-y-1 text-white">
                  <button
                    type="button"
                    className={`max-w-[236px] text-left text-[21px] font-bold drop-shadow-[0_2px_6px_rgba(15,23,42,0.24)] ${nameExpanded ? "" : "truncate"}`}
                    onClick={() => setNameExpanded((value) => !value)}
                  >
                    {poi.name}
                  </button>
                  <div className="flex items-center gap-2 text-[14px] drop-shadow-[0_2px_6px_rgba(15,23,42,0.22)]">
                    <img src="/assets/listen.png" alt="Listen" className="h-[14px] w-[14px]" />
                    <span>{poi.listened_count}</span>
                    <img src="/assets/star.png" alt="Star" className="h-[14px] w-[14px]" />
                    <span>{(poi.rating_avg || 0).toFixed(1).replace(".", ",")}</span>
                  </div>
                  <button
                    type="button"
                    className={`max-w-[244px] text-left text-[13px] leading-[1.35] text-white/95 drop-shadow-[0_2px_6px_rgba(15,23,42,0.22)] ${addressExpanded ? "" : "line-clamp-2"}`}
                    onClick={() => setAddressExpanded((value) => !value)}
                  >
                    {poi.address}
                  </button>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur-[2px]"
                  onClick={toggleFavorite}
                >
                  <img
                    src={poi.is_favorite ? "/assets/favorite_active.png" : "/assets/favorite.png"}
                    alt="Favorite"
                    className="h-7 w-7"
                  />
                </button>
              </div>

              <div className="absolute bottom-[2px] left-0 right-0 text-center text-[12px] text-white/80">
                {imageIndex + 1}/{Math.max(1, poi.images.length)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.12fr_1.04fr_0.84fr] gap-[10px]">
          <div className="flex h-[50px] items-center justify-center rounded-[10px] bg-[#F3F4F6] px-2.5 text-[12px] text-[#374151] shadow-[0_4px_10px_rgba(15,23,42,0.05),inset_0_0_0_1px_rgba(209,213,219,0.75)]">
            <img src="/assets/clock.png" alt="Clock" className="mr-1.5 h-[14px] w-[14px] shrink-0" />
            <span className="whitespace-nowrap">{poi.open_hours || "07:00 - 17:00"}</span>
          </div>
          <button
            type="button"
            className="flex h-[50px] items-center justify-center rounded-[10px] bg-[#EEF4FF] px-2 text-[12px] font-bold text-[#365FA8] shadow-[0_4px_10px_rgba(15,23,42,0.05),inset_0_0_0_1px_rgba(191,219,254,0.9)]"
            onClick={() => setPriceExpanded((value) => !value)}
          >
            <img src="/assets/ticket.png" alt="Ticket" className="mr-1.5 h-[14px] w-[14px] shrink-0" />
            <span className={`${priceExpanded ? "whitespace-normal text-center leading-[1.15]" : "truncate"}`}>{poi.priceText}</span>
          </button>
          <button
            type="button"
            className="h-[50px] rounded-[12px] bg-[#0F5BD7] px-2 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(15,91,215,0.22)]"
            onClick={() => router.push(`/map?poiId=${poi.id}`)}
          >
            {t("detail.location")}
          </button>
        </div>

        <div className="ios-card rounded-[26px] px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[18px] font-bold text-[#111827]">{t("detail.listenGuide")}</p>
              <p className="mt-1 text-[14px] text-[#475569]">{t("detail.voice")}: {currentAudio?.voiceName || getLanguageName(currentAudio?.languageCode || "vi", lang)}</p>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D1D5DB] shadow-[0_4px_10px_rgba(15,23,42,0.08)]"
              onClick={toggleAudio}
            >
                  <img src={isPlaying ? "/assets/audio.png" : "/assets/audio2.png"} alt={t("detail.listenGuide")} className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="mt-5">
            <input type="range" min={0} max={100} value={0} readOnly className="w-full accent-[#0058BC]" />
            <div className="mt-1 flex justify-between text-[12px] text-[#64748B]">
              <span>00:00</span>
              <span>00:00</span>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-[18px] bg-[#EEF4FF] py-3 text-[#0058BC]"
            onClick={() => setScriptOpen(true)}
          >
            {t("detail.viewScript")}
          </button>
        </div>

        <section className="space-y-[14px]">
          <h2 className="text-[24px] font-bold text-[#111827]">{t("detail.intro")}</h2>
          <p className="text-[16px] leading-[1.45] text-[#111827]">{poi.description}</p>
        </section>

        <section className="ios-card rounded-[22px] px-5 py-5">
          <h3 className="text-[18px] font-bold text-[#111827]">{t("detail.ratingTitle")}</h3>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            {t("detail.ratingHint")}
          </p>

          <div className="mt-4 flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={ratingLoading}
                className="transition-transform disabled:opacity-60"
                onClick={() => submitRating(star)}
              >
                <img
                  src="/assets/star.png"
                  alt={`${star}`}
                  className={`h-8 w-8 object-contain ${star <= ratingValue ? "opacity-100" : "opacity-25 grayscale"}`}
                />
              </button>
            ))}
          </div>

          <p className="mt-3 text-[13px] text-[#0F5BD7]">
            {ratingValue > 0 ? t("detail.ratingSelected", { count: ratingValue }) : t("detail.ratingEmpty")}
          </p>
        </section>
      </main>

      {scriptOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 px-5 py-10" onClick={() => setScriptOpen(false)}>
          <div
            className="mx-auto max-h-full max-w-[540px] overflow-auto rounded-[24px] bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[20px] font-bold text-[#111827]">{t("detail.scriptTitle")}</h3>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-[#334155]">
              {currentAudio?.scriptText || t("detail.scriptEmpty")}
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-[14px] bg-[#0F5BD7] py-3 text-white"
              onClick={() => setScriptOpen(false)}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import apiClient from "@/lib/api";
import { playPoiAudio, stopSpeech } from "@/lib/audio";
import { ensureDeviceReady, getDeviceId, setPendingPoiId, setReturnTo } from "@/lib/device";
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
  is_favorite: boolean;
  images: string[];
  audios: { languageCode: string; languageName: string; voiceName: string; scriptText: string }[];
};

export default function DetailPage() {
  const router = useRouter();
  const [poi, setPoi] = useState<Poi | null>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [freePlaysRemaining, setFreePlaysRemaining] = useState(0);
  const [scriptOpen, setScriptOpen] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const load = async () => {
      await ensureDeviceReady();

      const poiId = typeof router.query.poiId === "string" ? router.query.poiId : "";
      const deviceId = getDeviceId();
      const [poiResponse, accessResponse] = await Promise.all([
        apiClient.get(`/pois/${poiId}?deviceId=${deviceId}`),
        apiClient.get(`/access/free-listen?deviceId=${deviceId}`),
      ]);

      const hasActiveSubscription = !!accessResponse.data?.hasActiveSubscription;
      const remainingFreePlays = Number(accessResponse.data?.freePlaysRemaining || 0);

      if (!hasActiveSubscription && remainingFreePlays <= 0) {
        setReturnTo(`/detail?poiId=${encodeURIComponent(poiId)}`);
        router.replace(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poiId}`)}`);
        return;
      }

      setPoi(poiResponse.data);
      setSubscriptionActive(hasActiveSubscription);
      setFreePlaysRemaining(remainingFreePlays);
    };

    load();
  }, [router, router.isReady, router.query.poiId]);

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

  const distanceText = useMemo(() => {
    if (!poi || !userLocation) return "2,4 km";

    const km = calculateDistanceKm(userLocation, { latitude: poi.latitude, longitude: poi.longitude });
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1).replace(".", ",")} km`;
  }, [poi, userLocation]);

  if (!poi) {
    return <main className="app-shell">Đang tải chi tiết...</main>;
  }

  const currentImage = poi.images?.[imageIndex] || "/assets/appiconfg.png";
  const currentAudio = poi.audios?.[0];
  const currentShareUrl = typeof window !== "undefined" ? window.location.href : "";

  const toggleFavorite = async () => {
    const nextFavorite = !poi.is_favorite;
    setPoi({ ...poi, is_favorite: nextFavorite });

    try {
      await apiClient.post(`/pois/favorite/${poi.id}?deviceId=${getDeviceId()}&isFavorite=${nextFavorite}`);
    } catch {
      setPoi({ ...poi, is_favorite: !nextFavorite });
    }
  };

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

  return (
    <>
      <main className="app-shell space-y-4">
        <div className="grid grid-cols-[24px,1fr,24px] items-center">
          <button type="button" onClick={() => router.back()}>
            <img src="/assets/back.png" alt="Back" className="h-6 w-6" />
          </button>
          <h1 className="text-center text-[22px] font-bold text-[#0058BC]">Smart Guide</h1>
          <button type="button" onClick={sharePoi}>
            <img src="/assets/share.png" alt="Share" className="h-7 w-7" />
          </button>
        </div>

        <div className="overflow-hidden rounded-[30px] bg-white">
          <div className="relative h-[420px]">
            <img src={currentImage} alt={poi.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/15 p-[18px]">
              <div className="flex items-start justify-between">
                <div className="flex gap-2">
                  <div className="rounded-[12px] bg-[#0058BC] px-3 py-1.5 text-[12px] font-bold text-white">
                    {poi.category}
                  </div>
                  <div className="rounded-[12px] bg-[#805F4635] px-3 py-1.5 text-[12px] font-bold text-white">
                    {distanceText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!subscriptionActive && freePlaysRemaining <= 0) {
                      setReturnTo(`/detail?poiId=${poi.id}`);
                      router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poi.id}`)}`);
                      return;
                    }

                    stopSpeech();
                    setPendingPoiId(poi.id);
                    setIsPlaying(true);

                    try {
                      await playPoiAudio(poi, { consumeFreeListen: !subscriptionActive });
                    } finally {
                      setIsPlaying(false);
                    }

                    if (!subscriptionActive) {
                      setFreePlaysRemaining((value) => Math.max(0, value - 1));
                      setReturnTo(`/detail?poiId=${poi.id}`);
                      router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poi.id}`)}`);
                    }
                  }}
                >
                  <img src={isPlaying ? "/assets/audio.png" : "/assets/audio2.png"} alt="Audio" className="h-[30px] w-[30px]" />
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
                  <p className="max-w-[240px] truncate text-[34px] font-bold">{poi.name}</p>
                  <div className="flex items-center gap-2 text-[14px]">
                    <img src="/assets/listen.png" alt="Listen" className="h-[14px] w-[14px]" />
                    <span>{poi.listened_count}</span>
                    <img src="/assets/star.png" alt="Star" className="h-[14px] w-[14px]" />
                    <span>{(poi.rating_avg || 0).toFixed(1).replace(".", ",")}</span>
                  </div>
                  <p className="truncate text-[14px]">{poi.address}</p>
                </div>
                <button type="button" onClick={toggleFavorite}>
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

        <div className="grid grid-cols-3 gap-[10px]">
          <div className="flex h-[50px] items-center justify-center rounded-[10px] bg-[#F3F4F6] px-2 text-[13px] text-[#374151]">
            <img src="/assets/clock.png" alt="Clock" className="mr-2 h-[14px] w-[14px]" />
            <span className="truncate">{poi.open_hours || "07:00 - 17:00"}</span>
          </div>
          <div className="flex h-[50px] items-center justify-center rounded-[10px] bg-[#EEF4FF] px-2 text-[13px] font-bold text-[#365FA8]">
            <img src="/assets/ticket.png" alt="Ticket" className="mr-2 h-[14px] w-[14px]" />
            <span className="truncate">{poi.priceText}</span>
          </div>
          <button
            type="button"
            className="h-[50px] rounded-[12px] bg-[#0F5BD7] text-[13px] font-bold text-white"
            onClick={() => router.push(`/map?poiId=${poi.id}`)}
          >
            Hiện vị trí
          </button>
        </div>

        <div className="ios-card rounded-[26px] px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[18px] font-bold text-[#111827]">Nghe thuyết minh</p>
              <p className="mt-1 text-[14px] text-[#475569]">Giọng đọc: {currentAudio?.voiceName || "TTS"}</p>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D1D5DB]"
              onClick={async () => {
                if (!subscriptionActive && freePlaysRemaining <= 0) {
                  setReturnTo(`/detail?poiId=${poi.id}`);
                  router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poi.id}`)}`);
                  return;
                }

                stopSpeech();
                setPendingPoiId(poi.id);
                setIsPlaying(true);

                try {
                  await playPoiAudio(poi, { consumeFreeListen: !subscriptionActive });
                } finally {
                  setIsPlaying(false);
                }

                if (!subscriptionActive) {
                  setFreePlaysRemaining((value) => Math.max(0, value - 1));
                  setReturnTo(`/detail?poiId=${poi.id}`);
                  router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poi.id}`)}`);
                }
              }}
            >
              <img src={isPlaying ? "/assets/audio.png" : "/assets/audio2.png"} alt="Audio toggle" className="h-[18px] w-[18px]" />
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
            Xem lời thuyết minh
          </button>
        </div>

        <section className="space-y-[14px]">
          <h2 className="text-[28px] font-bold text-[#111827]">Giới thiệu</h2>
          <p className="text-[17px] leading-[1.45] text-[#111827]">{poi.description}</p>
        </section>
      </main>

      {scriptOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 px-5 py-10" onClick={() => setScriptOpen(false)}>
          <div
            className="mx-auto max-h-full max-w-[540px] overflow-auto rounded-[24px] bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[20px] font-bold text-[#111827]">Lời thuyết minh</h3>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-[#334155]">
              {currentAudio?.scriptText || "Chưa có lời thuyết minh."}
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-[14px] bg-[#0F5BD7] py-3 text-white"
              onClick={() => setScriptOpen(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

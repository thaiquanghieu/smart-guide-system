import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import DirectionsSheet from "@/components/DirectionsSheet";
import MapSurface from "@/components/MapSurface";
import SearchBar from "@/components/SearchBar";
import ToastBanner from "@/components/ToastBanner";
import apiClient, { assetUrl } from "@/lib/api";
import { translatePois, useAppI18n } from "@/lib/i18n";
import { playPoiAudio, stopSpeech } from "@/lib/audio";
import {
  ensureDeviceReady,
  getAutoPlay,
  getBatterySaver,
  getDeviceId,
  getTrackingIntervalMs,
  setPendingPoiId,
  setReturnTo,
} from "@/lib/device";
import { calculateDistanceKm, type GeoPoint } from "@/lib/location";

type Poi = {
  id: string;
  name: string;
  category: string;
  short_description?: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  radius?: number;
  priority?: number;
  listened_count: number;
  rating_avg: number;
  is_favorite?: boolean;
  images: string[];
  audios: { languageCode: string; languageName: string; scriptText: string }[];
};

let mapCache:
  | {
      hasLoaded: boolean;
      pois: Poi[];
      searchText: string;
      userLocation: GeoPoint | null;
      trackingEnabled: boolean;
      subscriptionActive: boolean;
      freePlaysRemaining: number;
      mapCenter: GeoPoint | null;
    }
  | null = null;

export default function MapPage() {
  const router = useRouter();
  const { t, lang } = useAppI18n();
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [playingPoiId, setPlayingPoiId] = useState("");
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [freePlaysRemaining, setFreePlaysRemaining] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [mapCenter, setMapCenter] = useState<GeoPoint | null>(null);
  const [hasLoadedMap, setHasLoadedMap] = useState(false);
  const [toast, setToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const trackingTimerRef = useRef<number | null>(null);
  const lastTrackedPoiRef = useRef("");
  const lastPlayedAtRef = useRef<Record<string, number>>({});
  const candidateRef = useRef<{ poiId: string; hits: number }>({ poiId: "", hits: 0 });
  const globalCooldownUntilRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const queryPoiId = typeof router.query.poiId === "string" ? router.query.poiId : "";

        if (mapCache) {
          if (!mapCache.hasLoaded) {
            mapCache = null;
          } else {
            setPois(translatePois<Poi>(mapCache.pois, lang));
            setSearchText(mapCache.searchText);
            setUserLocation(mapCache.userLocation);
            setTrackingEnabled(mapCache.trackingEnabled);
            setSubscriptionActive(mapCache.subscriptionActive);
            setFreePlaysRemaining(mapCache.freePlaysRemaining);
            setMapCenter(
              mapCache.mapCenter ||
                mapCache.userLocation ||
                (mapCache.pois[0]
                  ? { latitude: mapCache.pois[0].latitude, longitude: mapCache.pois[0].longitude }
                  : null)
            );

            if (queryPoiId) {
              const cachedSelectedPoi = mapCache.pois.find((item) => item.id === queryPoiId);
              setSelectedPoiId(queryPoiId);
              if (cachedSelectedPoi) {
                setMapCenter({ latitude: cachedSelectedPoi.latitude, longitude: cachedSelectedPoi.longitude });
              }
            } else {
              setSelectedPoiId("");
            }

            setHasLoadedMap(true);
            return;
          }
        }

        await ensureDeviceReady();

        const deviceId = getDeviceId();
        const [poiResponse, accessResponse] = await Promise.all([
          apiClient.get(`/pois?deviceId=${deviceId}&lang=${lang}`),
          apiClient.get(`/access/free-listen?deviceId=${deviceId}`),
        ]);

        const items = translatePois<Poi>(poiResponse.data || [], lang);
        const hasActiveSubscription = !!accessResponse.data?.hasActiveSubscription;
        const remainingFreePlays = Number(accessResponse.data?.freePlaysRemaining || 0);

        if (!hasActiveSubscription && remainingFreePlays <= 0) {
          const poiId = typeof router.query.poiId === "string" ? router.query.poiId : "";
          const returnTo = poiId ? `/map?poiId=${encodeURIComponent(poiId)}` : "/map";
          setReturnTo(returnTo);
          router.replace(`/paywall?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        setPois(items);

        const poiId = queryPoiId;
        const selectedPoi = poiId ? items.find((item: Poi) => item.id === poiId) : null;

        if (selectedPoi) {
          setSelectedPoiId(selectedPoi.id);
          setMapCenter({ latitude: selectedPoi.latitude, longitude: selectedPoi.longitude });
        } else if (items[0]) {
          setMapCenter({ latitude: items[0].latitude, longitude: items[0].longitude });
        }

        setSubscriptionActive(hasActiveSubscription);
        setFreePlaysRemaining(remainingFreePlays);
        setHasLoadedMap(true);
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || t("map.loadError"));
      }
    };

    load();
  }, [lang, router, router.query.poiId, t]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(currentLocation);
        setMapCenter((value) => value || currentLocation);
      },
      () => undefined,
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!hasLoadedMap) return;

    mapCache = {
      hasLoaded: !errorMessage && pois.length > 0,
      pois,
      searchText,
      userLocation,
      trackingEnabled,
      subscriptionActive,
      freePlaysRemaining,
      mapCenter,
    };
  }, [errorMessage, freePlaysRemaining, hasLoadedMap, mapCenter, pois, searchText, subscriptionActive, trackingEnabled, userLocation]);

  const enrichedPois = useMemo(() => {
    return pois.map((poi) => ({
      ...poi,
      distanceKm: userLocation
        ? calculateDistanceKm(userLocation, { latitude: poi.latitude, longitude: poi.longitude })
        : 0,
    }));
  }, [pois, userLocation]);

  useEffect(() => {
    if (mapCenter || userLocation || !enrichedPois.length) return;
    setMapCenter({ latitude: enrichedPois[0].latitude, longitude: enrichedPois[0].longitude });
  }, [enrichedPois, mapCenter, userLocation]);

  const updatePoi = (poiId: string, updater: (poi: Poi) => Poi) => {
    setPois((current) => current.map((poi) => (poi.id === poiId ? updater(poi) : poi)));
  };

  const selectedPoi = useMemo(
    () => enrichedPois.find((poi) => poi.id === selectedPoiId) || null,
    [enrichedPois, selectedPoiId]
  );

  const suggestions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return [];

    return enrichedPois.filter((poi) => [poi.name, poi.address].join(" ").toLowerCase().includes(keyword));
  }, [enrichedPois, searchText]);

  const selectedDistance = useMemo(() => {
    if (!selectedPoi) return "";
    if (selectedPoi.distanceKm < 1 && selectedPoi.distanceKm > 0) {
      return `${Math.round(selectedPoi.distanceKm * 1000)} m`;
    }
    return `${selectedPoi.distanceKm.toFixed(1).replace(".", ",")} km`;
  }, [selectedPoi]);

  useEffect(() => {
    if (!trackingEnabled || !navigator.geolocation || !enrichedPois.length) return undefined;

    const intervalMs = getBatterySaver() ? 10000 : getTrackingIntervalMs();
    const poiCooldownMs = 4 * 60 * 1000;
    const globalCooldownMs = 25 * 1000;
    const requiredStableHits = 2;

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(currentLocation);

          const candidatePoi = [...enrichedPois]
            .map((poi) => ({
              ...poi,
              distanceKm: calculateDistanceKm(currentLocation, { latitude: poi.latitude, longitude: poi.longitude }),
            }))
            .filter((poi) => {
              const poiRadiusKm = Math.max(0.01, Number(poi.radius || 100) / 1000);
              return poi.distanceKm <= poiRadiusKm;
            })
            .sort((left, right) => {
              const priorityDiff = Number(right.priority || 0) - Number(left.priority || 0);
              if (priorityDiff !== 0) return priorityDiff;
              const distanceDiff = left.distanceKm - right.distanceKm;
              if (Math.abs(distanceDiff) > 0.001) return distanceDiff;
              const listenedDiff = Number(left.listened_count || 0) - Number(right.listened_count || 0);
              if (listenedDiff !== 0) return listenedDiff;
              return left.id.localeCompare(right.id);
            })[0];

          if (!candidatePoi) {
            candidateRef.current = { poiId: "", hits: 0 };
            return;
          }

          if (candidateRef.current.poiId === candidatePoi.id) {
            candidateRef.current = { poiId: candidatePoi.id, hits: candidateRef.current.hits + 1 };
          } else {
            candidateRef.current = { poiId: candidatePoi.id, hits: 1 };
          }

          setSelectedPoiId(candidatePoi.id);
          setMapCenter({ latitude: candidatePoi.latitude, longitude: candidatePoi.longitude });

          const now = Date.now();
          const poiCooldownUntil = (lastPlayedAtRef.current[candidatePoi.id] || 0) + poiCooldownMs;
          const canAutoPlay =
            getAutoPlay() &&
            candidateRef.current.hits >= requiredStableHits &&
            lastTrackedPoiRef.current !== candidatePoi.id &&
            !playingPoiId &&
            now >= globalCooldownUntilRef.current &&
            now >= poiCooldownUntil;

          if (canAutoPlay) {
            lastTrackedPoiRef.current = candidatePoi.id;
            lastPlayedAtRef.current[candidatePoi.id] = now;
            globalCooldownUntilRef.current = now + globalCooldownMs;
            setPlayingPoiId(candidatePoi.id);

            try {
              updatePoi(candidatePoi.id, (current) => ({ ...current, listened_count: current.listened_count + 1 }));
              const result = await playPoiAudio(candidatePoi, {
                consumeFreeListen: !subscriptionActive,
                onListenedCount: (count) => {
                  updatePoi(candidatePoi.id, (current) => ({ ...current, listened_count: count }));
                },
              });
              if (result.listenedCount) {
                updatePoi(candidatePoi.id, (current) => ({ ...current, listened_count: result.listenedCount || current.listened_count }));
              }
            } finally {
              setPlayingPoiId("");
            }
          }
        },
        () => undefined,
        { enableHighAccuracy: true }
      );
    };

    tick();
    trackingTimerRef.current = window.setInterval(tick, intervalMs);

    return () => {
      if (trackingTimerRef.current) {
        window.clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
    };
  }, [enrichedPois, playingPoiId, subscriptionActive, trackingEnabled]);

  const visibleCenter = mapCenter || userLocation;
  const trackingBottom = selectedPoi
    ? "calc(env(safe-area-inset-bottom) + 348px)"
    : "calc(env(safe-area-inset-bottom) + 112px)";

  return (
    <>
      <ToastBanner message={toast} />

      <main
        className="relative min-h-screen overflow-hidden bg-[#F4F7FB]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 92px)" }}
      >
        <div
          className="absolute left-0 right-0 top-0 z-10 bg-[#F4F7FB]"
          style={{ height: "calc(env(safe-area-inset-top) + 70px)" }}
        />
        <div
          className="absolute left-0 right-0 z-20 text-center text-[22px] font-bold text-[#0F5BD7]"
          style={{ top: "calc(env(safe-area-inset-top) + 20px)" }}
        >
          {t("app.title")}
        </div>

        {visibleCenter ? (
          <div
            className="absolute inset-x-0 z-0 overflow-hidden"
            style={{
              top: "calc(env(safe-area-inset-top) + 68px)",
              bottom: "calc(env(safe-area-inset-bottom) + 74px)",
            }}
          >
            <MapSurface
              center={visibleCenter}
              pois={enrichedPois}
              selectedPoiId={selectedPoiId}
              userLocation={userLocation}
              heightClassName="h-full"
              onSelectPoi={(poiId) => {
                setSelectedPoiId(poiId);
                const poi = enrichedPois.find((item) => item.id === poiId);
                if (poi) {
                  setMapCenter({ latitude: poi.latitude, longitude: poi.longitude });
                }
              }}
            />
          </div>
        ) : null}

        <div className="absolute inset-x-4 z-20" style={{ top: "calc(env(safe-area-inset-top) + 80px)" }}>
          <SearchBar
            value={searchText}
            placeholder={t("home.search")}
            active
            onChange={(value) => {
              setSearchText(value);
              setShowSuggestions(!!value);
            }}
            onCancel={() => {
              setSearchText("");
              setShowSuggestions(false);
            }}
          />
        </div>

        {showSuggestions && suggestions.length > 0 ? (
          <div className="absolute inset-x-4 top-[146px] z-20 overflow-hidden rounded-b-[18px] rounded-t-[8px] border border-[#E5E7EB] bg-white">
            {suggestions.slice(0, 5).map((poi) => (
              <button
                key={poi.id}
                type="button"
                className="grid w-full grid-cols-[1fr,70px] gap-3 border-b border-[#EEF2F7] px-3 py-[10px] text-left last:border-b-0"
                onClick={() => {
                  setSelectedPoiId(poi.id);
                  setShowSuggestions(false);
                  setSearchText(poi.name);
                  setMapCenter({ latitude: poi.latitude, longitude: poi.longitude });
                }}
              >
                <div>
                  <p className="truncate text-[15px] font-bold text-[#111827]">{poi.name}</p>
                  <p className="mt-1 truncate text-[12px] text-[#6B7280]">{poi.address}</p>
                </div>
                <div className="text-right text-[12px] text-[#6B7280]">
                  {poi.distanceKm.toFixed(1).replace(".", ",")} km
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="absolute right-4 z-30 flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-white shadow-[0_10px_18px_rgba(0,0,0,0.08)]"
          style={{ top: "calc(env(safe-area-inset-top) + 190px)" }}
          onClick={() => {
            if (userLocation) {
              setMapCenter(userLocation);
              setSelectedPoiId("");
            }
          }}
        >
          <img src="/assets/location.png" alt={t("detail.location")} className="h-[26px] w-[26px]" />
        </button>

        <button
          type="button"
          className="absolute right-4 z-30 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#374151] text-white shadow-[0_10px_18px_rgba(0,0,0,0.18)] transition-all duration-200"
          style={{ bottom: trackingBottom }}
          onClick={() => setTrackingEnabled((value) => !value)}
        >
          <img
            src={trackingEnabled ? "/assets/tracking_active.png" : "/assets/tracking.png"}
            alt="Tracking"
            className="h-5 w-5"
          />
          <span className="mt-1 text-[10px]">{trackingEnabled ? t("map.trackingOn") : t("map.trackingOff")}</span>
        </button>

        {selectedPoi ? (
          <div
            className="absolute inset-x-4 z-30 rounded-[22px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
          >
            <div className="grid grid-cols-[108px,1fr,40px] gap-3">
              <button
                type="button"
                className="relative aspect-square overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-[#F3F4F6]"
                onClick={() => router.push(`/detail?poiId=${selectedPoi.id}`)}
              >
                <img
                  src={assetUrl(selectedPoi.images?.[0]) || "/assets/appiconfg.png"}
                  alt={selectedPoi.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </button>
              <button type="button" className="space-y-1 min-w-0 text-left" onClick={() => router.push(`/detail?poiId=${selectedPoi.id}`)}>
                <p className="truncate text-[12px] text-[#0F5BD7]">{selectedPoi.category?.toUpperCase()}</p>
                <p className="line-clamp-2 text-[15px] font-bold leading-[1.25] text-[#111827]">{selectedPoi.name}</p>
                <div className="flex items-center gap-2 text-[13px] text-[#111827]">
                  <img src="/assets/listen2.png" alt="Listen" className="h-[14px] w-[14px]" />
                  <span>{selectedPoi.listened_count}</span>
                  <img src="/assets/star.png" alt="Star" className="h-[14px] w-[14px]" />
                  <span>{(selectedPoi.rating_avg || 0).toFixed(1).replace(".", ",")}</span>
                </div>
                <p className="text-[14px] text-[#0F5BD7]">{selectedDistance}</p>
                <p className="line-clamp-2 text-[12px] text-[#6B7280]">{selectedPoi.address}</p>
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center self-start rounded-full bg-[#D1D5DB]"
                onClick={async () => {
                  if (playingPoiId === selectedPoi.id) {
                    stopSpeech();
                    setPlayingPoiId("");
                    return;
                  }

                  if (!subscriptionActive && freePlaysRemaining <= 0) {
                    setReturnTo(`/map?poiId=${selectedPoi.id}`);
                    router.push(`/paywall?returnTo=${encodeURIComponent(`/map?poiId=${selectedPoi.id}`)}`);
                    return;
                  }

                  setPendingPoiId(selectedPoi.id);
                  setPlayingPoiId(selectedPoi.id);
                  updatePoi(selectedPoi.id, (current) => ({ ...current, listened_count: current.listened_count + 1 }));

                  try {
                    const result = await playPoiAudio(selectedPoi, {
                      consumeFreeListen: !subscriptionActive,
                      onListenedCount: (count) => {
                        updatePoi(selectedPoi.id, (current) => ({ ...current, listened_count: count }));
                      },
                    });
                    if (result.listenedCount) {
                      updatePoi(selectedPoi.id, (current) => ({ ...current, listened_count: result.listenedCount || current.listened_count }));
                    }
                  } finally {
                    setPlayingPoiId("");
                  }

                  if (!subscriptionActive) {
                    setFreePlaysRemaining((value) => Math.max(0, value - 1));
                    setReturnTo(`/map?poiId=${selectedPoi.id}`);
                    router.push(`/paywall?returnTo=${encodeURIComponent(`/map?poiId=${selectedPoi.id}`)}`);
                  }
                }}
              >
                <img src={playingPoiId === selectedPoi.id ? "/assets/audio.png" : "/assets/audio2.png"} alt="Audio" className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-[10px]">
              <button type="button" className="h-[50px] rounded-[16px] bg-[#0F5BD7] text-white" onClick={() => setShowDirections(true)}>
                {t("map.directions")}
              </button>
              <button
                type="button"
                className="h-[50px] rounded-[16px] bg-[#E5E7EB] text-[#0F5BD7]"
                onClick={() => router.push(`/detail?poiId=${selectedPoi.id}`)}
              >
                {t("map.detail")}
              </button>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="absolute inset-x-4 bottom-[116px] z-20 rounded-[18px] bg-white px-4 py-4 text-[14px] text-[#DC2626] shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
            {errorMessage}
          </div>
        ) : null}
      </main>

      {selectedPoi ? (
        <DirectionsSheet
          open={showDirections}
          onClose={() => setShowDirections(false)}
          latitude={selectedPoi.latitude}
          longitude={selectedPoi.longitude}
        />
      ) : null}

      <BottomNav />
    </>
  );
}

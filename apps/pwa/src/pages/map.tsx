import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DirectionsSheet from "@/components/DirectionsSheet";
import MapSurface from "@/components/MapSurface";
import SearchBar from "@/components/SearchBar";
import ToastBanner from "@/components/ToastBanner";
import apiClient, { assetUrl } from "@/lib/api";
import { translatePois, useAppI18n } from "@/lib/i18n";
import { playPoiAudio, playTrackingStatusTts, playTrackingTransitionCue, primeAudioPlayback, stopSpeech } from "@/lib/audio";
import {
  clearPendingPoiId,
  clearTrackingTargetPoiId,
  ensureDeviceReady,
  getTrackingModeConfig,
  getTrackingTargetPoiId,
  getDeviceId,
  notifyProfileDataChanged,
  setPendingPoiId,
  setReturnTo,
} from "@/lib/device";
import {
  calculateDistanceKm,
  estimateMotorbikeMinutes,
  fetchRoadRoute,
  measureRouteDistanceKm,
  type GeoPoint,
} from "@/lib/location";
import { resolveTrackingTick } from "@/lib/poiQueue";

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

type TourPoi = {
  id: string;
  name: string;
  sort_order: number;
};

type TourSummary = {
  id: number;
  name: string;
  description: string;
  poi_count: number;
  pois: TourPoi[];
};

type TourOverview = {
  distanceKm: number;
  motorbikeMinutes: number;
};

let mapCache:
  | {
      lang: string;
      modeKey: string;
      hasLoaded: boolean;
      pois: Poi[];
      searchText: string;
      userLocation: GeoPoint | null;
      subscriptionActive: boolean;
      freePlaysRemaining: number;
      mapCenter: GeoPoint | null;
      activeTour: TourSummary | null;
    }
  | null = null;

function shouldForceRefreshMap(query: Record<string, any>) {
  return typeof query.refresh === "string" && query.refresh.length > 0;
}

export default function MapPage() {
  const router = useRouter();
  const { t, lang } = useAppI18n();
  const isTourMode = typeof router.query.tourId === "string" && router.query.tourId.length > 0;
  const tourId = typeof router.query.tourId === "string" ? router.query.tourId : "";
  const modeKey = tourId ? `tour:${tourId}` : "default";
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [playingPoiId, setPlayingPoiId] = useState("");
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [freePlaysRemaining, setFreePlaysRemaining] = useState(0);
  const [activeTour, setActiveTour] = useState<TourSummary | null>(null);
  const [tourOverview, setTourOverview] = useState<TourOverview | null>(null);
  const [tourRoutePath, setTourRoutePath] = useState<GeoPoint[]>([]);
  const [showDirections, setShowDirections] = useState(false);
  const [tourFollowing, setTourFollowing] = useState(false);
  const [mapCenter, setMapCenter] = useState<GeoPoint | null>(null);
  const [mapCenterSignal, setMapCenterSignal] = useState(0);
  const [hasLoadedMap, setHasLoadedMap] = useState(false);
  const [toast, setToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [startingQrPreview, setStartingQrPreview] = useState(false);
  const [userLocationResolved, setUserLocationResolved] = useState(false);
  const trackingTimerRef = useRef<number | null>(null);
  const tourFollowWatchRef = useRef<number | null>(null);
  const trackingTickRef = useRef<(() => void) | null>(null);
  const lastPlayedAtRef = useRef<Record<string, number>>({});
  const candidateRef = useRef<{ poiId: string; hits: number }>({ poiId: "", hits: 0 });
  const qrTargetPoiRef = useRef("");
  const qrAutoPlayedPoiRef = useRef("");
  const playingPoiIdRef = useRef("");
  const lastTrackingAutoPoiIdRef = useRef("");
  const selectedPoiIdRef = useRef("");

  useEffect(() => {
    playingPoiIdRef.current = playingPoiId;
  }, [playingPoiId]);

  useEffect(() => {
    selectedPoiIdRef.current = selectedPoiId;
  }, [selectedPoiId]);

  useEffect(() => {
    if (!trackingEnabled) {
      lastTrackingAutoPoiIdRef.current = "";
    }
  }, [trackingEnabled]);

  useEffect(() => {
    if (!activeTour) {
      setTourFollowing(false);
      setTourOverview(null);
    }
  }, [activeTour]);

  useEffect(() => {
    const load = async () => {
      try {
        const queryPoiId = typeof router.query.poiId === "string" ? router.query.poiId : "";
        const queryTourId = typeof router.query.tourId === "string" ? router.query.tourId : "";
        const currentModeKey = queryTourId ? `tour:${queryTourId}` : "default";
        const forceRefresh = shouldForceRefreshMap(router.query);

        if (forceRefresh) {
          mapCache = null;
        }

        if (mapCache) {
          if (!mapCache.hasLoaded || mapCache.modeKey !== currentModeKey || mapCache.lang !== lang) {
            mapCache = null;
          } else {
            setPois(translatePois<Poi>(mapCache.pois, lang));
            setSearchText(mapCache.searchText);
            setUserLocation(mapCache.userLocation);
            setTrackingEnabled(false);
            setSubscriptionActive(mapCache.subscriptionActive);
            setFreePlaysRemaining(mapCache.freePlaysRemaining);
            setActiveTour(mapCache.activeTour);
            setTourRoutePath([]);
            setMapCenter(
              mapCache.userLocation ||
                mapCache.mapCenter ||
                (mapCache.pois[0]
                  ? { latitude: mapCache.pois[0].latitude, longitude: mapCache.pois[0].longitude }
                  : null)
            );

            if (queryTourId) {
              setSelectedPoiId("");
            } else if (queryPoiId) {
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
        const requests: Promise<any>[] = [
          apiClient.get(`/pois?deviceId=${deviceId}&lang=${lang}`),
          apiClient.get(`/access/free-listen?deviceId=${deviceId}`),
        ];

        if (queryTourId) {
          requests.push(apiClient.get(`/tours/${queryTourId}`));
        }

        const [poiResponse, accessResponse, tourResponse] = await Promise.all(requests);

        let items = translatePois<Poi>(poiResponse.data || [], lang);
        const hasActiveSubscription = !!accessResponse.data?.hasActiveSubscription;
        const remainingFreePlays = Number(accessResponse.data?.freePlaysRemaining || 0);
        const grantPoiId = String(accessResponse.data?.poiId || "");
        const targetPoiIdFromStorage = getTrackingTargetPoiId();
        const activeTourResponse = tourResponse?.data as TourSummary | undefined;

        if (activeTourResponse?.pois?.length) {
          const orderedIds = activeTourResponse.pois
            .slice()
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((poi) => poi.id);
          items = orderedIds
            .map((poiId) => items.find((item) => item.id === poiId))
            .filter(Boolean) as Poi[];
          setActiveTour(activeTourResponse);
        } else {
          setActiveTour(null);
          setTourOverview(null);
          setTourRoutePath([]);
        }

        const targetPoiId = queryTourId
          ? ""
          : queryPoiId || targetPoiIdFromStorage || grantPoiId || activeTourResponse?.pois?.[0]?.id || "";
        qrTargetPoiRef.current = targetPoiId;

        if (!hasActiveSubscription && remainingFreePlays <= 0) {
          const poiId = targetPoiId;
          const returnTo = queryTourId
            ? `/map?tourId=${encodeURIComponent(queryTourId)}${poiId ? `&poiId=${encodeURIComponent(poiId)}` : ""}`
            : poiId ? `/map?poiId=${encodeURIComponent(poiId)}` : "/map";
          setReturnTo(returnTo);
          router.replace(`/paywall?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        setPois(items);

        const poiId = targetPoiId;
        const selectedPoi = poiId ? items.find((item: Poi) => item.id === poiId) : null;

        if (queryTourId) {
          setSelectedPoiId("");
          setMapCenter(items[0] ? { latitude: items[0].latitude, longitude: items[0].longitude } : null);
        } else if (selectedPoi) {
          setSelectedPoiId(selectedPoi.id);
          setMapCenter({ latitude: selectedPoi.latitude, longitude: selectedPoi.longitude });
        } else {
          setSelectedPoiId("");
          setMapCenter(null);
        }

        setSubscriptionActive(hasActiveSubscription);
        setFreePlaysRemaining(remainingFreePlays);
        setTrackingEnabled(false);
        setHasLoadedMap(true);
      } catch (error: any) {
        setActiveTour(null);
        setTourOverview(null);
        setTourRoutePath([]);
        setErrorMessage(error?.response?.data?.message || t("map.loadError"));
      }
    };

    load();
  }, [lang, router, router.query.poiId, router.query.tourId, t]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocationResolved(true);
        setUserLocation(currentLocation);
        setMapCenter((value) => (selectedPoiIdRef.current ? value : currentLocation));
      },
      () => {
        setUserLocationResolved(true);
      },
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
      lang,
      modeKey,
      hasLoaded: !errorMessage && pois.length > 0,
      pois,
      searchText,
      userLocation,
      subscriptionActive,
      freePlaysRemaining,
      mapCenter,
      activeTour,
    };
  }, [activeTour, errorMessage, freePlaysRemaining, hasLoadedMap, lang, mapCenter, modeKey, pois, searchText, subscriptionActive, userLocation]);

  const enrichedPois = useMemo(() => {
    return pois.map((poi) => ({
      ...poi,
      distanceKm: userLocation
        ? calculateDistanceKm(userLocation, { latitude: poi.latitude, longitude: poi.longitude })
        : 0,
    }));
  }, [pois, userLocation]);

  useEffect(() => {
    if (mapCenter || userLocation || !userLocationResolved || !enrichedPois.length) return;
    setMapCenter({ latitude: enrichedPois[0].latitude, longitude: enrichedPois[0].longitude });
  }, [enrichedPois, mapCenter, userLocation, userLocationResolved]);

  const clearSelectedPoi = () => {
    setSelectedPoiId("");
  };

  useEffect(() => {
    let cancelled = false;

    const loadTourRoute = async () => {
      if (!activeTour || !pois.length) {
        setTourOverview(null);
        setTourRoutePath([]);
        return;
      }

      const orderedTourPoints = pois.map((poi) => ({
        latitude: poi.latitude,
        longitude: poi.longitude,
      }));
      const routePoints = userLocation ? [{ ...userLocation }, ...orderedTourPoints] : orderedTourPoints;
      const summaryPoints = orderedTourPoints;

      if (routePoints.length < 2) {
        setTourOverview({ distanceKm: 0, motorbikeMinutes: 0 });
        setTourRoutePath([]);
        return;
      }

      try {
        const route = await fetchRoadRoute(routePoints);
        if (!cancelled) {
          setTourRoutePath(route);
        }
      } catch {
        if (!cancelled) {
          setTourRoutePath([]);
        }
      }

      if (summaryPoints.length < 2) {
        if (!cancelled) {
          setTourOverview({ distanceKm: 0, motorbikeMinutes: 0 });
        }
        return;
      }

      try {
        const summaryRoute = await fetchRoadRoute(summaryPoints);
        const distanceKm = measureRouteDistanceKm(summaryRoute.length ? summaryRoute : summaryPoints);
        if (!cancelled) {
          setTourOverview({
            distanceKm,
            motorbikeMinutes: estimateMotorbikeMinutes(distanceKm),
          });
        }
      } catch {
        const distanceKm = measureRouteDistanceKm(summaryPoints);
        if (!cancelled) {
          setTourOverview({
            distanceKm,
            motorbikeMinutes: estimateMotorbikeMinutes(distanceKm),
          });
        }
      }
    };

    void loadTourRoute();

    return () => {
      cancelled = true;
    };
  }, [activeTour, pois, userLocation]);

  useEffect(() => {
    if (!tourFollowing || !navigator.geolocation || !activeTour) {
      if (tourFollowWatchRef.current != null) {
        navigator.geolocation.clearWatch(tourFollowWatchRef.current);
        tourFollowWatchRef.current = null;
      }
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(currentLocation);
        setSelectedPoiId("");
        setMapCenter(currentLocation);
        setMapCenterSignal((value) => value + 1);
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 12000 }
    );

    tourFollowWatchRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      tourFollowWatchRef.current = null;
    };
  }, [activeTour, tourFollowing]);

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

  const buildMapReturnUrl = (poiId?: string) => {
    const queryTourId = typeof router.query.tourId === "string" ? router.query.tourId : "";
    if (queryTourId) {
      return `/map?tourId=${encodeURIComponent(queryTourId)}${poiId ? `&poiId=${encodeURIComponent(poiId)}` : ""}`;
    }
    return poiId ? `/map?poiId=${encodeURIComponent(poiId)}` : "/map";
  };

  const tourMarkerLabels = useMemo(() => {
    if (!activeTour?.pois?.length) return {};

    return activeTour.pois
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .reduce<Record<string, string>>((accumulator, poi, index) => {
        accumulator[poi.id] = String(index + 1);
        return accumulator;
      }, {});
  }, [activeTour]);

  const tourFitPoints = useMemo(() => {
    if (!activeTour) return [];

    const points = pois.map((poi) => ({
      latitude: poi.latitude,
      longitude: poi.longitude,
    }));

    if (userLocation) {
      return [{ ...userLocation }, ...points];
    }

    return points;
  }, [activeTour, pois, userLocation]);

  const playMapPoi = async (
    targetPoi: Poi,
    options?: {
      redirectToPaywallAfterFree?: boolean;
      optimisticCount?: boolean;
      transitionCue?: boolean;
    }
  ) => {
    const shouldRedirectToPaywallAfterFree = options?.redirectToPaywallAfterFree ?? false;
    const shouldOptimisticCount = options?.optimisticCount ?? false;
    const shouldPlayTransitionCue = options?.transitionCue ?? false;
    let playbackSucceeded = false;

    if (!subscriptionActive && freePlaysRemaining <= 0) {
      const returnTo = buildMapReturnUrl(targetPoi.id);
      setReturnTo(returnTo);
      router.push(`/paywall?returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }

    setPendingPoiId(targetPoi.id);
    setPlayingPoiId(targetPoi.id);
    if (shouldPlayTransitionCue) {
      await playTrackingTransitionCue();
    }
    if (shouldOptimisticCount) {
      updatePoi(targetPoi.id, (current) => ({ ...current, listened_count: current.listened_count + 1 }));
    }

    try {
      const result = await playPoiAudio(targetPoi, {
        consumeFreeListen: !subscriptionActive,
        onListenedCount: (count) => {
          updatePoi(targetPoi.id, (current) => ({ ...current, listened_count: count }));
          notifyProfileDataChanged();
        },
      });
      if (result.listenedCount) {
        updatePoi(targetPoi.id, (current) => ({ ...current, listened_count: result.listenedCount || current.listened_count }));
        notifyProfileDataChanged();
      }
      playbackSucceeded = true;
      if (qrTargetPoiRef.current === targetPoi.id) {
        qrTargetPoiRef.current = "";
        clearTrackingTargetPoiId();
      }
    } catch (error: any) {
      const message = error?.message || "Phát audio thất bại";
      throw new Error(message);
    } finally {
      playingPoiIdRef.current = "";
      setPlayingPoiId("");
      setStartingQrPreview(false);
      window.setTimeout(() => trackingTickRef.current?.(), 0);
    }

    if (playbackSucceeded && !subscriptionActive) {
      setFreePlaysRemaining((value) => Math.max(0, value - 1));
      if (shouldRedirectToPaywallAfterFree) {
        clearPendingPoiId();
        const returnTo = buildMapReturnUrl(targetPoi.id);
        setReturnTo(returnTo);
        router.push(`/paywall?returnTo=${encodeURIComponent(returnTo)}`);
      }
    }

    return playbackSucceeded;
  };

  useEffect(() => {
    if (!trackingEnabled || !navigator.geolocation || !enrichedPois.length) return undefined;

    const trackingModeConfig = getTrackingModeConfig();
    const intervalMs = trackingModeConfig.intervalMs;
    const requiredStableHits = trackingModeConfig.requiredStableHits;

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(currentLocation);

          const now = Date.now();
          const trackingResult = resolveTrackingTick({
            pois: enrichedPois,
            currentLocation,
            nowMs: now,
            targetPoiId: qrTargetPoiRef.current,
            lastPlayedAtByPoiId: lastPlayedAtRef.current,
            previousCandidateState: candidateRef.current,
            requiredStableHits,
            activePlayingPoiId: playingPoiIdRef.current,
          });

          candidateRef.current = trackingResult.nextCandidateState;

          if (!trackingResult.selectedCandidate) {
            return;
          }
          const candidatePoi = trackingResult.selectedCandidate;
          const activePlayingPoiId = playingPoiIdRef.current;
          const canAutoPlay = trackingResult.shouldAutoPlay;

          const selectedTrackingPoi =
            (activePlayingPoiId ? enrichedPois.find((poi) => poi.id === activePlayingPoiId) : null) ||
            (canAutoPlay ? candidatePoi : selectedPoi) ||
            candidatePoi;

          if (selectedTrackingPoi.id !== selectedPoiId) {
            setSelectedPoiId(selectedTrackingPoi.id);
            setMapCenter({ latitude: selectedTrackingPoi.latitude, longitude: selectedTrackingPoi.longitude });
          }

          if (canAutoPlay) {
            lastPlayedAtRef.current[candidatePoi.id] = now;
            const shouldPlayTransitionCue =
              !!lastTrackingAutoPoiIdRef.current && lastTrackingAutoPoiIdRef.current !== candidatePoi.id;
            lastTrackingAutoPoiIdRef.current = candidatePoi.id;
            try {
              await playMapPoi(candidatePoi, {
                optimisticCount: false,
                transitionCue: shouldPlayTransitionCue,
              });
            } catch (error: any) {
              setTrackingEnabled(false);
              setToast(error?.message || "Không thể phát audio tự động.");
            }
          }
        },
        () => undefined,
        { enableHighAccuracy: trackingModeConfig.highAccuracy }
      );
    };

    trackingTickRef.current = tick;
    tick();
    trackingTimerRef.current = window.setInterval(tick, intervalMs);

    return () => {
      trackingTickRef.current = null;
      if (trackingTimerRef.current) {
        window.clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
    };
  }, [enrichedPois, playingPoiId, selectedPoi, selectedPoiId, subscriptionActive, trackingEnabled]);

  const visibleCenter = mapCenter || userLocation;
  const shouldShowQrTapPrompt =
    !!selectedPoi &&
    !trackingEnabled &&
    !subscriptionActive &&
    freePlaysRemaining > 0 &&
    !playingPoiId &&
    !startingQrPreview &&
    !!qrTargetPoiRef.current &&
    qrTargetPoiRef.current === selectedPoi.id &&
    qrAutoPlayedPoiRef.current !== selectedPoi.id;
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
          style={{ height: "calc(env(safe-area-inset-top) + 80px)" }}
        >
          <div className="px-5 pt-[calc(env(safe-area-inset-top)+18px)]">
            <AppHeader
              leftIcon="qr"
              onLeftClick={() => router.push(`/scan?returnTo=${encodeURIComponent(router.asPath || "/map")}`)}
            />
          </div>
        </div>

        {visibleCenter ? (
          <div
            className="absolute inset-x-0 z-0 overflow-hidden"
            style={{
              top: "calc(env(safe-area-inset-top) + 80px)",
              bottom: "calc(env(safe-area-inset-bottom) + 74px)",
            }}
          >
            <MapSurface
              center={visibleCenter}
              pois={enrichedPois}
              selectedPoiId={selectedPoiId}
              userLocation={userLocation}
              heightClassName="h-full"
              markerLabels={tourMarkerLabels}
              routePath={tourRoutePath}
              fitPoints={tourFitPoints}
              centerSignal={mapCenterSignal}
              onMapTap={() => {
                if (!selectedPoiIdRef.current) return;
                clearSelectedPoi();
              }}
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

        {activeTour ? (
          <div
            className="absolute left-4 right-4 z-20 rounded-[18px] border border-[#DBEAFE] bg-white/95 px-4 py-3 shadow-[0_10px_24px_rgba(15,91,215,0.12)] backdrop-blur-sm"
            style={{ top: "calc(env(safe-area-inset-top) + 88px)" }}
          >
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => router.push("/tours")} className="min-w-0 flex-1 text-left">
                <p className="text-[16px] font-bold text-[#111827]">{activeTour.name}</p>
                <p className="mt-1 text-[12px] text-[#64748B]">
                  {t("tours.poiCount", { count: activeTour.poi_count })}, {tourOverview?.distanceKm ? `${tourOverview.distanceKm.toFixed(1).replace(".", ",")} km` : t("tours.distancePending")}
                  {tourOverview?.motorbikeMinutes ? `, ${t("tours.motorbikeTime", { count: tourOverview.motorbikeMinutes })}` : ""}
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setTourFollowing((current) => {
                    const nextValue = !current;
                    if (nextValue) {
                      setTrackingEnabled(true);
                    } else {
                      setTrackingEnabled(false);
                    }
                    return nextValue;
                  })
                }
                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-bold ${
                  tourFollowing ? "bg-[#0F5BD7] text-white" : "bg-[#EAF2FF] text-[#0F5BD7]"
                }`}
              >
                {tourFollowing ? t("tours.stop") : t("tours.start")}
              </button>
            </div>
          </div>
        ) : null}

        {!isTourMode ? (
          <div className="absolute inset-x-5 z-20" style={{ top: "calc(env(safe-area-inset-top) + 92px)" }}>
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
                clearSelectedPoi();
              }}
            />
          </div>
        ) : null}

        {!isTourMode && showSuggestions && suggestions.length > 0 ? (
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
          style={{ top: activeTour ? "calc(env(safe-area-inset-top) + 184px)" : "calc(env(safe-area-inset-top) + 190px)" }}
          onClick={() => {
            if (userLocation) {
              setSelectedPoiId("");
              setMapCenter({ ...userLocation });
              setMapCenterSignal((value) => value + 1);
            }
          }}
        >
          <img src="/assets/location.png" alt={t("detail.location")} className="h-[26px] w-[26px]" />
        </button>

        <button
          type="button"
          className="absolute right-4 z-30 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#374151] text-white shadow-[0_10px_18px_rgba(0,0,0,0.18)] transition-all duration-200"
          style={{ bottom: trackingBottom }}
          onClick={async () => {
            const nextValue = !trackingEnabled;

            if (!nextValue) {
              stopSpeech();
              await playTrackingStatusTts(false);
              setTrackingEnabled(false);
              setTourFollowing(false);
              return;
            }

            await playTrackingStatusTts(true);
            setTrackingEnabled(true);

            if (playingPoiIdRef.current || !navigator.geolocation) {
              return;
            }

            await primeAudioPlayback();
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const currentLocation = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                };
                setUserLocation(currentLocation);

                const now = Date.now();
                const trackingModeConfig = getTrackingModeConfig();
                const trackingResult = resolveTrackingTick({
                  pois: enrichedPois,
                  currentLocation,
                  nowMs: now,
                  targetPoiId: qrTargetPoiRef.current,
                  lastPlayedAtByPoiId: lastPlayedAtRef.current,
                  previousCandidateState: candidateRef.current,
                  requiredStableHits: trackingModeConfig.requiredStableHits,
                  activePlayingPoiId: playingPoiIdRef.current,
                });
                const candidatePoi = trackingResult.selectedCandidate;

                if (!candidatePoi || playingPoiIdRef.current) {
                  return;
                }

                candidateRef.current = {
                  poiId: candidatePoi.id,
                  hits: trackingModeConfig.requiredStableHits,
                };
                lastTrackingAutoPoiIdRef.current = candidatePoi.id;
                setSelectedPoiId(candidatePoi.id);
                setMapCenter({ latitude: candidatePoi.latitude, longitude: candidatePoi.longitude });
                lastPlayedAtRef.current[candidatePoi.id] = now;

                try {
                  await playMapPoi(candidatePoi, { optimisticCount: false });
                } catch (error: any) {
                  setTrackingEnabled(false);
                  setToast(error?.message || "Không thể phát audio tự động.");
                }
              },
              () => undefined,
              { enableHighAccuracy: getTrackingModeConfig().highAccuracy }
            );
          }}
        >
          <img
            src={trackingEnabled ? "/assets/tracking_active.png" : "/assets/tracking.png"}
            alt="Tracking"
            className="h-5 w-5"
          />
          <span className="mt-1 text-[10px]">{trackingEnabled ? t("map.trackingOn") : t("map.trackingOff")}</span>
        </button>

        {shouldShowQrTapPrompt ? (
          <div
            className="absolute inset-x-4 z-30 rounded-[22px] border border-[#BFDBFE] bg-white/95 p-4 shadow-[0_12px_28px_rgba(15,91,215,0.14)] backdrop-blur-sm"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 470px)" }}
          >
            <p className="text-center text-[14px] font-semibold text-[#0F172A]">Chạm để nghe miễn phí POI này</p>
            <p className="mt-1 text-center text-[12px] leading-5 text-[#64748B]">
              Nghe xong hệ thống sẽ chuyển sang trang gói để tiếp tục sử dụng.
            </p>
            <button
              type="button"
              className="mt-3 h-[48px] w-full rounded-[16px] bg-[#0F5BD7] text-[15px] font-semibold text-white"
              onClick={async () => {
                if (!selectedPoi) return;
                setStartingQrPreview(true);
                const success = await playMapPoi(selectedPoi, {
                  redirectToPaywallAfterFree: true,
                  optimisticCount: false,
                });
                if (success) {
                  qrAutoPlayedPoiRef.current = selectedPoi.id;
                }
              }}
            >
              {startingQrPreview ? "Đang bật âm thanh..." : "Chạm để nghe miễn phí"}
            </button>
          </div>
        ) : null}

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
                    const returnTo = buildMapReturnUrl(selectedPoi.id);
                    setReturnTo(returnTo);
                    router.push(`/paywall?returnTo=${encodeURIComponent(returnTo)}`);
                    return;
                  }

                  await playMapPoi(selectedPoi, {
                    redirectToPaywallAfterFree: !subscriptionActive,
                    optimisticCount: true,
                  });
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

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import DirectionsSheet from "@/components/DirectionsSheet";
import MapSurface from "@/components/MapSurface";
import SearchBar from "@/components/SearchBar";
import apiClient from "@/lib/api";
import { playPoiAudio } from "@/lib/audio";
import {
  ensureDeviceReady,
  getDeviceId,
  getPendingPoiId,
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
  listened_count: number;
  rating_avg: number;
  images: string[];
  audios: { languageCode: string; languageName: string; scriptText: string }[];
};

export default function MapPage() {
  const router = useRouter();
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [freePlaysRemaining, setFreePlaysRemaining] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [mapCenter, setMapCenter] = useState<GeoPoint | null>(null);

  useEffect(() => {
    const load = async () => {
      await ensureDeviceReady();

      const deviceId = getDeviceId();
      const [poiResponse, accessResponse] = await Promise.all([
        apiClient.get(`/pois?deviceId=${deviceId}`),
        apiClient.get(`/access/free-listen?deviceId=${deviceId}`),
      ]);

      const items = poiResponse.data || [];
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

      const poiId = typeof router.query.poiId === "string" ? router.query.poiId : getPendingPoiId();
      const selectedPoi = poiId
        ? items.find((item: Poi) => item.id === poiId)
        : items[0];

      if (selectedPoi) {
        setSelectedPoiId(selectedPoi.id);
        setMapCenter({ latitude: selectedPoi.latitude, longitude: selectedPoi.longitude });
      }

      setSubscriptionActive(hasActiveSubscription);
      setFreePlaysRemaining(remainingFreePlays);
    };

    load();
  }, [router, router.query.poiId]);

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

  const enrichedPois = useMemo(() => {
    return pois.map((poi) => ({
      ...poi,
      distanceKm: userLocation
        ? calculateDistanceKm(userLocation, { latitude: poi.latitude, longitude: poi.longitude })
        : 0,
    }));
  }, [pois, userLocation]);

  const suggestions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return [];

    return enrichedPois.filter((poi) => [poi.name, poi.address].join(" ").toLowerCase().includes(keyword));
  }, [enrichedPois, searchText]);

  const selectedPoi = useMemo(
    () => enrichedPois.find((poi) => poi.id === selectedPoiId) || null,
    [enrichedPois, selectedPoiId]
  );

  const selectedDistance = useMemo(() => {
    if (!selectedPoi) return "";

    if (selectedPoi.distanceKm < 1 && selectedPoi.distanceKm > 0) {
      return `${Math.round(selectedPoi.distanceKm * 1000)} m`;
    }

    return `${selectedPoi.distanceKm.toFixed(1).replace(".", ",")} km`;
  }, [selectedPoi]);

  const visibleCenter = mapCenter || userLocation;

  return (
    <>
      <main className="relative min-h-screen bg-[#F4F7FB] pb-[110px]">
        <div className="absolute left-0 right-0 top-0 z-10 h-[70px] bg-[#F4F7FB]" />
        <div className="absolute left-0 right-0 top-[20px] z-20 text-center text-[22px] font-bold text-[#0F5BD7]">
          Smart Guide
        </div>

        {visibleCenter ? (
          <div className="absolute inset-0">
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

        <div className="absolute inset-x-4 top-20 z-20">
          <SearchBar
            value={searchText}
            placeholder="Tìm kiếm địa điểm..."
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
                  <p className="text-[15px] font-bold text-[#111827]">{poi.name}</p>
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
          className="absolute right-4 top-[190px] z-20 flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-white shadow-[0_10px_18px_rgba(0,0,0,0.08)]"
          onClick={() => {
            if (userLocation) {
              setMapCenter(userLocation);
              setSelectedPoiId("");
            }
          }}
        >
          <img src="/assets/location.png" alt="Location" className="h-[26px] w-[26px]" />
        </button>

        <button
          type="button"
          className="absolute bottom-[100px] right-4 z-20 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#374151] text-white shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          onClick={() => setTrackingEnabled((value) => !value)}
        >
          <img
            src={trackingEnabled ? "/assets/tracking_active.png" : "/assets/tracking.png"}
            alt="Tracking"
            className="h-5 w-5"
          />
          <span className="mt-1 text-[10px]">Tracking: {trackingEnabled ? "ON" : "OFF"}</span>
        </button>

        {selectedPoi ? (
          <div className="absolute inset-x-4 bottom-[86px] z-20 rounded-[22px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
            <div className="grid grid-cols-[100px,1fr,36px] gap-3">
              <div className="overflow-hidden rounded-[18px] border border-[#E5E7EB]">
                <img
                  src={selectedPoi.images?.[0] || "/assets/appiconfg.png"}
                  alt={selectedPoi.name}
                  className="h-[100px] w-[100px] object-cover"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-[#0F5BD7]">{selectedPoi.category?.toUpperCase()}</p>
                <p className="line-clamp-2 text-[18px] font-bold text-[#111827]">{selectedPoi.name}</p>
                <div className="flex items-center gap-2 text-[13px] text-[#111827]">
                  <img src="/assets/listen2.png" alt="Listen" className="h-[14px] w-[14px]" />
                  <span>{selectedPoi.listened_count}</span>
                  <img src="/assets/star.png" alt="Star" className="h-[14px] w-[14px]" />
                  <span>{(selectedPoi.rating_avg || 0).toFixed(1).replace(".", ",")}</span>
                </div>
                <p className="text-[14px] text-[#0F5BD7]">{selectedDistance}</p>
                <p className="line-clamp-2 text-[12px] text-[#6B7280]">{selectedPoi.address}</p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center self-start rounded-full bg-[#D1D5DB]"
                onClick={async () => {
                  if (!subscriptionActive && freePlaysRemaining <= 0) {
                    setReturnTo(`/map?poiId=${selectedPoi.id}`);
                    router.push(`/paywall?returnTo=${encodeURIComponent(`/map?poiId=${selectedPoi.id}`)}`);
                    return;
                  }

                  setPendingPoiId(selectedPoi.id);
                  setIsPlaying(true);

                  try {
                    await playPoiAudio(selectedPoi, { consumeFreeListen: !subscriptionActive });
                  } finally {
                    setIsPlaying(false);
                  }

                  if (!subscriptionActive) {
                    setFreePlaysRemaining((value) => Math.max(0, value - 1));
                    setReturnTo(`/map?poiId=${selectedPoi.id}`);
                    router.push(`/paywall?returnTo=${encodeURIComponent(`/map?poiId=${selectedPoi.id}`)}`);
                  }
                }}
              >
                <img src={isPlaying ? "/assets/audio.png" : "/assets/audio2.png"} alt="Audio" className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-[10px]">
              <button type="button" className="h-[50px] rounded-[16px] bg-[#0F5BD7] text-white" onClick={() => setShowDirections(true)}>
                Chỉ đường
              </button>
              <button
                type="button"
                className="h-[50px] rounded-[16px] bg-[#E5E7EB] text-[#0F5BD7]"
                onClick={() => router.push(`/detail?poiId=${selectedPoi.id}`)}
              >
                Chi tiết
              </button>
            </div>
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

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import MapSurface from "@/components/MapSurface";
import SearchBar from "@/components/SearchBar";
import ToastBanner from "@/components/ToastBanner";
import apiClient from "@/lib/api";
import { playPoiAudio, stopSpeech } from "@/lib/audio";
import { ensureDeviceReady, getDeviceId, setReturnTo } from "@/lib/device";
import { calculateDistanceKm, type GeoPoint } from "@/lib/location";

type Poi = {
  id: string;
  name: string;
  category: string;
  short_description?: string;
  description: string;
  address: string;
  priceText?: string;
  latitude: number;
  longitude: number;
  listened_count: number;
  rating_avg: number;
  is_favorite?: boolean;
  images: string[];
  audios: { languageCode: string; languageName: string; scriptText: string }[];
};

type FilterOption = "Tất cả" | "Gần bạn" | "Miễn phí";

let homeCache:
  | {
      hasLoaded: boolean;
      pois: Poi[];
      searchText: string;
      userLocation: GeoPoint | null;
      filter: FilterOption;
      sortBy: "distance" | "listened" | "name";
      sortAscending: boolean;
      subscriptionActive: boolean;
      freePlaysRemaining: number;
      scrollY: number;
    }
  | null = null;

export default function HomePage() {
  const router = useRouter();
  const [pois, setPois] = useState<Poi[]>([]);
  const [searchText, setSearchText] = useState("");
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<FilterOption>("Tất cả");
  const [sortBy, setSortBy] = useState<"distance" | "listened" | "name">("distance");
  const [sortAscending, setSortAscending] = useState(true);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [freePlaysRemaining, setFreePlaysRemaining] = useState(0);
  const [playingPoiId, setPlayingPoiId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        if (homeCache?.hasLoaded) {
          setPois(homeCache.pois);
          setSearchText(homeCache.searchText);
          setUserLocation(homeCache.userLocation);
          setFilter(homeCache.filter);
          setSortBy(homeCache.sortBy);
          setSortAscending(homeCache.sortAscending);
          setSubscriptionActive(homeCache.subscriptionActive);
          setFreePlaysRemaining(homeCache.freePlaysRemaining);
          setIsLoading(false);
          requestAnimationFrame(() => window.scrollTo(0, homeCache?.scrollY || 0));
          return;
        }

        await ensureDeviceReady();

        const deviceId = getDeviceId();
        const [poiResponse, accessResponse] = await Promise.all([
          apiClient.get(`/pois?deviceId=${deviceId}`),
          apiClient.get(`/access/free-listen?deviceId=${deviceId}`),
        ]);

        const hasAccess =
          !!accessResponse.data?.hasActiveSubscription ||
          Number(accessResponse.data?.freePlaysRemaining || 0) > 0;

        if (!hasAccess) {
          setReturnTo("/");
          router.replace("/paywall?returnTo=%2F");
          return;
        }

        setPois(poiResponse.data || []);
        setSubscriptionActive(!!accessResponse.data?.hasActiveSubscription);
        setFreePlaysRemaining(Number(accessResponse.data?.freePlaysRemaining || 0));
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || "Không thể kết nối tới server.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const saveCache = () => {
      homeCache = {
        hasLoaded: !isLoading && !errorMessage && pois.length > 0,
        pois,
        searchText,
        userLocation,
        filter,
        sortBy,
        sortAscending,
        subscriptionActive,
        freePlaysRemaining,
        scrollY: window.scrollY,
      };
    };

    saveCache();
    window.addEventListener("scroll", saveCache, { passive: true });

    return () => {
      saveCache();
      window.removeEventListener("scroll", saveCache);
    };
  }, [errorMessage, filter, freePlaysRemaining, isLoading, pois, searchText, sortAscending, sortBy, subscriptionActive, userLocation]);

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

  const enrichedPois = useMemo(() => {
    return pois.map((poi) => ({
      ...poi,
      distanceKm: userLocation
        ? calculateDistanceKm(userLocation, { latitude: poi.latitude, longitude: poi.longitude })
        : 0,
    }));
  }, [pois, userLocation]);

  const filteredPois = useMemo(() => {
    let result = [...enrichedPois];

    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      result = result.filter((poi) => {
        const haystack = [poi.name, poi.address, poi.category].join(" ").toLowerCase();
        return haystack.includes(keyword);
      });
    }

    result = filter === "Gần bạn"
      ? result.filter((poi) => poi.distanceKm <= 2)
      : filter === "Miễn phí"
        ? result.filter((poi) => (poi.priceText || "").toLowerCase().includes("miễn phí"))
        : result;

    result.sort((left, right) => {
      if (sortBy === "name") {
        return sortAscending ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name);
      }

      if (sortBy === "listened") {
        return sortAscending
          ? left.listened_count - right.listened_count
          : right.listened_count - left.listened_count;
      }

      return sortAscending ? left.distanceKm - right.distanceKm : right.distanceKm - left.distanceKm;
    });

    return result;
  }, [enrichedPois, filter, searchText, sortAscending, sortBy]);

  const suggestions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return [];

    return enrichedPois.filter((poi) => {
      const haystack = [poi.name, poi.address, poi.category].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [searchText, enrichedPois]);

  const previewCenter = userLocation ||
    (filteredPois[0]
      ? { latitude: filteredPois[0].latitude, longitude: filteredPois[0].longitude }
      : null);

  const sortLabel = useMemo(() => {
    if (sortBy === "name") return sortAscending ? "Tên A-Z" : "Tên Z-A";
    if (sortBy === "listened") return sortAscending ? "Nghe nhiều ↑" : "Nghe nhiều ↓";
    return sortAscending ? "Khoảng cách ↑" : "Khoảng cách ↓";
  }, [sortAscending, sortBy]);

  const updatePoi = (poiId: string, updater: (poi: Poi) => Poi) => {
    setPois((current) => current.map((poi) => (poi.id === poiId ? updater(poi) : poi)));
  };

  const handleFavorite = async (event: React.MouseEvent, poi: Poi) => {
    event.stopPropagation();
    const nextFavorite = !poi.is_favorite;
    updatePoi(poi.id, (current) => ({ ...current, is_favorite: nextFavorite }));

    try {
      await apiClient.post(`/pois/favorite/${poi.id}?deviceId=${getDeviceId()}&isFavorite=${nextFavorite}`);
      if (nextFavorite) {
        setToast("Đã thêm vào yêu thích!");
      }
    } catch {
      updatePoi(poi.id, (current) => ({ ...current, is_favorite: !nextFavorite }));
    }
  };

  const handleAudio = async (event: React.MouseEvent, poi: Poi) => {
    event.stopPropagation();

    if (playingPoiId === poi.id) {
      stopSpeech();
      setPlayingPoiId("");
      return;
    }

    if (!subscriptionActive && freePlaysRemaining <= 0) {
      setReturnTo(`/detail?poiId=${poi.id}`);
      router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poi.id}`)}`);
      return;
    }

    setPlayingPoiId(poi.id);
    updatePoi(poi.id, (current) => ({ ...current, listened_count: current.listened_count + 1 }));

    try {
      const result = await playPoiAudio(poi, {
        consumeFreeListen: !subscriptionActive,
        onListenedCount: (count) => {
          updatePoi(poi.id, (current) => ({ ...current, listened_count: count }));
        },
      });
      if (result.listenedCount) {
        updatePoi(poi.id, (current) => ({ ...current, listened_count: result.listenedCount || current.listened_count }));
      }
    } finally {
      setPlayingPoiId("");
    }

    if (!subscriptionActive) {
      setFreePlaysRemaining((value) => Math.max(0, value - 1));
      setReturnTo(`/detail?poiId=${poi.id}`);
      router.push(`/paywall?returnTo=${encodeURIComponent(`/detail?poiId=${poi.id}`)}`);
    }
  };

  return (
    <>
      <ToastBanner message={toast} />

      <main className="app-shell space-y-[18px]">
        <AppHeader showMenu showNotification />

        <section className="space-y-1">
          <p className="text-[12px] font-bold text-[#0F5BD7]">HÀNH TRÌNH CỦA BẠN</p>
          <h2 className="max-w-[320px] text-[27px] font-bold leading-[1.18] text-[#111827]">
            Xin chào! Bạn muốn đi đâu hôm nay?
          </h2>
        </section>

        <div className="space-y-0">
          <SearchBar
            value={searchText}
            placeholder="Tìm kiếm địa điểm..."
            active={showSuggestions || !!searchText}
            onChange={(value) => {
              setSearchText(value);
              setShowSuggestions(!!value);
            }}
            onCancel={() => {
              setSearchText("");
              setShowSuggestions(false);
            }}
          />

          {showSuggestions && suggestions.length > 0 ? (
            <div className="ios-card -mt-1 overflow-hidden rounded-b-[18px] rounded-t-none border-t-0">
              {suggestions.slice(0, 5).map((poi) => (
                <button
                  key={poi.id}
                  type="button"
                  className="grid w-full grid-cols-[1fr,64px] gap-3 border-b border-[#EEF2F7] px-4 py-3 text-left last:border-b-0"
                  onClick={() => router.push(`/detail?poiId=${poi.id}`)}
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
        </div>

        <section className="space-y-3">
          <h3 className="text-[24px] font-bold text-[#111827]">Vị trí hiện tại</h3>
          {previewCenter ? (
            <div className="ios-card overflow-hidden rounded-[20px] p-0">
              <div className="relative h-[200px]">
                <MapSurface
                  center={previewCenter}
                  pois={filteredPois}
                  userLocation={userLocation}
                  heightClassName="h-full"
                  onSelectPoi={(poiId) => router.push(`/map?poiId=${poiId}`)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-white shadow-[0_10px_18px_rgba(0,0,0,0.08)]"
                  onClick={() => router.push("/map")}
                >
                  <img src="/assets/location.png" alt="Location" className="h-[26px] w-[26px]" />
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" className="flex items-center gap-2" onClick={() => setShowFilterSheet(true)}>
              <h3 className="text-[24px] font-bold text-[#111827]">{filter}</h3>
              <img src="/assets/dropdown.png" alt="Dropdown" className="h-[14px] w-[14px]" />
            </button>
            <button
              type="button"
              className={`flex h-[36px] items-center gap-2 rounded-[10px] border px-3 text-[13px] ${
                sortBy === "distance" && sortAscending
                  ? "border-[#E5E7EB] bg-white text-[#9CA3AF]"
                  : "border-[#D7E5FF] bg-[#F3F7FF] text-[#0F5BD7]"
              }`}
              onClick={() => setShowSortSheet(true)}
            >
              <img src={sortBy === "distance" && sortAscending ? "/assets/sort.png" : "/assets/sort_active.png"} alt="Sort" className="h-[14px] w-[14px]" />
              <span>Sắp xếp</span>
            </button>
          </div>

          {isLoading ? (
            <div className="ios-card rounded-[20px] px-4 py-5 text-[14px] text-[#6B7280]">
              Đang tải danh sách địa điểm...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="ios-card rounded-[20px] px-4 py-5 text-[14px] text-[#DC2626]">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-4">
            {filteredPois.map((poi) => (
              <div key={poi.id} className="ios-card overflow-hidden rounded-[16px]">
                <div className="relative h-[145px] cursor-pointer" onClick={() => router.push(`/detail?poiId=${poi.id}`)}>
                  <img
                    src={poi.images?.[0] || "/assets/appiconfg.png"}
                    alt={poi.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-[14px] top-[14px] rounded-[12px] bg-[#FFF4E5] px-3 py-1 text-[11px] font-bold text-[#B45309]">
                    {poi.category} • {poi.distanceKm.toFixed(1).replace(".", ",")} km
                  </div>
                  <button
                    type="button"
                    className="absolute right-[14px] top-[14px]"
                    onClick={(event) => handleAudio(event, poi)}
                  >
                    <img
                      src={playingPoiId === poi.id ? "/assets/audio.png" : "/assets/audio2.png"}
                      alt="Audio"
                      className="h-[22px] w-[22px]"
                    />
                  </button>
                  <div className="absolute bottom-[14px] right-[14px] flex items-center gap-1 text-[12px] font-bold text-white">
                    <img src="/assets/listen.png" alt="Listen" className="h-[14px] w-[14px]" />
                    <span>{poi.listened_count}</span>
                    <img src="/assets/star.png" alt="Star" className="ml-1 h-[14px] w-[14px]" />
                    <span>{(poi.rating_avg || 0).toFixed(1).replace(".", ",")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr,44px] gap-3 px-4 py-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => router.push(`/detail?poiId=${poi.id}`)}>
                    <p className="truncate text-[17px] font-bold text-[#111827]">{poi.name}</p>
                    <p className="mt-1 line-clamp-2 text-[14px] text-[#5B6474]">{poi.address}</p>
                    <p className="mt-1 text-[13px] font-bold text-[#0F5BD7]">Xem chi tiết</p>
                  </button>

                  <button
                    type="button"
                    className="flex h-[44px] w-[44px] items-center justify-center self-center rounded-full bg-[#F3F7FF]"
                    onClick={(event) => handleFavorite(event, poi)}
                  >
                    <img
                      src={poi.is_favorite ? "/assets/favorite_active.png" : "/assets/favorite.png"}
                      alt="Favorite"
                      className="h-5 w-5"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showFilterSheet ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowFilterSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[540px] rounded-t-[20px] bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-[#111827]">Chọn mục</h3>
            <div className="mt-4 grid gap-3">
              {(["Gần bạn", "Tất cả", "Miễn phí"] as FilterOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-[16px] border px-4 py-4 text-left ${filter === option ? "border-[#D7E5FF] bg-[#F3F7FF] text-[#0F5BD7]" : "border-[#E5E7EB]"}`}
                  onClick={() => {
                    setFilter(option);
                    setShowFilterSheet(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showSortSheet ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowSortSheet(false)}>
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[540px] rounded-t-[20px] bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-[#111827]">Sắp xếp</h3>
            <p className="mt-1 text-[13px] text-[#6B7280]">{sortLabel}</p>
            <div className="mt-4 grid gap-3">
              {[
                { label: "Khoảng cách ↑", key: "distance", asc: true },
                { label: "Khoảng cách ↓", key: "distance", asc: false },
                { label: "Nghe nhiều ↓", key: "listened", asc: false },
                { label: "Nghe nhiều ↑", key: "listened", asc: true },
                { label: "Tên A-Z", key: "name", asc: true },
                { label: "Tên Z-A", key: "name", asc: false },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={`rounded-[16px] border px-4 py-4 text-left ${
                    sortBy === option.key && sortAscending === option.asc
                      ? "border-[#D7E5FF] bg-[#F3F7FF] text-[#0F5BD7]"
                      : "border-[#E5E7EB]"
                  }`}
                  onClick={() => {
                    setSortBy(option.key as "distance" | "listened" | "name");
                    setSortAscending(option.asc);
                    setShowSortSheet(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

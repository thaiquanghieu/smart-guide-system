import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import MapSurface from "@/components/MapSurface";
import SearchBar from "@/components/SearchBar";
import apiClient from "@/lib/api";
import { ensureDeviceReady, getDeviceId, setReturnTo } from "@/lib/device";
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
  is_favorite?: boolean;
  images: string[];
};

export default function HomePage() {
  const router = useRouter();
  const [pois, setPois] = useState<Poi[]>([]);
  const [searchText, setSearchText] = useState("");
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
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
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router]);

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

  const sortedPois = useMemo(() => {
    return [...pois]
      .map((poi) => {
        const distanceKm = userLocation
          ? calculateDistanceKm(userLocation, { latitude: poi.latitude, longitude: poi.longitude })
          : 0;
        return { ...poi, distanceKm };
      })
      .sort((left, right) => left.distanceKm - right.distanceKm);
  }, [pois, userLocation]);

  const suggestions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return [];

    return sortedPois.filter((poi) => {
      const haystack = [poi.name, poi.address, poi.category].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }, [searchText, sortedPois]);

  const previewCenter = userLocation ||
    (sortedPois[0]
      ? { latitude: sortedPois[0].latitude, longitude: sortedPois[0].longitude }
      : null);

  return (
    <>
      <main className="app-shell space-y-[18px]">
        <AppHeader showMenu showNotification />

        <section className="space-y-1">
          <p className="text-[12px] font-bold text-[#0F5BD7]">HÀNH TRÌNH CỦA BẠN</p>
          <h2 className="max-w-[320px] text-[30px] font-bold leading-[1.15] text-[#111827]">
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
                    <p className="text-[15px] font-bold text-[#111827]">{poi.name}</p>
                    <p className="mt-1 text-[12px] text-[#6B7280]">{poi.address}</p>
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
          <h3 className="text-[27px] font-bold text-[#111827]">Vị trí hiện tại</h3>
          {previewCenter ? (
            <div className="ios-card overflow-hidden rounded-[20px] p-0">
              <div className="relative h-[200px]">
                <MapSurface center={previewCenter} userLocation={userLocation} heightClassName="h-full" />
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
            <div className="flex items-center gap-2">
              <h3 className="text-[27px] font-bold text-[#111827]">Gần bạn</h3>
              <img src="/assets/dropdown.png" alt="Dropdown" className="h-[14px] w-[14px]" />
            </div>
            <div className="flex h-[36px] items-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#9CA3AF]">
              <img src="/assets/sort.png" alt="Sort" className="h-[14px] w-[14px]" />
              <span>Sắp xếp</span>
            </div>
          </div>

          {isLoading ? (
            <div className="ios-card rounded-[20px] px-4 py-5 text-[14px] text-[#6B7280]">
              Đang tải danh sách địa điểm...
            </div>
          ) : null}

          <div className="space-y-4">
            {sortedPois.map((poi) => (
              <div key={poi.id} className="ios-card overflow-hidden rounded-[16px]">
                <button type="button" className="block w-full text-left" onClick={() => router.push(`/detail?poiId=${poi.id}`)}>
                  <div className="relative h-[145px]">
                    <img
                      src={poi.images?.[0] || "/assets/appiconfg.png"}
                      alt={poi.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-[14px] top-[14px] rounded-[12px] bg-[#FFF4E5] px-3 py-1 text-[11px] font-bold text-[#B45309]">
                      {poi.category} • {poi.distanceKm.toFixed(1).replace(".", ",")} km
                    </div>
                    <img src="/assets/audio2.png" alt="Audio" className="absolute right-[14px] top-[14px] h-[22px] w-[22px]" />
                    <div className="absolute bottom-[14px] right-[14px] flex items-center gap-1 text-[12px] font-bold text-white">
                      <img src="/assets/listen.png" alt="Listen" className="h-[14px] w-[14px]" />
                      <span>{poi.listened_count}</span>
                      <img src="/assets/star.png" alt="Star" className="ml-1 h-[14px] w-[14px]" />
                      <span>{(poi.rating_avg || 0).toFixed(1).replace(".", ",")}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr,44px] gap-3 px-4 py-3">
                    <div>
                      <p className="truncate text-[21px] font-bold text-[#111827]">{poi.name}</p>
                      <p className="mt-1 text-[14px] text-[#5B6474]">{poi.address}</p>
                      <p className="mt-1 text-[13px] font-bold text-[#0F5BD7]">Xem chi tiết</p>
                    </div>
                    <div className="flex h-[44px] w-[44px] items-center justify-center self-center rounded-full bg-[#F3F7FF]">
                      <img
                        src={poi.is_favorite ? "/assets/favorite_active.png" : "/assets/favorite.png"}
                        alt="Favorite"
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}

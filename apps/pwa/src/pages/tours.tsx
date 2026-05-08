import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ToastBanner from "@/components/ToastBanner";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import apiClient, { assetUrl } from "@/lib/api";
import { useAppI18n } from "@/lib/i18n";

type TourPoi = {
  id: string;
  name: string;
  category?: string;
  address?: string;
  image?: string;
  sort_order: number;
};

type Tour = {
  id: number;
  name: string;
  description: string;
  cover_image_url?: string;
  poi_count: number;
  pois: TourPoi[];
};

export default function ToursPage() {
  const router = useRouter();
  const { t } = useAppI18n();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedTour, setExpandedTour] = useState<Tour | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/tours");
        setTours(Array.isArray(response.data) ? response.data : []);
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || error?.message || "Không tải được tour.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <AppLoadingScreen message={t("tours.loading")} />;
  }

  return (
    <>
      <ToastBanner message={errorMessage} />

      <main className="app-shell space-y-[18px]">
        <AppHeader />

        <section className="space-y-1">
          <h2 className="max-w-[320px] text-[27px] font-bold leading-[1.18] text-[#111827]" suppressHydrationWarning>
            {t("tours.title")}
          </h2>
          <p className="max-w-[360px] text-[14px] leading-6 text-[#6B7280]" suppressHydrationWarning>
            {t("tours.subtitle")}
          </p>
        </section>

        {errorMessage ? (
          <section className="ios-card rounded-[20px] px-4 py-5 text-[14px] text-[#DC2626]">
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && tours.length === 0 ? (
          <section className="ios-card rounded-[24px] px-5 py-6 text-[14px] text-[#6B7280]" suppressHydrationWarning>
            {t("tours.empty")}
          </section>
        ) : null}

        <section className="space-y-5 pb-24">
          {tours.map((tour) => {
            const previewImage = assetUrl(tour.cover_image_url || tour.pois[0]?.image) || "/assets/appiconfg.png";
            const firstPoiId = tour.pois[0]?.id;

            return (
              <article key={tour.id} className="ios-card overflow-hidden rounded-[26px] border border-[#D7E5FF] shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
                <div className="relative h-[220px]">
                  <img src={previewImage} alt={tour.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#111827]/85 via-[#111827]/30 to-transparent px-5 pb-5 pt-12">
                    <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-white/75" suppressHydrationWarning>
                      {t("tours.poiCount", { count: tour.poi_count })}
                    </p>
                    <h3 className="mt-2 text-[24px] font-bold text-white">{tour.name}</h3>
                  </div>
                </div>

                <div className="space-y-5 px-5 py-5">
                  <p className="text-[14px] leading-6 text-[#5B6474]">{tour.description || t("tours.subtitle")}</p>

                  <div className="space-y-3">
                    {tour.pois.slice(0, 1).map((poi, index) => (
                      <div key={poi.id} className="flex items-start gap-3 rounded-[18px] border border-[#E6EEF8] bg-[#F8FBFF] px-4 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F5BD7] text-[12px] font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-[#111827]">{poi.name}</p>
                          <p className="mt-1 text-[13px] text-[#6B7280]">{poi.address || poi.category || poi.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {tour.pois.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedTour(tour)}
                      className="text-[14px] font-bold text-[#0F5BD7]"
                      suppressHydrationWarning
                    >
                      Xem tất cả {tour.poi_count} điểm
                    </button>
                  ) : null}

                  {firstPoiId ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/map?tourId=${encodeURIComponent(String(tour.id))}`)}
                      className="w-full rounded-[18px] bg-[#0F5BD7] px-4 py-4 text-[15px] font-bold text-white shadow-[0_16px_34px_rgba(15,91,215,0.22)]"
                      suppressHydrationWarning
                    >
                      {t("tours.view")}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {expandedTour ? (
        <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in" onClick={() => setExpandedTour(null)}>
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-h-[78vh] max-w-[540px] rounded-t-[28px] bg-white p-5 animate-sheet-up" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="mt-2 text-[22px] font-bold text-[#111827]">{expandedTour.name}</h3>
              </div>
              <button type="button" onClick={() => setExpandedTour(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F7FF] text-[#0F5BD7]">
                ×
              </button>
            </div>
            <div className="mt-4 max-h-[58vh] space-y-3 overflow-y-auto pr-1">
              {expandedTour.pois.map((poi, index) => (
                <div key={poi.id} className="flex items-start gap-3 rounded-[18px] border border-[#E6EEF8] bg-[#F8FBFF] px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F5BD7] text-[12px] font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-[#111827]">{poi.name}</p>
                    <p className="mt-1 text-[13px] text-[#6B7280]">{poi.address || poi.category || poi.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

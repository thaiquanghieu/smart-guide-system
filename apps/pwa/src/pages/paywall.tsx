import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { QrCode } from "lucide-react";
import apiClient from "@/lib/api";
import { ensureDeviceReady, setReturnTo } from "@/lib/device";
import { getPlanName, getPlanSubtitle, useAppI18n } from "@/lib/i18n";

type Plan = {
  id: number;
  name: string;
  days: number;
  price: number;
};

export default function PaywallPage() {
  const router = useRouter();
  const { lang, t } = useAppI18n();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<number | null>(null);

  const fromRenew = router.query.source === "renew";

  useEffect(() => {
    const load = async () => {
      try {
        await ensureDeviceReady();
        const response = await apiClient.get("/plans");
        setPlans(response.data || []);
      } catch (error: any) {
        setMessage(error?.response?.data?.message || t("paywall.loadingPlans"));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [t]);

  return (
    <main className="min-h-screen bg-[#041B2D] px-5 pb-8 text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
      <Head>
        <meta name="theme-color" content="#041B2D" />
      </Head>
      <div className="mx-auto max-w-[540px] space-y-[10px]">
        <div className="grid min-h-[20px] grid-cols-[28px,1fr,28px] items-center">
          <div />
          <div />
          {fromRenew ? (
            <button
              type="button"
              className="text-right text-[24px] leading-none text-[#D4E3F7]"
              onClick={() => router.replace("/profile")}
            >
              ×
            </button>
          ) : (
            <div />
          )}
        </div>

        <img src="/assets/appiconfg.png" alt={t("app.title")} className="mx-auto -mt-3 -mb-5 w-[164px]" />

        <p className="-mt-1 text-center text-[13px] text-[#D4E3F7]">{t("paywall.choosePlan")}</p>

        {message ? (
          <div className="rounded-[18px] border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</div>
        ) : null}

        <section className="space-y-[10px]">
          {isLoading ? (
            <div className="rounded-[22px] bg-[#F4F9FF] p-4 text-sm text-[#0B1320]">{t("paywall.loadingPlans")}</div>
          ) : null}

          {plans.map((plan, index) => {
            const highlighted = index === plans.length - 1;

            return (
              <button
                key={plan.id}
                type="button"
                className={`w-full rounded-[22px] border p-[18px] text-left transition-shadow duration-200 active:scale-[0.97] ${
                  pendingPlanId === plan.id ? "animate-paywall-card-press shadow-[0_18px_30px_rgba(15,91,215,0.18)]" : "shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                } ${
                  highlighted
                    ? "border-[#4C8FF1] bg-[#0F5BD7] text-white"
                    : "border-[#B9D8FF] bg-[#F4F9FF] text-[#111827]"
                }`}
                onClick={() => {
                  setPendingPlanId(plan.id);
                  const returnTo =
                    typeof router.query.returnTo === "string" ? router.query.returnTo : "/map";
                  setReturnTo(returnTo);
                  window.setTimeout(() => {
                    router.push(`/payment?planId=${plan.id}`);
                  }, 150);
                }}
                onAnimationEnd={() => {
                  if (pendingPlanId === plan.id) {
                    setPendingPlanId(null);
                  }
                }}
              >
                <div className="grid grid-cols-[1fr,auto] gap-3">
                  <div>
                    <p className="text-[18px] font-bold">{getPlanName(plan.id, lang)}</p>
                    <p className={`mt-1 text-[13px] ${highlighted ? "text-[#D6E8FF]" : "text-[#6B7280]"}`}>
                      {getPlanSubtitle(plan.id, lang)}
                    </p>
                  </div>
                  <p className="sr-only">{getPlanName(plan.id, lang)}</p>
                  <div className={`text-[18px] font-bold ${highlighted ? "text-white" : "text-[#0F5BD7]"}`}>
                    {plan.price.toLocaleString("vi-VN")} đ
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {!isLoading ? (
          <div className="pt-0.5 text-center">
            <button
              type="button"
              className="mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#0F5BD7] shadow-[0_14px_28px_rgba(15,91,215,0.28)]"
              onClick={() => router.push(`/scan?returnTo=${encodeURIComponent(router.asPath || "/paywall")}`)}
            >
              <QrCode className="h-7 w-7 text-white" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              className="mt-2 text-[13px] text-[#D4E3F7] underline underline-offset-4"
              onClick={() => setShowGuide(true)}
            >
              Xem hướng dẫn
            </button>
          </div>
        ) : null}

      </div>

      {showGuide ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-5 animate-fade-in">
          <div className="w-full max-w-[360px] rounded-[22px] bg-white p-5 text-[#111827] animate-pop-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-bold">Hướng dẫn quét QR</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#4B5563]">
                  Nếu bạn có mã QR tại điểm tham quan, hãy bấm nút quét QR để mở camera hoặc chọn ảnh QR từ thiết bị.
                  Hệ thống sẽ kiểm tra mã, cấp lượt nghe miễn phí nếu mã còn hiệu lực, rồi mở đúng POI hoặc đưa bạn vào bản đồ để nghe.
                </p>
                <p className="mt-3 text-[14px] leading-[1.6] text-[#4B5563]">
                  Nếu mã đã hết lượt, đã bị tạm ngưng hoặc không hợp lệ, ứng dụng sẽ báo lại để bạn thử mã khác hoặc chọn mua gói.
                </p>
              </div>
              <button type="button" className="text-[26px] leading-none text-[#6B7280]" onClick={() => setShowGuide(false)}>
                ×
              </button>
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-[16px] bg-[#0F5BD7] py-3 text-[16px] font-semibold text-white"
              onClick={() => setShowGuide(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

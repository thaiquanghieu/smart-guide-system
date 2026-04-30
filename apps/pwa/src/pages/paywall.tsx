import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
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
    <main className="min-h-screen bg-[#041B2D] px-5 pb-10 text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}>
      <Head>
        <meta name="theme-color" content="#041B2D" />
      </Head>
      <div className="mx-auto max-w-[540px] space-y-[12px]">
        <div className="grid min-h-[24px] grid-cols-[28px,1fr,28px] items-center">
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

        <img src="/assets/appiconfg.png" alt={t("app.title")} className="mx-auto -my-4 w-[200px]" />

        <p className="-mt-2 text-center text-[13px] text-[#D4E3F7]">{t("paywall.choosePlan")}</p>

        {message ? (
          <div className="rounded-[18px] border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</div>
        ) : null}

        <section className="space-y-3">
          {isLoading ? (
            <div className="rounded-[22px] bg-[#F4F9FF] p-4 text-sm text-[#0B1320]">{t("paywall.loadingPlans")}</div>
          ) : null}

          {plans.map((plan, index) => {
            const highlighted = index === plans.length - 1;

            return (
              <button
                key={plan.id}
                type="button"
                className={`w-full rounded-[22px] border p-[18px] text-left ${
                  highlighted
                    ? "border-[#4C8FF1] bg-[#0F5BD7] text-white"
                    : "border-[#B9D8FF] bg-[#F4F9FF] text-[#111827]"
                }`}
                onClick={() => {
                  const returnTo =
                    typeof router.query.returnTo === "string" ? router.query.returnTo : "/map";
                  setReturnTo(returnTo);
                  router.push(`/payment?planId=${plan.id}`);
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

      </div>
    </main>
  );
}

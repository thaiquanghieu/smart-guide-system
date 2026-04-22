import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import apiClient from "@/lib/api";
import { ensureDeviceReady, setReturnTo } from "@/lib/device";

type Plan = {
  id: number;
  name: string;
  days: number;
  price: number;
};

export default function PaywallPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await ensureDeviceReady();
        const response = await apiClient.get("/plans");
        setPlans(response.data || []);
      } catch (error: any) {
        setMessage(error?.response?.data?.message || "Khong tai duoc goi.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#041B2D] px-5 pb-10 text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}>
      <Head>
        <meta name="theme-color" content="#041B2D" />
      </Head>
      <div className="mx-auto max-w-[540px] space-y-[14px]">
        <div className="h-[18px]" />

        <img src="/assets/appiconfg.png" alt="Smart Guide" className="mx-auto -my-8 w-[220px]" />

        <p className="-mt-2 text-center text-[13px] text-[#D4E3F7]">Vui lòng chọn gói phù hợp</p>

        {message ? (
          <div className="rounded-[18px] border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</div>
        ) : null}

        <section className="space-y-3">
          {isLoading ? (
            <div className="rounded-[22px] bg-[#F4F9FF] p-4 text-sm text-[#0B1320]">Đang tải danh sách gói...</div>
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
                    <p className="text-[18px] font-bold">{plan.name}</p>
                    <p className={`mt-1 text-[13px] ${highlighted ? "text-[#D6E8FF]" : "text-[#6B7280]"}`}>
                      {plan.id === 1
                        ? "1 ngày trải nghiệm thử"
                        : plan.id === 2
                          ? "7 ngày trải nghiệm đầy đủ"
                          : plan.id === 3
                            ? "30 ngày không giới hạn"
                            : "365 ngày • Tiết kiệm hơn 40%"}
                    </p>
                  </div>
                  <div className={`text-[18px] font-bold ${highlighted ? "text-white" : "text-[#0F5BD7]"}`}>
                    {plan.price.toLocaleString("vi-VN")} đ
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <div className="mt-4 flex flex-col items-center gap-[10px]">
          <button
            type="button"
            className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[#0F5BD7] shadow-[0_8px_18px_rgba(15,91,215,0.3)]"
          >
            <img src="/assets/qr.png" alt="QR" className="h-[34px] w-[34px]" />
          </button>
          <p className="text-[14px] font-bold">Quét QR để nhận ưu đãi</p>
          <p className="text-[13px] text-[#CFE3FF] underline">Xem hướng dẫn</p>
        </div>
      </div>
    </main>
  );
}

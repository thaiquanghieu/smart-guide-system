import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import apiClient from "@/lib/api";
import { getPlanName, useAppI18n } from "@/lib/i18n";
import {
  clearEntryContext,
  clearPendingPoiId,
  clearReturnTo,
  ensureDeviceReady,
  getDeviceId,
  getPendingPoiId,
  getReturnTo,
} from "@/lib/device";

type PaymentPreview = {
  code: string;
  plan: {
    id: number;
    name: string;
    days: number;
    price: number;
  };
};

export default function PaymentPage() {
  const router = useRouter();
  const { lang, t } = useAppI18n();
  const [payment, setPayment] = useState<PaymentPreview | null>(null);
  const [message, setMessage] = useState(t("common.loading"));
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const load = async () => {
      try {
        await ensureDeviceReady();
        const planId = Number(router.query.planId || 0);
        const response = await apiClient.post(
          `/payments/create?deviceId=${getDeviceId()}&planId=${planId}`
        );
        setPayment(response.data);
        setMessage("");
      } catch (error: any) {
        setMessage(error?.response?.data?.message || t("payment.createError"));
      }
    };

    load();
  }, [router, t]);

  const qrUrl =
    payment == null
      ? ""
      : `https://img.vietqr.io/image/TCB-4001012005-compact2.png?amount=${payment.plan.price}&addInfo=${payment.code}&accountName=THAI%20QUANG%20HIEU`;

  return (
    <main className="min-h-screen bg-[#041B2D] px-5 pb-8 text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 20px)" }}>
      <Head>
        <meta name="theme-color" content="#041B2D" />
      </Head>
      <div className="mx-auto max-w-[540px] space-y-4">
        <div className="grid grid-cols-[24px,1fr,24px] items-center">
          <button type="button" className="text-[26px]" onClick={() => router.back()}>
            ←
          </button>
          <h1 className="text-center text-[22px] font-bold">{t("payment.title")}</h1>
          <div />
        </div>

        {payment ? (
          <>
            <div className="rounded-[20px] border border-[#B9D8FF] bg-[#F4F9FF] p-4 text-[#111827]">
              <div className="grid grid-cols-[1fr,auto] gap-3">
                <div>
                  <p className="text-[18px] font-bold">{getPlanName(payment.plan.id, lang)}</p>
                  <p className="text-[12px] text-[#6B7280]">/{payment.plan.days} ngày</p>
                </div>
                <p className="text-[18px] font-bold text-[#0F5BD7]">{payment.plan.price.toLocaleString("vi-VN")} đ</p>
              </div>
            </div>

            <div className="rounded-[16px] bg-white p-4">
              <div className="mx-auto aspect-square w-[220px] max-w-full">
                <img src={qrUrl} alt="QR thanh toán" className="h-full w-full object-contain" />
              </div>
            </div>

            <p className="text-center text-[#CFE3FF]">{t("payment.manualTransfer")}</p>

            <div className="rounded-[16px] bg-[#F4F9FF] p-4 text-[#111827]">
              <div className="space-y-2">
                <p>Techcombank</p>
                <p>4001012005</p>
                <p>THAI QUANG HIEU</p>
                <p className="font-bold">{t("payment.transferContent")}</p>
                <p className="font-bold text-[#0F5BD7]">{payment.code}</p>
              </div>
            </div>

            {message ? <p className="text-center text-sm text-[#CFE3FF]">{message}</p> : null}

            <button
              type="button"
              disabled={isConfirming}
              className="h-[50px] w-full rounded-[16px] bg-[#0F5BD7] text-white disabled:opacity-60"
              onClick={async () => {
                try {
                  setIsConfirming(true);
                  await apiClient.post(
                    `/payments/scan?code=${encodeURIComponent(payment.code)}&deviceId=${getDeviceId()}`
                  );
                  setShowSuccess(true);
                  await new Promise((resolve) => setTimeout(resolve, 900));
                  const pendingPoiId = getPendingPoiId();
                  const returnTo = getReturnTo();
                  clearReturnTo();
                  clearPendingPoiId();
                  clearEntryContext();
                  router.replace(pendingPoiId ? `/map?poiId=${pendingPoiId}` : returnTo || "/map");
                } catch (error: any) {
                  setMessage(error?.response?.data?.message || t("payment.confirmError"));
                } finally {
                  setIsConfirming(false);
                }
              }}
            >
              {isConfirming ? t("payment.confirming") : t("payment.confirm")}
            </button>
          </>
        ) : (
          <p>{message}</p>
        )}
      </div>

      {showSuccess ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-5">
          <div className="w-full max-w-[320px] overflow-hidden rounded-[18px] bg-white text-center text-[#111827]">
            <div className="px-5 pb-4 pt-5">
              <h3 className="text-[18px] font-bold">{t("payment.success")}</h3>
              <p className="mt-2 text-[15px]">{t("payment.successMessage")}</p>
            </div>
            <button
              type="button"
              className="w-full border-t border-[#E5E7EB] py-3 text-[18px] font-bold text-[#0F5BD7]"
              onClick={() => setShowSuccess(false)}
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

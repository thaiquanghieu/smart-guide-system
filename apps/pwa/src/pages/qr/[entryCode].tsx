import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api";
import { ensureDeviceReady, getDeviceId, saveEntryContext, setPendingPoiId, setReturnTo, setTrackingEnabled, setTrackingTargetPoiId } from "@/lib/device";
import { useAppI18n } from "@/lib/i18n";

function EntryQrPageInner() {
  const router = useRouter();
  const { t } = useAppI18n();
  const [message, setMessage] = useState("Đang xử lý mã QR...");
  const [detail, setDetail] = useState("Hệ thống đang kiểm tra quyền truy cập và mở đúng điểm tham quan.");

  useEffect(() => {
    setMessage(t("qr.processing"));
    setDetail(t("qr.detail"));
  }, [t]);

  useEffect(() => {
    if (!router.isReady) return;

    const run = async () => {
      try {
        await ensureDeviceReady();

        const entryCode = String(router.query.entryCode || "");
        const poiId = typeof router.query.poiId === "string" ? router.query.poiId : "";

        if (!entryCode) {
          throw new Error("Mã QR không hợp lệ.");
        }

        saveEntryContext({ entryCode, poiId: poiId || null });

        if (poiId) {
          setPendingPoiId(poiId);
          setTrackingTargetPoiId(poiId);
          setReturnTo(`/map?poiId=${encodeURIComponent(poiId)}`);
        } else {
          setReturnTo("/map");
        }

        const response = await apiClient.post("/access/entry", {
          deviceId: getDeviceId(),
          entryCode,
          poiId: poiId || null,
        });

        const targetPoiId = response.data?.poiId || poiId;
        if (targetPoiId) {
          setTrackingTargetPoiId(targetPoiId);
        }
        setTrackingEnabled(true);
        const target = targetPoiId ? `/map?poiId=${encodeURIComponent(targetPoiId)}` : "/map";
        router.replace(target);
      } catch (error: any) {
        setMessage(error?.response?.data?.message || error?.message || t("qr.error"));
        setDetail(t("qr.retry"));
      }
    };

    run();
  }, [router, t]);

  return (
    <main
      className="app-shell flex items-center justify-center"
      style={{ minHeight: "100vh", background: "#f4f7fb" }}
    >
      <div
        className="w-full rounded-[30px] p-6 text-center"
        style={{
          background: "#ffffff",
          border: "1px solid #dfe6f0",
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{ background: "rgba(14, 91, 215, 0.12)", color: "#0F5BD7" }}
        >
          QR
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">{message}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
      </div>
    </main>
  );
}

export default dynamic(() => Promise.resolve(EntryQrPageInner), {
  ssr: false,
  loading: () => (
    <main
      className="app-shell flex items-center justify-center"
      style={{ minHeight: "100vh", background: "#f4f7fb" }}
    >
      <div
        className="w-full rounded-[30px] p-6 text-center"
        style={{
          background: "#ffffff",
          border: "1px solid #dfe6f0",
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{ background: "rgba(14, 91, 215, 0.12)", color: "#0F5BD7" }}
        >
          QR
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">Đang xử lý mã QR...</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Hệ thống đang kiểm tra quyền truy cập và mở đúng điểm tham quan.
        </p>
      </div>
    </main>
  ),
});

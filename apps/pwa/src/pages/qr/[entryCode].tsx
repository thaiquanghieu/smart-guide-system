import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AppLoadingScreen from "@/components/AppLoadingScreen";
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
          setPendingPoiId(targetPoiId);
          setTrackingTargetPoiId(targetPoiId);
        }
        setTrackingEnabled(false);
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
    <AppLoadingScreen message={message} detail={detail} />
  );
}

export default dynamic(() => Promise.resolve(EntryQrPageInner), {
  ssr: false,
  loading: () => (
    <AppLoadingScreen
      message="Đang xử lý mã QR..."
      detail="Hệ thống đang kiểm tra quyền truy cập và mở đúng điểm tham quan."
    />
  ),
});

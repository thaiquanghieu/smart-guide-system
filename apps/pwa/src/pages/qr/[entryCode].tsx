import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api";
import { ensureDeviceReady, getDeviceId, saveEntryContext, setPendingPoiId, setReturnTo } from "@/lib/device";

export default function EntryQrPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Dang xu ly ma QR...");
  const [detail, setDetail] = useState("He thong dang kiem tra quyen truy cap va mo dung diem tham quan.");

  useEffect(() => {
    if (!router.isReady) return;

    const run = async () => {
      try {
        await ensureDeviceReady();

        const entryCode = String(router.query.entryCode || "");
        const poiId = typeof router.query.poiId === "string" ? router.query.poiId : "";

        saveEntryContext({ entryCode, poiId: poiId || null });

        if (poiId) {
          setPendingPoiId(poiId);
          setReturnTo(`/map?poiId=${encodeURIComponent(poiId)}`);
        } else {
          setReturnTo("/map");
        }

        const response = await apiClient.post("/access/entry", {
          deviceId: getDeviceId(),
          entryCode,
          poiId: poiId || null,
        });

        const targetPoiId = response.data.poiId || poiId;
        const target = targetPoiId ? `/map?poiId=${encodeURIComponent(targetPoiId)}` : "/map";
        router.replace(target);
      } catch (error: any) {
        setMessage(error?.response?.data?.message || "Khong the xu ly ma QR.");
        setDetail("Vui long thu quet lai ma hoac kiem tra ket noi internet.");
      }
    };

    run();
  }, [router]);

  return (
    <main className="app-shell flex items-center justify-center">
      <div className="glass-card w-full rounded-[30px] p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 text-3xl">
          QR
        </div>
        <h1 className="mt-5 text-xl font-semibold">{message}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
      </div>
    </main>
  );
}

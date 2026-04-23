import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import "@/styles/globals.css";
import {
  DEVICE_BLOCKED_EVENT,
  DEVICE_REMOVED_EVENT,
  DEVICE_RESTORED_EVENT,
  ensureDeviceReady,
  notifyDeviceBlocked,
  sendDeviceHeartbeat,
  type DeviceBlockedDetail,
} from "@/lib/device";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [deviceBlocked, setDeviceBlocked] = useState<DeviceBlockedDetail | null>(null);
  const deviceBlockedRef = useRef<DeviceBlockedDetail | null>(null);

  useEffect(() => {
    setMounted(true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
    }

    if ("caches" in window) {
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let heartbeatTimer: number | undefined;

    const startHeartbeat = async () => {
      await ensureDeviceReady().catch((error: any) => {
        const status = error?.response?.status;
        if (status === 403 || status === 410) {
          notifyDeviceBlocked({
            status,
            message: error?.response?.data?.message || "Thiết bị này đã bị khóa bởi hệ thống.",
            reason: error?.response?.data?.reason || error?.response?.data?.detail,
          });
        }
      });
      await sendDeviceHeartbeat();
      heartbeatTimer = window.setInterval(() => {
        void sendDeviceHeartbeat();
      }, 2500);
    };

    void startHeartbeat();

    return () => {
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    };
  }, []);

  useEffect(() => {
    deviceBlockedRef.current = deviceBlocked;
  }, [deviceBlocked]);

  useEffect(() => {
    const handleBlocked = (event: Event) => {
      const detail = (event as CustomEvent<DeviceBlockedDetail>).detail;
      setDeviceBlocked(detail);
    };
    const handleRestored = () => {
      if (!deviceBlockedRef.current) return;
      setDeviceBlocked(null);
      router.replace("/paywall");
    };
    const handleRemoved = () => {
      setDeviceBlocked(null);
      router.replace("/paywall");
    };

    window.addEventListener(DEVICE_BLOCKED_EVENT, handleBlocked);
    window.addEventListener(DEVICE_RESTORED_EVENT, handleRestored);
    window.addEventListener(DEVICE_REMOVED_EVENT, handleRemoved);
    return () => {
      window.removeEventListener(DEVICE_BLOCKED_EVENT, handleBlocked);
      window.removeEventListener(DEVICE_RESTORED_EVENT, handleRestored);
      window.removeEventListener(DEVICE_REMOVED_EVENT, handleRemoved);
    };
  }, [router]);

  return (
    <>
      <Head>
        <title>Smart Guide</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f4f7fb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Smart Guide" />
        <meta name="application-name" content="Smart Guide" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
      </Head>
      <Component {...pageProps} />
      {deviceBlocked ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500">
              !
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Thiết bị bị khóa</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{deviceBlocked.message}</p>
            {deviceBlocked.reason ? (
              <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                Lý do: {deviceBlocked.reason}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-slate-400">
              Mọi thao tác trên app đã được tạm khóa. Vui lòng liên hệ hỗ trợ nếu cần mở lại.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

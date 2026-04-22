import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useState } from "react";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

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
      {mounted ? <Component {...pageProps} /> : <div className="min-h-screen bg-[#F4F7FB]" />}
    </>
  );
}

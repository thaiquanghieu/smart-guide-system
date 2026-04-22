import { useEffect, useMemo, useRef, useState } from "react";
import { createEmbedMapUrl } from "@/lib/location";

type GeoPoint = {
  latitude: number;
  longitude: number;
};

type PoiLite = {
  id: string;
  latitude: number;
  longitude: number;
};

type MapSurfaceProps = {
  center: GeoPoint;
  pois?: PoiLite[];
  selectedPoiId?: string;
  userLocation?: GeoPoint | null;
  heightClassName?: string;
  onSelectPoi?: (poiId: string) => void;
  onMapTap?: () => void;
};

declare global {
  interface Window {
    L: any;
  }
}

export default function MapSurface({
  center,
  pois = [],
  selectedPoiId,
  userLocation,
  heightClassName = "h-full",
  onSelectPoi,
  onMapTap,
}: MapSurfaceProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [useFallbackMap, setUseFallbackMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeout = 0;
    const ready = () => {
      if (cancelled) return;
      if (typeof window !== "undefined" && window.L?.map) {
        setLeafletReady(true);
        setUseFallbackMap(false);
      }
    };

    if (typeof window !== "undefined" && window.L?.map) {
      ready();
      return undefined;
    }

    const scriptId = "smartguide-leaflet-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const handleLoad = () => ready();
    const handleError = () => {
      if (!cancelled) {
        setUseFallbackMap(true);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.crossOrigin = "";
      document.body.appendChild(script);
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    timeout = window.setTimeout(() => {
      if (!leafletReady && !window.L?.map) {
        setUseFallbackMap(true);
      }
    }, 2200);

    ready();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, [leafletReady]);

  useEffect(() => {
    let cancelled = false;
    const map = leafletMapRef.current;
    if (!leafletReady || !map) return undefined;

    const handleMapTap = () => {
      if (!cancelled) {
        onMapTap?.();
      }
    };

    map.on("click", handleMapTap);

    return () => {
      cancelled = true;
      map.off("click", handleMapTap);
    };
  }, [leafletReady, onMapTap]);

  const fallbackUrl = useMemo(() => {
    return createEmbedMapUrl(center, selectedPoiId && pois.length
      ? { latitude: pois.find((poi) => poi.id === selectedPoiId)?.latitude || center.latitude, longitude: pois.find((poi) => poi.id === selectedPoiId)?.longitude || center.longitude }
      : undefined);
  }, [center, pois, selectedPoiId]);

  useEffect(() => {
    // Don't try to create the map until Leaflet is loaded and we don't already have a map
    if (!leafletReady) return undefined;
    if (!mapRef.current) return undefined;
    if (leafletMapRef.current) return undefined;

    const map = window.L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([center.latitude, center.longitude], 15);

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    leafletMapRef.current = map;
    map.whenReady(() => setMapLoaded(true));

    setTimeout(() => {
      map.invalidateSize();
    }, 80);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [leafletReady, center.latitude, center.longitude]);

  useEffect(() => {
    if (!leafletReady) return;

    const map = leafletMapRef.current;
    if (!map) return;
    map.setView([center.latitude, center.longitude], map.getZoom() || 15, { animate: true });
  }, [leafletReady, center.latitude, center.longitude]);

  useEffect(() => {
    if (!leafletReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const map = leafletMapRef.current;
    if (!map) return;

    pois.forEach((poi) => {
      const isActive = poi.id === selectedPoiId;
      const icon = window.L.divIcon({
        className: "",
        html: `<div class="${isActive ? "poi-marker-active" : "poi-marker"}"></div>`,
        iconSize: isActive ? [28, 28] : [16, 16],
        iconAnchor: isActive ? [14, 26] : [8, 14],
      });

      const marker = window.L.marker([poi.latitude, poi.longitude], { icon }).addTo(map);
      marker.on("click", (event: any) => {
        if (window.L?.DomEvent) {
          window.L.DomEvent.stopPropagation(event);
        }
        onSelectPoi?.(poi.id);
      });
      markersRef.current.push(marker);
    });
  }, [leafletReady, onSelectPoi, pois, selectedPoiId]);

  useEffect(() => {
    if (!leafletReady || !selectedPoiId) return;

    const map = leafletMapRef.current;
    const selectedPoi = pois.find((poi) => poi.id === selectedPoiId);
    if (!map || !selectedPoi) return;

    map.flyTo([selectedPoi.latitude, selectedPoi.longitude], Math.max(map.getZoom() || 15, 17), {
      animate: true,
      duration: 0.55,
    });
  }, [leafletReady, pois, selectedPoiId]);

  useEffect(() => {
    if (!leafletReady || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const map = leafletMapRef.current;
    if (!map) return;

    const icon = window.L.divIcon({
      className: "",
      html: `<div class="user-marker"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    userMarkerRef.current = window.L.marker([userLocation.latitude, userLocation.longitude], { icon }).addTo(map);
  }, [leafletReady, userLocation]);

  if (useFallbackMap) {
    return (
      <iframe
        src={fallbackUrl}
        className={`w-full border-0 ${heightClassName}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setMapLoaded(true)}
      />
    );
  }

  return (
    <div className={`relative z-0 w-full overflow-hidden ${heightClassName}`}>
      {!mapLoaded ? <div className="absolute inset-0 z-10 bg-[#EAF0F8]" /> : null}
      <div ref={mapRef} className={`relative z-0 w-full ${heightClassName} ${mapLoaded ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

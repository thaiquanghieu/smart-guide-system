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
};

declare global {
  interface Window {
    L: any;
    mapboxgl: any;
  }
}

export default function MapSurface({
  center,
  pois = [],
  selectedPoiId,
  userLocation,
  heightClassName = "h-full",
  onSelectPoi,
}: MapSurfaceProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const mapboxMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [useFallbackMap, setUseFallbackMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const useMapbox = !!mapboxToken;

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!leafletReady) {
        setUseFallbackMap(true);
      }
    }, 1400);

    const waitForLeaflet = () => {
      if (cancelled) return;

      if (typeof window !== "undefined" && ((useMapbox && window.mapboxgl) || (!useMapbox && window.L))) {
        setLeafletReady(true);
        setUseFallbackMap(false);
        return;
      }

      frame = window.requestAnimationFrame(waitForLeaflet);
    };

    waitForLeaflet();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [leafletReady, useMapbox]);

  const fallbackUrl = useMemo(() => {
    return createEmbedMapUrl(center, selectedPoiId && pois.length
      ? { latitude: pois.find((poi) => poi.id === selectedPoiId)?.latitude || center.latitude, longitude: pois.find((poi) => poi.id === selectedPoiId)?.longitude || center.longitude }
      : undefined);
  }, [center, pois, selectedPoiId]);

  useEffect(() => {
    if (!leafletReady || !mapRef.current) return undefined;

    if (useMapbox) {
      if (mapboxMapRef.current) return undefined;

      window.mapboxgl.accessToken = mapboxToken;
      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [center.longitude, center.latitude],
        zoom: 15,
        attributionControl: false,
      });

      mapboxMapRef.current = map;
      map.on("load", () => setMapLoaded(true));

      setTimeout(() => {
        map.resize();
      }, 80);

      return () => {
        map.remove();
        mapboxMapRef.current = null;
      };
    }

    if (leafletMapRef.current) return undefined;

    const map = window.L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([center.latitude, center.longitude], 15);

    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      subdomains: "abcd",
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
  }, [leafletReady, center.latitude, center.longitude, mapboxToken, useMapbox]);

  useEffect(() => {
    if (!leafletReady) return;

    if (useMapbox) {
      const map = mapboxMapRef.current;
      if (!map) return;
      map.easeTo({
        center: [center.longitude, center.latitude],
        duration: 600,
      });
      return;
    }

    const map = leafletMapRef.current;
    if (!map) return;
    map.setView([center.latitude, center.longitude], map.getZoom() || 15, { animate: true });
  }, [leafletReady, center.latitude, center.longitude, useMapbox]);

  useEffect(() => {
    if (!leafletReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (useMapbox) {
      const map = mapboxMapRef.current;
      if (!map) return;

      pois.forEach((poi) => {
        const isActive = poi.id === selectedPoiId;
        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.className = isActive ? "poi-marker-active" : "poi-marker";
        markerElement.addEventListener("click", () => onSelectPoi?.(poi.id));

        const marker = new window.mapboxgl.Marker({
          element: markerElement,
          anchor: "bottom",
        })
          .setLngLat([poi.longitude, poi.latitude])
          .addTo(map);

        markersRef.current.push(marker);
      });

      return;
    }

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
      marker.on("click", () => onSelectPoi?.(poi.id));
      markersRef.current.push(marker);
    });
  }, [leafletReady, onSelectPoi, pois, selectedPoiId, useMapbox]);

  useEffect(() => {
    if (!leafletReady || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    if (useMapbox) {
      const map = mapboxMapRef.current;
      if (!map) return;

      const markerElement = document.createElement("div");
      markerElement.className = "user-marker";
      userMarkerRef.current = new window.mapboxgl.Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);

      return;
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
  }, [leafletReady, userLocation, useMapbox]);

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
    <div className={`relative w-full ${heightClassName}`}>
      {!mapLoaded ? <div className="absolute inset-0 z-10 bg-[#EAF0F8]" /> : null}
      <div ref={mapRef} className={`w-full ${heightClassName} ${mapLoaded ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

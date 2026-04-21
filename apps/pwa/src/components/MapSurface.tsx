import { useEffect, useRef } from "react";

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
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !window.L || leafletMapRef.current) return undefined;

    const map = window.L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([center.latitude, center.longitude], 15);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !window.L) return;

    map.setView([center.latitude, center.longitude], map.getZoom() || 15, { animate: true });
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !window.L) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

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
  }, [onSelectPoi, pois, selectedPoiId]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !window.L || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const icon = window.L.divIcon({
      className: "",
      html: `<div class="user-marker"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    userMarkerRef.current = window.L.marker([userLocation.latitude, userLocation.longitude], { icon }).addTo(map);
  }, [userLocation]);

  return <div ref={mapRef} className={`w-full ${heightClassName}`} />;
}

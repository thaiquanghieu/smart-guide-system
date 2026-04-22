export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function calculateDistanceKm(from: GeoPoint, to: GeoPoint) {
  const earthRadius = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function createEmbedMapUrl(point: GeoPoint, marker?: GeoPoint) {
  const delta = 0.005;
  const left = point.longitude - delta;
  const right = point.longitude + delta;
  const top = point.latitude + delta;
  const bottom = point.latitude - delta;
  const markerParam = marker ? `&marker=${marker.latitude},${marker.longitude}` : "";

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik${markerParam}`;
}

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

const routeCache = new Map<string, GeoPoint[]>();

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

export async function fetchRoadRoute(points: GeoPoint[]) {
  if (points.length < 2) return [];

  const cacheKey = points
    .map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
    .join("|");

  const cachedRoute = routeCache.get(cacheKey);
  if (cachedRoute) {
    return cachedRoute;
  }

  const coordinates = points
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`
  );

  if (!response.ok) {
    throw new Error(`Route service failed with status ${response.status}`);
  }

  const data = await response.json();
  const routeCoordinates = data?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(routeCoordinates)) {
    return [];
  }

  const normalizedRoute = routeCoordinates
    .filter((item: unknown) => Array.isArray(item) && item.length >= 2)
    .map((item: any) => ({
      latitude: Number(item[1]),
      longitude: Number(item[0]),
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  const simplifiedRoute = simplifyRoutePath(normalizedRoute);
  routeCache.set(cacheKey, simplifiedRoute);
  return simplifiedRoute;
}

export function measureRouteDistanceKm(points: GeoPoint[]) {
  if (points.length < 2) return 0;

  let totalKm = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalKm += calculateDistanceKm(points[index - 1], points[index]);
  }
  return totalKm;
}

export function estimateWalkingMinutes(distanceKm: number) {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / 4.5) * 60));
}

function simplifyRoutePath(points: GeoPoint[]) {
  if (points.length <= 80) return points;

  const toleranceMeters =
    points.length > 1200 ? 18 :
    points.length > 700 ? 12 :
    points.length > 300 ? 8 :
    5;

  return douglasPeucker(points, toleranceMeters / 111_320);
}

function douglasPeucker(points: GeoPoint[], toleranceDegrees: number) {
  if (points.length <= 2) return points;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  let maxDistance = 0;
  let maxIndex = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxDistance <= toleranceDegrees) {
    return [firstPoint, lastPoint];
  }

  const left = douglasPeucker(points.slice(0, maxIndex + 1), toleranceDegrees);
  const right = douglasPeucker(points.slice(maxIndex), toleranceDegrees);
  return [...left.slice(0, -1), ...right];
}

function perpendicularDistance(point: GeoPoint, lineStart: GeoPoint, lineEnd: GeoPoint) {
  const startX = lineStart.longitude;
  const startY = lineStart.latitude;
  const endX = lineEnd.longitude;
  const endY = lineEnd.latitude;
  const pointX = point.longitude;
  const pointY = point.latitude;

  const deltaX = endX - startX;
  const deltaY = endY - startY;

  if (deltaX === 0 && deltaY === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const numerator = Math.abs(deltaY * pointX - deltaX * pointY + endX * startY - endY * startX);
  const denominator = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  return numerator / denominator;
}

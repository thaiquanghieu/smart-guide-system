import { calculateDistanceKm, type GeoPoint } from "./location";

export type QueuePoi = {
  id: string;
  latitude: number;
  longitude: number;
  radius?: number;
  priority?: number;
  listened_count?: number;
  sort_order?: number;
};

export type QueueCandidate<T extends QueuePoi = QueuePoi> = T & {
  distanceKm: number;
  radiusKm: number;
  targetMatch: boolean;
  cooldownBlocked: boolean;
  cooldownRemainingMs: number;
  priorityValue: number;
  listenedCount: number;
  sortOrderValue: number | null;
};

export type CandidateState = {
  poiId: string;
  hits: number;
};

export type CandidateSelectionResult<T extends QueuePoi = QueuePoi> = {
  rankedCandidates: Array<QueueCandidate<T>>;
  selectedCandidate: QueueCandidate<T> | null;
  rejectedCandidates: Array<QueueCandidate<T>>;
  decisionReason: string;
};

export type TrackingTickResult<T extends QueuePoi = QueuePoi> = CandidateSelectionResult<T> & {
  nextCandidateState: CandidateState;
  shouldAutoPlay: boolean;
  autoPlayReason: string;
};

const DEFAULT_POI_COOLDOWN_MS = 4 * 60 * 1000;

export function normalizePoiRadiusKm(poi: QueuePoi) {
  return Math.max(0.01, Number(poi.radius || 100) / 1000);
}

export function rankTrackingCandidates<T extends QueuePoi>(options: {
  pois: T[];
  currentLocation: GeoPoint;
  nowMs: number;
  targetPoiId?: string;
  lastPlayedAtByPoiId?: Record<string, number>;
  poiCooldownMs?: number;
}) {
  const {
    pois,
    currentLocation,
    nowMs,
    targetPoiId = "",
    lastPlayedAtByPoiId = {},
    poiCooldownMs = DEFAULT_POI_COOLDOWN_MS,
  } = options;

  const evaluatedCandidates = pois.map((poi) => {
    const distanceKm = calculateDistanceKm(currentLocation, {
      latitude: poi.latitude,
      longitude: poi.longitude,
    });
    const radiusKm = normalizePoiRadiusKm(poi);
    const lastPlayedAt = lastPlayedAtByPoiId[poi.id];
    const cooldownRemainingMs =
      typeof lastPlayedAt === "number"
        ? Math.max(0, lastPlayedAt + poiCooldownMs - nowMs)
        : 0;

    return {
      ...poi,
      distanceKm,
      radiusKm,
      targetMatch: !!targetPoiId && poi.id === targetPoiId,
      cooldownBlocked: cooldownRemainingMs > 0,
      cooldownRemainingMs,
      priorityValue: Number(poi.priority || 0),
      listenedCount: Number(poi.listened_count || 0),
      sortOrderValue: Number.isFinite(Number(poi.sort_order)) ? Number(poi.sort_order) : null,
    } satisfies QueueCandidate<T>;
  });

  const rankedCandidates = evaluatedCandidates
    .filter((candidate) => candidate.distanceKm <= candidate.radiusKm && !candidate.cooldownBlocked)
    .sort(compareCandidates);

  const rejectedCandidates = evaluatedCandidates.filter(
    (candidate) => candidate.distanceKm > candidate.radiusKm || candidate.cooldownBlocked
  );

  return { rankedCandidates, rejectedCandidates };
}

export function selectTrackingCandidate<T extends QueuePoi>(options: {
  pois: T[];
  currentLocation: GeoPoint;
  nowMs: number;
  targetPoiId?: string;
  lastPlayedAtByPoiId?: Record<string, number>;
  poiCooldownMs?: number;
}): CandidateSelectionResult<T> {
  const { rankedCandidates, rejectedCandidates } = rankTrackingCandidates(options);
  const selectedCandidate = rankedCandidates[0] || null;

  return {
    rankedCandidates,
    selectedCandidate,
    rejectedCandidates,
    decisionReason: getDecisionReason(rankedCandidates),
  };
}

export function updateCandidateState(previous: CandidateState, selectedCandidateId: string | null) {
  if (!selectedCandidateId) {
    return { poiId: "", hits: 0 };
  }

  if (previous.poiId === selectedCandidateId) {
    return { poiId: selectedCandidateId, hits: previous.hits + 1 };
  }

  return { poiId: selectedCandidateId, hits: 1 };
}

export function resolveTrackingTick<T extends QueuePoi>(options: {
  pois: T[];
  currentLocation: GeoPoint;
  nowMs: number;
  targetPoiId?: string;
  lastPlayedAtByPoiId?: Record<string, number>;
  previousCandidateState: CandidateState;
  requiredStableHits: number;
  activePlayingPoiId?: string;
  poiCooldownMs?: number;
}): TrackingTickResult<T> {
  const selection = selectTrackingCandidate(options);
  const nextCandidateState = updateCandidateState(
    options.previousCandidateState,
    selection.selectedCandidate?.id || null
  );

  if (!selection.selectedCandidate) {
    return {
      ...selection,
      nextCandidateState,
      shouldAutoPlay: false,
      autoPlayReason: "no_candidate_in_range",
    };
  }

  if (options.activePlayingPoiId) {
    return {
      ...selection,
      nextCandidateState,
      shouldAutoPlay: false,
      autoPlayReason: "already_playing",
    };
  }

  if (nextCandidateState.hits < options.requiredStableHits) {
    return {
      ...selection,
      nextCandidateState,
      shouldAutoPlay: false,
      autoPlayReason: "not_stable_yet",
    };
  }

  return {
    ...selection,
    nextCandidateState,
    shouldAutoPlay: true,
    autoPlayReason: "stable_hit_reached",
  };
}

function compareCandidates<T extends QueuePoi>(left: QueueCandidate<T>, right: QueueCandidate<T>) {
  if (left.targetMatch !== right.targetMatch) {
    return left.targetMatch ? -1 : 1;
  }

  const priorityDiff = right.priorityValue - left.priorityValue;
  if (priorityDiff !== 0) return priorityDiff;

  const distanceDiff = left.distanceKm - right.distanceKm;
  if (Math.abs(distanceDiff) > 0.001) return distanceDiff;

  const listenedDiff = left.listenedCount - right.listenedCount;
  if (listenedDiff !== 0) return listenedDiff;

  return left.id.localeCompare(right.id);
}

function getDecisionReason<T extends QueuePoi>(rankedCandidates: Array<QueueCandidate<T>>) {
  if (!rankedCandidates.length) return "no_candidate_in_range";
  if (rankedCandidates.length === 1) return "single_candidate_in_range";

  const winner = rankedCandidates[0];
  const runnerUp = rankedCandidates[1];

  if (winner.targetMatch !== runnerUp.targetMatch) {
    return "target_poi";
  }

  if (winner.priorityValue !== runnerUp.priorityValue) {
    return "higher_priority";
  }

  if (Math.abs(winner.distanceKm - runnerUp.distanceKm) > 0.001) {
    return "closer_distance";
  }

  if (winner.listenedCount !== runnerUp.listenedCount) {
    return "lower_listened_count";
  }

  return "lexicographical_id";
}

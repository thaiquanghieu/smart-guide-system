import fs from "node:fs";
import path from "node:path";
import {
  resolveTrackingTick,
  type CandidateState,
  type QueuePoi,
  type QueueCandidate,
} from "./poiQueue";

type ScenarioPoint = {
  latitude: number;
  longitude: number;
  atMs: number;
};

type Scenario = {
  name: string;
  description: string;
  targetPoiId?: string;
  requiredStableHits: number;
  freePlaysRemaining: number;
  subscriptionActive: boolean;
  pois: Array<QueuePoi>;
  path: Array<ScenarioPoint>;
};

type TickLog = {
  scenario: string;
  tick: number;
  atMs: number;
  currentLocation: ScenarioPoint;
  targetPoiId: string;
  requiredStableHits: number;
  subscriptionActive: boolean;
  freePlaysRemaining: number;
  rankedCandidates: Array<ReturnType<typeof serializeCandidate>>;
  rejectedCandidates: Array<ReturnType<typeof serializeCandidate>>;
  selectedCandidateId: string | null;
  decisionReason: string;
  candidateState: CandidateState;
  shouldAutoPlay: boolean;
  autoPlayReason: string;
};

type ScenarioSummary = {
  type: "scenario_summary";
  scenario: string;
  ticks: number;
  autoPlayedPoiIds: string[];
  autoPlayCount: number;
  noCandidateTicks: number;
  cooldownBlockedCount: number;
  targetPoiWins: number;
  reasons: Record<string, number>;
};

const scenarios: Array<Scenario> = [
  {
    name: "single-poi-fast-autoplay",
    description: "Một POI duy nhất trong vùng sẽ được phát ngay khi mode fast chỉ cần 1 stable hit.",
    requiredStableHits: 1,
    freePlaysRemaining: 1,
    subscriptionActive: false,
    pois: [
      { id: "poi-gate", latitude: 10.7758, longitude: 106.7009, radius: 120, priority: 1, listened_count: 12 },
    ],
    path: [
      { latitude: 10.7751, longitude: 106.7001, atMs: 0 },
      { latitude: 10.7757, longitude: 106.7008, atMs: 2500 },
      { latitude: 10.7758, longitude: 106.7009, atMs: 5000 },
    ],
  },
  {
    name: "target-poi-wins-over-priority",
    description: "Khi có targetPoiId từ QR thì target được ưu tiên hơn cả POI có priority cao hơn.",
    targetPoiId: "poi-target",
    requiredStableHits: 2,
    freePlaysRemaining: 1,
    subscriptionActive: false,
    pois: [
      { id: "poi-regular", latitude: 10.7762, longitude: 106.7012, radius: 150, priority: 5, listened_count: 20 },
      { id: "poi-target", latitude: 10.7761, longitude: 106.7011, radius: 150, priority: 1, listened_count: 4 },
    ],
    path: [
      { latitude: 10.7760, longitude: 106.7010, atMs: 0 },
      { latitude: 10.77605, longitude: 106.70105, atMs: 5000 },
      { latitude: 10.7761, longitude: 106.7011, atMs: 10000 },
    ],
  },
  {
    name: "cooldown-blocks-replay",
    description: "POI vừa phát xong không được chọn lại trong cooldown 4 phút.",
    requiredStableHits: 1,
    freePlaysRemaining: 99,
    subscriptionActive: true,
    pois: [
      { id: "poi-cooldown", latitude: 10.777, longitude: 106.702, radius: 120, priority: 2, listened_count: 8 },
      { id: "poi-next", latitude: 10.7771, longitude: 106.7021, radius: 120, priority: 1, listened_count: 3 },
    ],
    path: [
      { latitude: 10.7770, longitude: 106.7020, atMs: 0 },
      { latitude: 10.7770, longitude: 106.7020, atMs: 2500 },
      { latitude: 10.77705, longitude: 106.70205, atMs: 5000 },
      { latitude: 10.77708, longitude: 106.70208, atMs: 7000 },
    ],
  },
];

function runScenario(scenario: Scenario) {
  const logs: Array<TickLog> = [];
  let candidateState: CandidateState = { poiId: "", hits: 0 };
  const lastPlayedAtByPoiId: Record<string, number> = {};
  let remainingFreePlays = scenario.freePlaysRemaining;

  scenario.path.forEach((point, index) => {
    const result = resolveTrackingTick({
      pois: scenario.pois,
      currentLocation: point,
      nowMs: point.atMs,
      targetPoiId: scenario.targetPoiId,
      lastPlayedAtByPoiId,
      previousCandidateState: candidateState,
      requiredStableHits: scenario.requiredStableHits,
      activePlayingPoiId: "",
    });

    candidateState = result.nextCandidateState;

    let shouldAutoPlay = result.shouldAutoPlay;
    let autoPlayReason = result.autoPlayReason;

    if (shouldAutoPlay && !scenario.subscriptionActive && remainingFreePlays <= 0) {
      shouldAutoPlay = false;
      autoPlayReason = "no_remaining_access";
    }

    if (shouldAutoPlay && result.selectedCandidate) {
      lastPlayedAtByPoiId[result.selectedCandidate.id] = point.atMs;
      if (!scenario.subscriptionActive) {
        remainingFreePlays = Math.max(0, remainingFreePlays - 1);
      }
    }

    logs.push({
      scenario: scenario.name,
      tick: index + 1,
      atMs: point.atMs,
      currentLocation: point,
      targetPoiId: scenario.targetPoiId || "",
      requiredStableHits: scenario.requiredStableHits,
      subscriptionActive: scenario.subscriptionActive,
      freePlaysRemaining: remainingFreePlays,
      rankedCandidates: result.rankedCandidates.map(serializeCandidate),
      rejectedCandidates: result.rejectedCandidates.map(serializeCandidate),
      selectedCandidateId: result.selectedCandidate?.id || null,
      decisionReason: result.decisionReason,
      candidateState,
      shouldAutoPlay,
      autoPlayReason,
    });
  });

  return logs;
}

function buildScenarioSummary(scenario: Scenario, logs: TickLog[]): ScenarioSummary {
  const autoPlayedPoiIds = logs
    .filter((entry) => entry.shouldAutoPlay && entry.selectedCandidateId)
    .map((entry) => entry.selectedCandidateId as string);

  const reasons = logs.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.decisionReason] = (accumulator[entry.decisionReason] || 0) + 1;
    return accumulator;
  }, {});

  const cooldownBlockedCount = logs.reduce((count, entry) => {
    return (
      count +
      entry.rejectedCandidates.filter((candidate) => candidate.cooldownBlocked).length
    );
  }, 0);

  return {
    type: "scenario_summary",
    scenario: scenario.name,
    ticks: logs.length,
    autoPlayedPoiIds,
    autoPlayCount: autoPlayedPoiIds.length,
    noCandidateTicks: logs.filter((entry) => !entry.selectedCandidateId).length,
    cooldownBlockedCount,
    targetPoiWins: logs.filter((entry) => entry.decisionReason === "target_poi").length,
    reasons,
  };
}

function serializeCandidate(candidate: QueueCandidate) {
  return {
    id: candidate.id,
    distanceKm: round(candidate.distanceKm),
    radiusKm: round(candidate.radiusKm),
    targetMatch: candidate.targetMatch,
    priority: candidate.priorityValue,
    listenedCount: candidate.listenedCount,
    sortOrder: candidate.sortOrderValue,
    cooldownBlocked: candidate.cooldownBlocked,
    cooldownRemainingMs: candidate.cooldownRemainingMs,
  };
}

function round(value: number) {
  return Number(value.toFixed(5));
}

function main() {
  const cwd = process.cwd();
  const logsDir = path.join(cwd, "logs");
  fs.mkdirSync(logsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(logsDir, `poi-queue-logrunner-${timestamp}.jsonl`);

  const allLines: string[] = [];

  scenarios.forEach((scenario) => {
    const header = {
      type: "scenario_start",
      scenario: scenario.name,
      description: scenario.description,
    };
    allLines.push(JSON.stringify(header));

    const tickLogs = runScenario(scenario);
    tickLogs.forEach((entry) => {
      allLines.push(JSON.stringify(entry));
    });
    allLines.push(JSON.stringify(buildScenarioSummary(scenario, tickLogs)));

    allLines.push(
      JSON.stringify({
        type: "scenario_end",
        scenario: scenario.name,
        ticks: tickLogs.length,
      })
    );
  });

  fs.writeFileSync(logPath, `${allLines.join("\n")}\n`, "utf8");
  process.stdout.write(`Log runner wrote ${logPath}\n`);
}

main();

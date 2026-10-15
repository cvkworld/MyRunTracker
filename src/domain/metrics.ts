import type { Analysis, Fix, Phase, PhaseStats, Workout } from './types';

// Conservative filters. Distances across missing GPS intervals are never invented.
export const MAX_ACCURACY_M = 35;
export const MAX_GAP_MS = 30_000;
const EARTH_RADIUS_M = 6_371_008.8;

export function distanceBetween(a: Fix, b: Fix): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad)
    * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function validFix(p: Fix): boolean {
  return Number.isFinite(p.timestamp) && p.timestamp > 0
    && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90
    && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
}

function emptyPhase(): PhaseStats {
  return { distanceM: 0, durationMs: 0, calories: 0, splits: [], partialDistanceM: 0, partialDurationMs: 0 };
}

export function analyze(workout: Workout | null, now = Date.now()): Analysis {
  const result: Analysis = {
    run: emptyPhase(), walk: emptyPhase(), activeMs: 0, wallMs: 0,
    liveSpeedMps: 0, routes: [], rejected: 0, gaps: 0, lastFix: null, lastGoodAt: null,
  };
  if (!workout) return result;
  const { session } = workout;
  const end = session.endedAt ?? now;
  result.wallMs = Math.max(0, end - session.startedAt);
  const bySegment = new Map<string, typeof workout.points>();
  for (const p of workout.points) {
    const group = bySegment.get(p.segmentId) ?? [];
    group.push(p);
    bySegment.set(p.segmentId, group);
    if (!result.lastFix || p.timestamp > result.lastFix.timestamp) result.lastFix = p;
  }
  const phaseLastSplitMs: Record<Phase, number> = { run: 0, walk: 0 };
  let liveSamples: { t: number; d: number }[] = [];

  for (const segment of [...workout.segments].sort((a, b) => a.startedAt - b.startedAt)) {
    const stats = result[segment.phase];
    const phaseBaseMs = stats.durationMs;
    const segmentEnd = Math.min(segment.endedAt ?? end, end);
    stats.durationMs += Math.max(0, segmentEnd - segment.startedAt);
    let anchor: Fix | null = null;
    let lastGood: Fix | null = null;
    let route: Analysis['routes'][number] | null = null;
    const currentSegment = segment.endedAt === null && session.status === 'active';
    let samples: typeof liveSamples = [];

    for (const p of [...(bySegment.get(segment.id) ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
      if (!validFix(p) || p.timestamp < segment.startedAt || p.timestamp > segmentEnd
        || p.accuracy === null || !Number.isFinite(p.accuracy)
        || p.accuracy < 0 || p.accuracy > MAX_ACCURACY_M) {
        result.rejected++;
        continue;
      }
      if (lastGood && p.timestamp <= lastGood.timestamp) continue;
      const gap = !!lastGood && p.timestamp - lastGood.timestamp > MAX_GAP_MS;
      if (gap) {
        result.gaps++;
        anchor = null;
        samples = [];
      }
      if (!anchor) {
        anchor = p;
        route = { key: `${segment.id}-${p.timestamp}`, phase: segment.phase, coordinates: [p] };
        result.routes.push(route);
      } else {
        const distance = distanceBetween(anchor, p);
        const dt = (p.timestamp - anchor.timestamp) / 1000;
        const limit = segment.phase === 'run' ? 12 : 4.5;
        // A spike must not become the new anchor for the following point.
        if (dt <= 0 || distance / dt > limit) {
          result.rejected++;
          continue;
        }
        const jitter = Math.max(3, Math.min(8, ((anchor.accuracy ?? 0) + p.accuracy) * 0.2));
        const stationary = p.speed !== null && p.speed >= 0 && p.speed < 0.45 && distance < 12;
        if (distance >= jitter && !stationary) {
          const before = stats.distanceM;
          const after = before + distance;
          let threshold = (Math.floor((before + 0.000001) / 1000) + 1) * 1000;
          while (threshold <= after + 0.000001) {
            const fraction = Math.min(1, (threshold - before) / distance);
            const crossingMs = phaseBaseMs + anchor.timestamp - segment.startedAt
              + (p.timestamp - anchor.timestamp) * fraction;
            stats.splits.push({ kilometre: Math.round(threshold / 1000),
              durationMs: Math.max(0, crossingMs - phaseLastSplitMs[segment.phase]), cumulativeMs: crossingMs });
            phaseLastSplitMs[segment.phase] = crossingMs;
            threshold += 1000;
          }
          stats.distanceM = after;
          route?.coordinates.push(p);
          anchor = p;
        }
      }
      lastGood = p;
      result.lastGoodAt = Math.max(result.lastGoodAt ?? 0, p.timestamp);
      samples.push({ t: p.timestamp, d: stats.distanceM });
    }
    if (currentSegment) liveSamples = samples;
  }
  for (const phase of ['run', 'walk'] as const) {
    const stats = result[phase];
    stats.calories = session.weightKg * (stats.distanceM / 1000) * (phase === 'run' ? 1 : 0.5);
    stats.partialDistanceM = Math.max(0, stats.distanceM - stats.splits.length * 1000);
    stats.partialDurationMs = Math.max(0, stats.durationMs - phaseLastSplitMs[phase]);
  }
  result.activeMs = result.run.durationMs + result.walk.durationMs;

  // Rolling 15-second speed; clock time includes stops and expires stale fixes.
  const last = liveSamples.at(-1);
  if (last && now - last.t <= 12_000 && liveSamples.length >= 2) {
    const start = Math.max(liveSamples[0].t, now - 15_000);
    let startDistance = liveSamples[0].d;
    for (let i = 1; i < liveSamples.length; i++) {
      const a = liveSamples[i - 1];
      const b = liveSamples[i];
      if (b.t >= start) {
        const fraction = Math.max(0, Math.min(1, (start - a.t) / (b.t - a.t)));
        startDistance = a.d + (b.d - a.d) * fraction;
        break;
      }
      startDistance = b.d;
    }
    if (now - start >= 3000) result.liveSpeedMps = Math.max(0, (last.d - startDistance) / ((now - start) / 1000));
  }
  return result;
}

export function timeText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const s = String(seconds % 60).padStart(2, '0');
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function paceText(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3599) return '—:—';
  const rounded = Math.round(secondsPerKm);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

export function averagePace(stats: PhaseStats): number | null {
  return stats.distanceM >= 10 ? stats.durationMs / stats.distanceM : null;
}

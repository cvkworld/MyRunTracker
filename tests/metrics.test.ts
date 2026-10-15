import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyze, averagePace, distanceBetween, paceText, timeText } from '../src/domain/metrics';
import { workoutGPX, workoutJSON } from '../src/domain/export';
import { fix, points, segment, T, workout } from './helpers';

test('great-circle distance and rounded pace carry seconds correctly', () => {
  assert.ok(Math.abs(distanceBetween(fix(0, 0), fix(1000, 0)) - 1000) < 0.01);
  assert.equal(paceText(359.6), '6:00');
  assert.equal(paceText(null), '—:—');
  assert.equal(timeText(3_661_000), '1:01:01');
});

test('kilometre crossing is interpolated between GPS samples', () => {
  const w = workout([segment('a', 'run', 0, 220)], points('a', 22, 48, 10));
  const a = analyze(w);
  assert.ok(Math.abs(a.run.distanceM - 1008) < 0.01);
  assert.equal(a.run.splits.length, 1);
  assert.ok(Math.abs(a.run.splits[0].durationMs - 208_333.333) < 0.1);
  assert.ok(Math.abs(a.run.partialDistanceM - 8) < 0.01);
  assert.ok(Math.abs(averagePace(a.run)! - 218.253968) < 0.01);
});

test('pause time and movement are excluded; resuming never bridges the route', () => {
  const w = workout([segment('a', 'run', 0, 60), segment('b', 'run', 120, 180)],
    [...points('a', 7, 50, 10), ...points('b', 7, 50, 10, 5000, 120)], 180);
  const a = analyze(w);
  assert.ok(Math.abs(a.run.distanceM - 600) < 0.01);
  assert.equal(a.activeMs, 120_000);
  assert.equal(a.wallMs, 180_000);
  assert.equal(a.routes.length, 2);
});

test('running and cooldown have independent distances, times, splits and calories', () => {
  const w = workout([segment('a', 'run', 0, 210), segment('b', 'walk', 210, 910)],
    [...points('a', 21, 50, 10), ...points('b', 71, 15, 10, 1000, 210)], 910);
  const a = analyze(w);
  assert.ok(Math.abs(a.run.distanceM - 1000) < 0.01);
  assert.ok(Math.abs(a.walk.distanceM - 1050) < 0.01);
  assert.equal(a.run.durationMs, 210_000);
  assert.equal(a.walk.durationMs, 700_000);
  assert.equal(a.run.splits.length, 1);
  assert.equal(a.walk.splits.length, 1);
  assert.ok(Math.abs(a.run.calories - 70) < 0.001);
  assert.ok(Math.abs(a.walk.calories - 36.75) < 0.001);
});

test('bad accuracy and implausible jumps cannot pollute the next point', () => {
  const p = [fix(0, 0), fix(5000, 1), fix(8000, 2, { accuracy: 200 }), fix(15, 3)]
    .map(p => ({ ...p, segmentId: 'a' }));
  const a = analyze(workout([segment('a', 'run', 0, 4)], p, 4));
  assert.ok(Math.abs(a.run.distanceM - 15) < 0.01);
  assert.equal(a.rejected, 2);
});

test('stationary jitter adds no distance', () => {
  const p = Array.from({ length: 60 }, (_, i) => ({ ...fix(i % 2 ? 2 : 0, i, { speed: 0 }), segmentId: 'a' }));
  const a = analyze(workout([segment('a', 'run', 0, 60)], p, 60));
  assert.equal(a.run.distanceM, 0);
});

test('GPS gaps break the route and are not filled with straight-line distance', () => {
  const p = [fix(0, 0), fix(30, 10), fix(800, 80), fix(830, 90)].map(p => ({ ...p, segmentId: 'a' }));
  const a = analyze(workout([segment('a', 'run', 0, 100)], p, 100));
  assert.ok(Math.abs(a.run.distanceM - 60) < 0.01);
  assert.equal(a.gaps, 1);
  assert.equal(a.routes.length, 2);
  assert.equal(a.run.durationMs, 100_000);
});

test('a suspended screen does not freeze active time; stale live pace expires', () => {
  const w = workout([segment('a', 'run', 0, null)], points('a', 4, 30, 10), null);
  const fresh = analyze(w, T + 30_000);
  assert.ok(Math.abs(fresh.liveSpeedMps - 3) < 0.01);
  const later = analyze(w, T + 3_600_000);
  assert.equal(later.activeMs, 3_600_000);
  assert.equal(later.liveSpeedMps, 0);
});

test('splits across a pause use accumulated active time rather than wall time', () => {
  const w = workout([segment('a', 'run', 0, 100), segment('b', 'run', 200, 320)],
    [...points('a', 11, 50, 10), ...points('b', 13, 50, 10, 5000, 200)], 320);
  const a = analyze(w);
  assert.equal(a.run.splits.length, 1);
  assert.ok(Math.abs(a.run.splits[0].durationMs - 200_000) < 0.1);
});

test('exports preserve all raw samples in JSON and separate GPX phases and gaps', () => {
  const w = workout([segment('a', 'run', 0, 50), segment('b', 'walk', 50, 100)],
    [...points('a', 4, 30, 10), ...points('b', 4, 12, 10, 200, 50)], 100);
  const json = JSON.parse(workoutJSON(w));
  assert.equal(json.schemaVersion, 1);
  assert.equal(json.workout.points.length, 8);
  const gpx = workoutGPX(w);
  assert.equal((gpx.match(/<trk>/g) ?? []).length, 2);
  assert.ok(gpx.includes('<name>Cooldown walking</name>'));
  assert.ok(gpx.includes(new Date(T).toISOString()));
});

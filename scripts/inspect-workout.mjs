import { readFileSync } from 'node:fs';

const [file, startText, endText] = process.argv.slice(2);
if (!file || !startText || !endText) {
  console.error('Usage: node scripts/inspect-workout.mjs workout.json LOCK-TIME-ISO UNLOCK-TIME-ISO');
  process.exit(1);
}
const from = Date.parse(startText);
const to = Date.parse(endText);
if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
  console.error('Use valid ISO timestamps with timezone offsets, with unlock after lock.');
  process.exit(1);
}
try {
  const data = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  if (data.schemaVersion !== 1 || !Array.isArray(data.workout?.points)) throw new Error('Expected a MyRun schemaVersion 1 full-workout JSON export.');
  const workout = data.workout;
  const all = [...workout.points].filter(p => Number.isFinite(p.timestamp)).sort((a, b) => a.timestamp - b.timestamp);
  const inside = all.filter(p => p.timestamp >= from && p.timestamp <= to);
  const good = inside.filter(p => Number.isFinite(p.accuracy) && p.accuracy >= 0 && p.accuracy <= 35);
  const timeline = [from, ...good.map(p => p.timestamp), to];
  const largest = timeline.reduce((max, t, i) => i ? Math.max(max, t - timeline[i - 1]) : max, 0);
  console.log(`Recording mode: ${workout.session.mode}`);
  console.log(`Lock window: ${new Date(from).toISOString()} to ${new Date(to).toISOString()}`);
  console.log(`Stored fixes in window: ${inside.length}`);
  console.log(`Fixes with reported accuracy <= 35 m: ${good.length}`);
  console.log(`Largest interval between those fixes / window boundaries: ${(largest / 1000).toFixed(1)} s`);
  const phases = new Map(workout.segments.map(s => [s.id, s.phase]));
  for (const phase of ['run', 'walk']) console.log(`${phase} samples: ${inside.filter(p => phases.get(p.segmentId) === phase).length}`);
  if (!good.length || largest > 30_000) {
    console.log('Review needed: usable GPS coverage is missing or has a gap over 30 seconds. Pauses deliberately contain no samples.');
    process.exitCode = 2;
  } else console.log('Usable capture timestamps cover this window. Also inspect the route and compare with where you moved.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

import { analyze } from './metrics';
import type { Workout } from './types';

export function workoutJSON(workout: Workout): string {
  return JSON.stringify({ schemaVersion: 1, application: 'MyRun', exportedAt: new Date().toISOString(), workout }, null, 2);
}

export function workoutGPX(workout: Workout): string {
  const analysis = analyze(workout, workout.session.endedAt ?? Date.now());
  const tracks = (['run', 'walk'] as const).map(phase => {
    const routes = analysis.routes.filter(r => r.phase === phase);
    if (!routes.length) return '';
    return `<trk><name>${phase === 'run' ? 'Running' : 'Cooldown walking'}</name><type>${phase === 'run' ? 'running' : 'walking'}</type>${routes.map(route =>
      `<trkseg>${route.coordinates.map(p => `<trkpt lat="${p.latitude}" lon="${p.longitude}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`).join('')}</trkseg>`).join('')}</trk>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="MyRun" xmlns="http://www.topografix.com/GPX/1/1"><metadata><time>${new Date(workout.session.startedAt).toISOString()}</time></metadata>${tracks}</gpx>`;
}

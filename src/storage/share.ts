import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { workoutGPX, workoutJSON } from '../domain/export';
import type { Workout } from '../domain/types';

export async function shareWorkout(workout: Workout, format: 'json' | 'gpx'): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is not available on this device.');
  const file = new File(Paths.cache, `MyRun-${workout.session.id}.${format}`);
  file.create({ overwrite: true });
  file.write(format === 'json' ? workoutJSON(workout) : workoutGPX(workout));
  await Sharing.shareAsync(file.uri, {
    mimeType: format === 'json' ? 'application/json' : 'application/gpx+xml',
    UTI: format === 'json' ? 'public.json' : 'public.xml',
    dialogTitle: 'Export your workout',
  });
}

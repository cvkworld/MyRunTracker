import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { repository } from '../storage/database';
import { LOCATION_TASK, reportTrackingError, stopEngine, toFix } from './engine';

// Imported by index.ts before the React root: iOS can execute this with no UI.
if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error) { await reportTrackingError(error.message); return; }
    if (!data?.locations?.length) return;
    try {
      const repo = await repository();
      await repo.ingest(data.locations.map(toFix));
      // A background event only needs the session row, not the full route.
      const session = await repo.getCurrentSession();
      if (!session) await stopEngine();
    } catch (taskError) { await reportTrackingError(taskError); }
  });
}

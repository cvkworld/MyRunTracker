import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import type { Fix, TrackingMode } from '../domain/types';
import { repository } from '../storage/database';

export const LOCATION_TASK = 'myrun-continuous-location-v1';
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const trackingMode: TrackingMode = isExpoGo ? 'foreground' : 'background';
let watcher: Location.LocationSubscription | null = null;

export function toFix(location: Location.LocationObject): Fix {
  return { timestamp: location.timestamp, latitude: location.coords.latitude,
    longitude: location.coords.longitude, accuracy: location.coords.accuracy, speed: location.coords.speed };
}

export async function prepareGPS(): Promise<Fix> {
  if (Platform.OS !== 'ios') throw new Error('This build is configured for iPhone. Use Expo Go on your iPhone to test it.');
  if (!await Location.hasServicesEnabledAsync()) throw new Error('Turn on Location Services in iPhone Settings → Privacy & Security.');
  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new Error('Allow location access in iPhone Settings → MyRun → Location.');
  if (foreground.ios?.accuracy === 'reduced') throw new Error('Turn on Precise Location in iPhone Settings → MyRun → Location for useful running measurements.');
  if (!isExpoGo) {
    if (!await TaskManager.isAvailableAsync()) throw new Error('Background location is unavailable in this build. Install a native development or standalone build.');
    let background = await Location.getBackgroundPermissionsAsync();
    if (!background.granted) background = await Location.requestBackgroundPermissionsAsync();
    if (!background.granted) throw new Error('Choose Always in iPhone Settings → MyRun → Location to record with the screen locked. If you chose Allow Once, change it in Settings.');
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('GPS is taking too long. Go outside with a clear view of the sky and try again.')), 25_000); }),
    ]);
    const fix = toFix(location);
    if (fix.accuracy === null || fix.accuracy > 35 || fix.accuracy < 0 || Date.now() - fix.timestamp > 15_000) {
      throw new Error('GPS accuracy is not ready yet. Wait outdoors, then try again.');
    }
    return fix;
  } finally { if (timeout) clearTimeout(timeout); }
}

export async function startEngine(): Promise<void> {
  if (isExpoGo) {
    watcher?.remove();
    watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 0, timeInterval: 1000 }, location => {
      void repository().then(repo => repo.ingest([toFix(location)]))
        .catch(error => { void reportTrackingError(error); });
    });
    return;
  }
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.Fitness,
    distanceInterval: 0,
    // This is a request to the OS, not a guaranteed sampling frequency.
    timeInterval: 1000,
    deferredUpdatesDistance: 0,
    deferredUpdatesInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopEngine(): Promise<void> {
  watcher?.remove();
  watcher = null;
  if (!isExpoGo && await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export async function isEngineRunning(): Promise<boolean> {
  return isExpoGo ? watcher !== null : Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
}

export async function recoverRecorder(): Promise<void> {
  const repo = await repository();
  const workout = await repo.getActive();
  if (!workout) {
    await stopEngine();
    return;
  }
  if (workout.session.status === 'paused') {
    await stopEngine();
    return;
  }
  const permissions = await Location.getForegroundPermissionsAsync();
  const backgroundGranted = isExpoGo || (await Location.getBackgroundPermissionsAsync()).granted;
  if (workout.session.mode !== trackingMode || !permissions.granted || !backgroundGranted || !await isEngineRunning()) {
    await repo.recoverInterrupted();
    await stopEngine();
  }
}

export async function reportTrackingError(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error('MyRun GPS:', message);
  try { await (await repository()).setDiagnostic(`GPS recorder: ${message}`); }
  catch (storageError) { console.error('Could not persist GPS diagnostic:', storageError); }
}

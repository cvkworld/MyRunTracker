import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { HistoryItem, Settings, Workout } from '../domain/types';
import { repository } from '../storage/database';
import { isExpoGo, prepareGPS, recoverRecorder, startEngine, stopEngine, trackingMode } from './engine';

export function useTracker() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<Settings>({ weightKg: 70 });
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const operation = useRef(false);
  const refresh = useCallback(async (includeHistory = false) => {
    const repo = await repository();
    setWorkout(await repo.getActive());
    setDiagnostic(await repo.diagnostic());
    if (includeHistory) setHistory(await repo.history());
  }, []);

  useEffect(() => {
    let alive = true;
    let polling = false;
    void (async () => {
      try {
        await recoverRecorder();
        const repo = await repository();
        if (alive) {
          setSettings(await repo.getSettings());
          await refresh(true);
          setReady(true);
        }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    })();
    const timer = setInterval(() => {
      if (!alive || AppState.currentState !== 'active') return;
      setNow(Date.now());
      if (!polling && !operation.current) {
        polling = true;
        void refresh().catch(e => { if (alive) setError(String(e)); }).finally(() => { polling = false; });
      }
    }, 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNow(Date.now());
        void refresh().catch(e => setError(String(e)));
      } else if (isExpoGo) {
        // Expo Go has no background recorder. Do not pretend the locked interval
        // was a measured workout or connect the route across this interval.
        const pausedAt = Date.now();
        void (async () => {
          const repo = await repository();
          const current = await repo.getActive();
          if (current?.session.status !== 'active') return;
          await repo.pause(pausedAt);
          await stopEngine();
          await repo.setDiagnostic('Expo Go paused this workout when the app left the foreground. Use an installed build for screen-locked GPS.');
          await refresh();
        })().catch(e => setError(String(e)));
      }
    });
    // Never stop native tracking as a React effect cleanup or on screen changes.
    return () => { alive = false; clearInterval(timer); subscription.remove(); };
  }, [refresh]);

  const perform = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (operation.current) return undefined;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      const value = await action();
      await refresh(true);
      setNow(Date.now());
      return value;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await refresh(true).catch(() => undefined);
    } finally { operation.current = false; setBusy(false); }
    return undefined;
  };

  return {
    workout, history, settings, now, ready, busy, error, diagnostic, refresh,
    dismissError: () => setError(null),
    start: () => perform(async () => {
      const fix = await prepareGPS();
      const repo = await repository();
      await repo.start(settings.weightKg, trackingMode, fix.timestamp);
      await repo.ingest([fix]);
      try { await startEngine(); }
      catch (e) { await repo.pause(); await stopEngine().catch(() => undefined); throw e; }
    }),
    pause: () => perform(async () => {
      await (await repository()).pause();
      await stopEngine();
    }),
    resume: () => perform(async () => {
      await prepareGPS();
      const repo = await repository();
      await repo.resume();
      await repo.setDiagnostic('');
      try { await startEngine(); }
      catch (e) { await repo.pause(); await stopEngine().catch(() => undefined); throw e; }
    }),
    cooldown: () => perform(async () => { await (await repository()).cooldown(); }),
    finish: () => perform(async () => {
      const id = await (await repository()).finish();
      await stopEngine();
      return id;
    }),
    remove: (id: string) => perform(async () => { await (await repository()).remove(id); }),
    saveSettings: (value: Settings) => perform(async () => {
      await (await repository()).saveSettings(value);
      setSettings(value);
    }),
  };
}

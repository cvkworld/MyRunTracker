import { analyze, validFix } from '../domain/metrics';
import type { Fix, HistoryItem, Phase, Segment, Session, Settings, TrackingMode, Workout } from '../domain/types';

export type SqlValue = string | number | null;
export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
}
export interface Database extends SqlConnection {
  withExclusiveTransactionAsync(action: (tx: SqlConnection) => Promise<void>): Promise<void>;
}

export const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, startedAt REAL NOT NULL, endedAt REAL,
    status TEXT NOT NULL, phase TEXT NOT NULL, mode TEXT NOT NULL,
    weightKg REAL NOT NULL, summary TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS one_unfinished_session
    ON sessions ((1)) WHERE status != 'finished';
  CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY, sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    phase TEXT NOT NULL, startedAt REAL NOT NULL, endedAt REAL
  );
  CREATE INDEX IF NOT EXISTS segments_by_session ON segments(sessionId, startedAt);
  CREATE TABLE IF NOT EXISTS points (
    id INTEGER PRIMARY KEY, sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    segmentId TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    timestamp REAL NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL,
    accuracy REAL, speed REAL, UNIQUE(sessionId, timestamp)
  );
  CREATE INDEX IF NOT EXISTS points_by_segment ON points(segmentId, timestamp);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  PRAGMA user_version = 1;
`;

// All callers (background task and UI) share one queue. Exclusive SQL transactions
// make session transitions and incoming batches atomic, including late batches.
export function createRepository(db: Database) {
  let tail: Promise<unknown> = Promise.resolve();
  const serialized = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = tail.then(operation, operation);
    tail = next.catch(() => undefined);
    return next;
  };
  const active = (cx: SqlConnection) => cx.getFirstAsync<Session>("SELECT * FROM sessions WHERE status != 'finished' LIMIT 1");
  const load = async (cx: SqlConnection, session: Session): Promise<Workout> => ({
    session,
    segments: await cx.getAllAsync<Segment>('SELECT * FROM segments WHERE sessionId = ? ORDER BY startedAt', session.id),
    points: await cx.getAllAsync<Workout['points'][number]>(
      'SELECT segmentId, timestamp, latitude, longitude, accuracy, speed FROM points WHERE sessionId = ? ORDER BY timestamp', session.id),
  });
  const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

  return {
    init: () => serialized(() => db.execAsync(SCHEMA)),
    getCurrentSession: () => serialized(() => active(db)),
    getActive: () => serialized(async () => {
      const session = await active(db);
      return session ? load(db, session) : null;
    }),
    getWorkout: (id: string) => serialized(async () => {
      const session = await db.getFirstAsync<Session>('SELECT * FROM sessions WHERE id = ?', id);
      return session ? load(db, session) : null;
    }),
    start: (weightKg: number, mode: TrackingMode, now = Date.now()) => serialized(async () => {
      if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) throw new Error('Enter a weight between 20 and 300 kg.');
      let id = '';
      await db.withExclusiveTransactionAsync(async tx => {
        if (await active(tx)) throw new Error('Finish your current workout before starting another.');
        id = newId();
        await tx.runAsync("INSERT INTO sessions VALUES (?, ?, NULL, 'active', 'run', ?, ?, NULL)", id, now, mode, weightKg);
        await tx.runAsync("INSERT INTO segments VALUES (?, ?, 'run', ?, NULL)", newId(), id, now);
        await tx.runAsync("DELETE FROM settings WHERE key = 'diagnostic'");
      });
      return id;
    }),
    ingest: (fixes: Fix[]) => serialized(async () => {
      await db.withExclusiveTransactionAsync(async tx => {
        const session = await active(tx);
        if (!session) return;
        const segments = await tx.getAllAsync<Segment>('SELECT * FROM segments WHERE sessionId = ? ORDER BY startedAt', session.id);
        for (const fix of [...fixes].sort((a, b) => a.timestamp - b.timestamp)) {
          if (!validFix(fix) || fix.timestamp > Date.now() + 5000) continue;
          // Attribute by the GPS timestamp, never by the delivery time or current phase.
          const segment = segments.find(s => fix.timestamp >= s.startedAt && (s.endedAt === null || fix.timestamp < s.endedAt));
          if (!segment) continue;
          await tx.runAsync('INSERT OR IGNORE INTO points (sessionId, segmentId, timestamp, latitude, longitude, accuracy, speed) VALUES (?, ?, ?, ?, ?, ?, ?)',
            session.id, segment.id, fix.timestamp, fix.latitude, fix.longitude,
            fix.accuracy !== null && Number.isFinite(fix.accuracy) ? fix.accuracy : null,
            fix.speed !== null && Number.isFinite(fix.speed) ? fix.speed : null);
        }
      });
    }),
    pause: (now = Date.now()) => serialized(async () => {
      await db.withExclusiveTransactionAsync(async tx => {
        const session = await active(tx);
        if (!session || session.status !== 'active') return;
        await tx.runAsync('UPDATE segments SET endedAt = MAX(startedAt, ?) WHERE sessionId = ? AND endedAt IS NULL', now, session.id);
        await tx.runAsync("UPDATE sessions SET status = 'paused' WHERE id = ?", session.id);
      });
    }),
    resume: (now = Date.now()) => serialized(async () => {
      await db.withExclusiveTransactionAsync(async tx => {
        const session = await active(tx);
        if (!session || session.status !== 'paused') throw new Error('There is no paused workout to resume.');
        await tx.runAsync("UPDATE sessions SET status = 'active' WHERE id = ?", session.id);
        await tx.runAsync('INSERT INTO segments VALUES (?, ?, ?, ?, NULL)', newId(), session.id, session.phase, now);
      });
    }),
    cooldown: (now = Date.now()) => serialized(async () => {
      await db.withExclusiveTransactionAsync(async tx => {
        const session = await active(tx);
        if (!session || session.status !== 'active' || session.phase !== 'run') throw new Error('Resume your run before starting cooldown.');
        await tx.runAsync('UPDATE segments SET endedAt = ? WHERE sessionId = ? AND endedAt IS NULL', now, session.id);
        await tx.runAsync("UPDATE sessions SET phase = 'walk' WHERE id = ?", session.id);
        await tx.runAsync("INSERT INTO segments VALUES (?, ?, 'walk', ?, NULL)", newId(), session.id, now);
      });
    }),
    finish: (now = Date.now()) => serialized(async () => {
      let id: string | null = null;
      await db.withExclusiveTransactionAsync(async tx => {
        const session = await active(tx);
        if (!session) return;
        id = session.id;
        await tx.runAsync('UPDATE segments SET endedAt = MAX(startedAt, ?) WHERE sessionId = ? AND endedAt IS NULL', now, session.id);
        await tx.runAsync("UPDATE sessions SET status = 'finished', endedAt = ? WHERE id = ?", now, session.id);
        const finished = { ...session, endedAt: now, status: 'finished' as const };
        const { run, walk, activeMs, wallMs, gaps, rejected } = analyze(await load(tx, finished), now);
        await tx.runAsync('UPDATE sessions SET summary = ? WHERE id = ?', JSON.stringify({ run, walk, activeMs, wallMs, gaps, rejected }), session.id);
      });
      return id;
    }),
    recoverInterrupted: () => serialized(async () => {
      await db.withExclusiveTransactionAsync(async tx => {
        const session = await active(tx);
        if (!session || session.status !== 'active') return;
        const segment = await tx.getFirstAsync<Segment>('SELECT * FROM segments WHERE sessionId = ? AND endedAt IS NULL', session.id);
        if (!segment) return;
        const last = await tx.getFirstAsync<{ t: number | null }>('SELECT MAX(timestamp) AS t FROM points WHERE segmentId = ?', segment.id);
        // Do not silently count hours while the recorder was terminated.
        await tx.runAsync('UPDATE segments SET endedAt = ? WHERE id = ?', Math.max(segment.startedAt, last?.t ?? segment.startedAt), segment.id);
        await tx.runAsync("UPDATE sessions SET status = 'paused' WHERE id = ?", session.id);
        await tx.runAsync("INSERT OR REPLACE INTO settings VALUES ('diagnostic', ?)", 'Recording was interrupted. Saved points were recovered; resume when ready.');
      });
    }),
    history: () => serialized(async (): Promise<HistoryItem[]> => {
      const sessions = await db.getAllAsync<Session>("SELECT * FROM sessions WHERE status = 'finished' ORDER BY startedAt DESC");
      return sessions.filter(s => s.summary).map(s => ({ ...s, totals: JSON.parse(s.summary!) }));
    }),
    remove: (id: string) => serialized(async () => {
      await db.withExclusiveTransactionAsync(async tx => {
        // Explicit deletion also works on transaction connections without foreign_keys enabled.
        const session = await tx.getFirstAsync<Session>("SELECT * FROM sessions WHERE id = ? AND status = 'finished'", id);
        if (!session) throw new Error('Only finished workouts can be deleted.');
        await tx.runAsync('DELETE FROM points WHERE sessionId = ?', id);
        await tx.runAsync('DELETE FROM segments WHERE sessionId = ?', id);
        await tx.runAsync('DELETE FROM sessions WHERE id = ?', id);
      });
    }),
    getSettings: () => serialized(async (): Promise<Settings> => {
      const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'weightKg'");
      const weightKg = Number(row?.value ?? 70);
      return { weightKg: Number.isFinite(weightKg) && weightKg >= 20 && weightKg <= 300 ? weightKg : 70 };
    }),
    saveSettings: (settings: Settings) => serialized(async () => {
      if (!Number.isFinite(settings.weightKg) || settings.weightKg < 20 || settings.weightKg > 300) throw new Error('Enter a weight between 20 and 300 kg.');
      await db.runAsync("INSERT OR REPLACE INTO settings VALUES ('weightKg', ?)", String(settings.weightKg));
    }),
    setDiagnostic: (message: string) => serialized(async () => {
      await db.runAsync("INSERT OR REPLACE INTO settings VALUES ('diagnostic', ?)", message);
    }),
    diagnostic: () => serialized(async () => {
      const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'diagnostic'");
      return row?.value ?? null;
    }),
  };
}

export type Repository = ReturnType<typeof createRepository>;

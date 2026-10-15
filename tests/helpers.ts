import { DatabaseSync } from 'node:sqlite';
import { createRepository, type Database, type SqlConnection, type SqlValue } from '../src/storage/repository';
import type { Fix, Segment, TrackPoint, Workout } from '../src/domain/types';

export const T = 1_700_000_000_000;
export function fix(metres: number, seconds: number, extra: Partial<Fix> = {}): Fix {
  return { timestamp: T + seconds * 1000, latitude: metres / 111_195.0802335329, longitude: 0, accuracy: 4, speed: null, ...extra };
}
export function segment(id: string, phase: 'run' | 'walk', start: number, end: number | null): Segment {
  return { id, sessionId: 'test', phase, startedAt: T + start * 1000, endedAt: end === null ? null : T + end * 1000 };
}
export function points(segmentId: string, count: number, stepM: number, stepS: number, startM = 0, startS = 0): TrackPoint[] {
  return Array.from({ length: count }, (_, i) => ({ ...fix(startM + i * stepM, startS + i * stepS), segmentId }));
}
export function workout(segments: Segment[], samples: TrackPoint[], end: number | null = 220): Workout {
  return { session: { id: 'test', startedAt: T, endedAt: end === null ? null : T + end * 1000,
    status: end === null ? 'active' : 'finished', phase: segments.at(-1)?.phase ?? 'run', mode: 'background', weightKg: 70, summary: null }, segments, points: samples };
}

export async function testRepository(filename = ':memory:') {
  const native = new DatabaseSync(filename);
  const connection: SqlConnection = {
    execAsync: async sql => { native.exec(sql); },
    runAsync: async (sql: string, ...values: SqlValue[]) => native.prepare(sql).run(...values),
    getFirstAsync: async <U,>(sql: string, ...values: SqlValue[]) => (native.prepare(sql).get(...values) ?? null) as U | null,
    getAllAsync: async <U,>(sql: string, ...values: SqlValue[]) => native.prepare(sql).all(...values) as U[],
  };
  const db: Database = {
    ...connection,
    withExclusiveTransactionAsync: async action => {
      native.exec('BEGIN IMMEDIATE');
      try { await action(connection); native.exec('COMMIT'); }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
  };
  const repo = createRepository(db);
  await repo.init();
  return { repo, close: () => native.close() };
}

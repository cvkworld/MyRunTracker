import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { analyze } from '../src/domain/metrics';
import { fix, T, testRepository } from './helpers';

test('late, reordered, duplicate batches are assigned by capture time, including phase boundaries', async () => {
  const { repo, close } = await testRepository();
  try {
    await repo.start(70, 'background', T);
    await repo.pause(T + 10_000);
    await repo.resume(T + 20_000);
    await repo.cooldown(T + 30_000);
    await repo.ingest([fix(40, 31), fix(30, 30), fix(5, 5), fix(5, 5), fix(15, 15), fix(25, 25)]);
    const w = (await repo.getActive())!;
    assert.equal(w.points.length, 4);
    assert.equal(w.points[0].segmentId, w.segments[0].id);
    assert.equal(w.points[1].segmentId, w.segments[1].id);
    assert.equal(w.points[2].segmentId, w.segments[2].id);
    assert.equal(w.points[3].segmentId, w.segments[2].id);
  } finally { close(); }
});

test('history persists separate statistics; finished workouts ignore stray callbacks', async () => {
  const { repo, close } = await testRepository();
  try {
    const id = await repo.start(70, 'background', T);
    await repo.ingest([fix(0, 0), fix(50, 10)]);
    await repo.cooldown(T + 20_000);
    await repo.ingest([fix(60, 21), fix(80, 31)]);
    await repo.finish(T + 40_000);
    await repo.ingest([fix(9000, 41)]);
    assert.equal(await repo.getActive(), null);
    const history = await repo.history();
    assert.equal(history.length, 1);
    assert.ok(Math.abs(history[0].totals.run.distanceM - 50) < 0.01);
    assert.ok(Math.abs(history[0].totals.walk.distanceM - 20) < 0.01);
    assert.equal((await repo.getWorkout(id))!.points.length, 4);
    await repo.remove(id);
    assert.equal((await repo.history()).length, 0);
    assert.equal(await repo.getWorkout(id), null);
  } finally { close(); }
});

test('only one unfinished session is permitted, and invalid weight is rejected', async () => {
  const { repo, close } = await testRepository();
  try {
    await assert.rejects(repo.start(Number.NaN, 'background', T));
    const outcomes = await Promise.allSettled([repo.start(70, 'background', T), repo.start(80, 'background', T)]);
    assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
    await assert.rejects(repo.remove((await repo.getActive())!.session.id));
  } finally { close(); }
});

test('interrupted sessions recover to the last stored fix and remain resumable', async () => {
  const { repo, close } = await testRepository();
  try {
    await repo.start(70, 'background', T);
    await repo.ingest([fix(0, 0), fix(50, 10)]);
    await repo.recoverInterrupted();
    let w = (await repo.getActive())!;
    assert.equal(w.session.status, 'paused');
    assert.equal(analyze(w, T + 3_600_000).activeMs, 10_000);
    await repo.resume(T + 3_600_000);
    await repo.ingest([fix(5000, 3601), fix(5050, 3611)]);
    w = (await repo.getActive())!;
    assert.ok(Math.abs(analyze(w, T + 3_612_000).run.distanceM - 100) < 0.01);
    assert.ok((await repo.diagnostic())!.includes('interrupted'));
  } finally { close(); }
});

test('workout and settings survive closing and reopening an actual SQLite file', async () => {
  const folder = resolve('build', 'test-data');
  mkdirSync(folder, { recursive: true });
  const file = resolve(folder, `${randomUUID()}.sqlite`);
  let db = await testRepository(file);
  try {
    const id = await db.repo.start(82, 'background', T);
    await db.repo.ingest([fix(0, 0), fix(50, 10)]);
    await db.repo.saveSettings({ weightKg: 82 });
    db.close();
    db = await testRepository(file);
    assert.equal((await db.repo.getSettings()).weightKg, 82);
    assert.equal((await db.repo.getActive())!.session.id, id);
    assert.equal((await db.repo.getActive())!.points.length, 2);
    await db.repo.finish(T + 12_000);
    assert.equal((await db.repo.history())[0].weightKg, 82);
  } finally {
    db.close();
    for (const name of [file, `${file}-wal`, `${file}-shm`]) if (existsSync(name)) unlinkSync(name);
  }
});

import * as SQLite from 'expo-sqlite';
import { createRepository, type Repository } from './repository';

let pending: Promise<Repository> | null = null;

// Lazy and shared: this is also called with no React tree mounted, by iOS tasks.
export function repository(): Promise<Repository> {
  if (!pending) {
    pending = (async () => {
      const db = await SQLite.openDatabaseAsync('myrun-v1.db');
      const repo = createRepository(db);
      await repo.init();
      return repo;
    })().catch(error => { pending = null; throw error; });
  }
  return pending;
}

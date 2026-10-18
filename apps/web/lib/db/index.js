// Storage layer. Every driver implements the same interface, so the rest of
// the app never knows (or cares) which database is behind it.
//
//   users:  findByEmail(email), findById(id), create(user)
//   pages:  listByUser(userId), findById(id), findBySlug(slug), create(page),
//           update(id, patch), remove(id), countByUser(userId)
//   events: insert(event), listForPage(pageId, since), removeForPage(pageId)
//   assets: create(asset), findById(id), remove(id), listByUser(userId)
//   (with R2 configured, uploaded files go to Cloudflare R2: see with-r2.js)
//
// To add a driver (Postgres, SQLite, Supabase…): create a file exporting
// createXDriver() with the interface above and add it to `drivers`.

import { config } from '../config.js';
import { r2Configured } from '../storage.js';
import { withR2 } from './with-r2.js';

const drivers = {
  mongo: () => import('./mongo.js').then((m) => m.createMongoDriver()),
  file: () => import('./file.js').then((m) => m.createFileDriver()),
};

// One shared instance per process. Next.js loads server code in separate
// bundles (pages vs. API routes, plus hot reloads), so the instance lives on
// globalThis instead of a module variable — otherwise the file driver would
// keep two different copies of the data in memory.
const KEY = Symbol.for('otrelink.db');

export function getDb() {
  if (!globalThis[KEY]) {
    const load = drivers[config.dbDriver];
    if (!load) throw new Error(`Unknown DB_DRIVER "${config.dbDriver}"`);
    globalThis[KEY] = load().then((db) => (r2Configured() ? withR2(db) : db)).catch((err) => {
      // Don't cache a failed connection: the next request retries.
      globalThis[KEY] = null;
      console.error(`[otrelink] Could not connect to the "${config.dbDriver}" database:`, err?.message || err);
      throw err;
    });
  }
  return globalThis[KEY];
}

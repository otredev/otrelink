// Wraps a database driver so uploaded files live in Cloudflare R2 instead of the database
// (only the file's details stay in the database, with storage: 'r2').
// Files saved before R2 was turned on keep working from the database.
import crypto from 'node:crypto';
import { assetKey, r2Put, r2Get, r2Delete } from '../storage.js';

export function withR2(db) {
  const assets = {
    ...db.assets,
    async create({ userId, mime, data, name = '' }) {
      const id = crypto.randomUUID().replace(/-/g, '');
      await r2Put(assetKey(id), data, { contentType: mime, name });
      try {
        await db.assets.create({ id, userId, mime, name, size: data.length, storage: 'r2' });
      } catch (err) {
        await r2Delete(assetKey(id)).catch(() => {});
        throw err;
      }
      return { id, storage: 'r2' };
    },
    /** Details only (no download from R2). */
    findMeta: (id) => db.assets.findById(id),
    /** Details + bytes (downloads from R2 when needed): static export, invoice logos. */
    async findById(id) {
      const a = await db.assets.findById(id);
      if (!a || a.data || a.storage !== 'r2') return a;
      const data = await r2Get(assetKey(id));
      return data ? { ...a, data } : null;
    },
    async remove(id) {
      const a = await db.assets.findById(id);
      await db.assets.remove(id);
      if (a?.storage === 'r2') await r2Delete(assetKey(id)).catch((e) => console.warn('[otrelink] R2 delete failed', id, e.message));
    },
  };
  const users = {
    ...db.users,
    // Deleting an account also deletes its files in R2.
    async remove(id) {
      const files = (await db.assets.listByUser(id)).filter((a) => a.storage === 'r2');
      await db.users.remove(id);
      for (const a of files) await r2Delete(assetKey(a.id)).catch((e) => console.warn('[otrelink] R2 delete failed', a.id, e.message));
    },
  };
  return { ...db, assets, users };
}

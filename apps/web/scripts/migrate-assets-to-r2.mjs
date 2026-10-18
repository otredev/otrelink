// Move the files kept in MongoDB to Cloudflare R2 (run once after setting up R2).
//   node --env-file=.env scripts/migrate-assets-to-r2.mjs           → copies and frees the space in Mongo
//   node --env-file=.env scripts/migrate-assets-to-r2.mjs --dry-run → only counts
//   node --env-file=.env scripts/migrate-assets-to-r2.mjs --keep    → copies, keeps the bytes in Mongo too
// Needs MONGODB_URI, MONGODB_DB and the R2_* variables. Pages keep working during and after:
// /api/assets/<id> serves from Mongo until a file is moved, then redirects to MEDIA_URL.
// Safe to run again: files already moved are skipped.
import { MongoClient } from 'mongodb';
import { config } from '../lib/config.js';
import { r2Configured, r2Put, assetKey } from '../lib/storage.js';

const dry = process.argv.includes('--dry-run');
const keep = process.argv.includes('--keep');
if (!config.mongoUri) throw new Error('MONGODB_URI is not set');
if (!r2Configured()) throw new Error('Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET first');

const client = await new MongoClient(config.mongoUri).connect();
const assets = client.db(config.mongoDb).collection('assets');
const query = { storage: { $ne: 'r2' }, data: { $exists: true } };
const total = await assets.countDocuments(query);
console.log(`${total} file(s) to move to R2 bucket "${config.r2.bucket}"${dry ? ' (dry run)' : ''}.`);

let moved = 0; let bytes = 0; let failed = 0;
if (!dry) {
  for await (const doc of assets.find(query)) {
    try {
      const data = Buffer.from(doc.data.buffer);
      await r2Put(assetKey(doc._id), data, { contentType: doc.mime, name: doc.name || '' });
      await assets.updateOne({ _id: doc._id }, keep ? { $set: { storage: 'r2' } } : { $set: { storage: 'r2', size: data.length }, $unset: { data: '' } });
      moved++; bytes += data.length;
      if (moved % 25 === 0) console.log(`  ${moved}/${total}…`);
    } catch (err) {
      failed++;
      console.error(`  ${doc._id}: ${err.message}`);
    }
  }
}
console.log(`Done: ${moved} moved (${(bytes / 1048576).toFixed(1)} MB), ${failed} failed.`);
await client.close();

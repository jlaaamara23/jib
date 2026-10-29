#!/usr/bin/env node
// JIBI bulk product import: creates products as DRAFTS from a JIBI Upload Kit (work/products.json).
//
// Safety:
//   - Every product is created with status DRAFT, so nothing becomes visible to customers.
//   - Only localhost APIs are allowed unless --allow-remote=<exact host> is given.
//   - Progress is saved per target host (state file), so re-running never creates duplicates.
//   - The admin password is read from a hidden prompt (or JIBI_ADMIN_PASSWORD) and never written anywhere.
//
// Usage:
//   node import.mjs --kit "<...>/JIBI Upload Kit/work/products.json" --api http://localhost:8081/api \
//                   --email admin@example.com [--dry-run] [--limit 5] [--only P001,P002] [--create-stores]
//
// Requires Node 18+ (built-in fetch/FormData/Blob). No dependencies.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const HELP = `Options:
  --kit <file>            products.json from the JIBI Upload Kit (required)
  --api <url>             JIBI API base URL, e.g. http://localhost:8081/api (required)
  --email <email>         admin email (or env JIBI_ADMIN_EMAIL)
  --dry-run               validate everything, upload nothing
  --limit <n>             import at most n products this run
  --only <ids>            comma-separated product ids, e.g. P001,P014
  --create-stores         create a store for a category that has none yet
  --state <file>          progress file (default: ./jibi-import-state.<host>.json)
  --allow-remote=<host>   required to target anything other than localhost
  --require-cloudinary    stop if an uploaded image is not stored on Cloudinary
                          (always on for non-local targets)
  --include <statuses>    comma-separated kit statuses to import
                          (default: "Waiting: price,Waiting: Shoes category,Waiting: Luggage category")`;

const CATEGORY_STORE_NAMES = {
  CLOTHING: 'Clothing', SHOES: 'Shoes', LUGGAGE: 'Luggage & Travel',
};
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/';
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) throw new Error(`Unexpected argument: ${argv[i]}`);
    const [, k, v] = m;
    if (v !== undefined) a[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) a[k] = argv[++i];
    else a[k] = true;
  }
  return a;
}

function log(...m) { console.log(...m); }

async function promptHidden(question) {
  if (process.env.JIBI_ADMIN_PASSWORD) return process.env.JIBI_ADMIN_PASSWORD;
  if (!process.stdin.isTTY) throw new Error('No terminal for password prompt; set JIBI_ADMIN_PASSWORD for non-interactive runs.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => { if (s.startsWith(question)) process.stdout.write(question); };
  const answer = await new Promise((res) => rl.question(question, res));
  rl.close();
  process.stdout.write('\n');
  return answer;
}

class Api {
  constructor(base) { this.base = base.replace(/\/$/, ''); this.token = null; }
  async call(method, p, body, { form } = {}) {
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body && !form) headers['Content-Type'] = 'application/json';
    const res = await fetch(this.base + p, { method, headers, body: form ? body : body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && data.error) || `${res.status} ${res.statusText}`;
      const err = new Error(`${method} ${p}: ${msg}`); err.status = res.status; throw err;
    }
    return data;
  }
  async login(email, password) {
    const r = await this.call('POST', '/auth/login', { email, password });
    if (!r?.token) throw new Error('Login failed');
    if (r.role !== 'ADMIN') throw new Error(`Account ${email} is not an ADMIN (role ${r.role})`);
    this.token = r.token;
  }
  async upload(file) {
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: `image/${ext}` }), path.basename(file));
    const r = await this.call('POST', '/upload', fd, { form: true });
    if (!r?.url) throw new Error(`Upload returned no URL for ${file}`);
    return r.url;
  }
}

function loadState(file) {
  if (!fs.existsSync(file)) return { products: {}, images: {} };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveState(file, state) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1));
  fs.renameSync(tmp, file);
}

/** Builds the API payload; image paths are replaced by uploaded URLs via urlOf(). */
export function buildPayload(product, storeId, urlOf) {
  const variants = (product.color_variants || []).map((v) => ({
    color: String(v.color).slice(0, 50),
    imageUrls: v.images.map(urlOf),
    quantity: 0,
  }));
  // With colour variants the card shows the variant photos; keep one cover image on the product itself.
  const imageUrls = variants.length ? [urlOf(product.images[0])] : product.images.map(urlOf);
  return {
    storeId,
    name: product.name,
    description: product.description || null,
    price: product.price ?? null,
    stockQuantity: product.stock ?? 0,
    status: 'DRAFT',
    imageUrls,
    sizeStocks: null,
    colorVariants: variants.length ? variants : null,
  };
}

/** Returns a list of problems for one product (empty = ok). */
export function validate(product) {
  const problems = [];
  if (!product.name) problems.push('missing name');
  if (!product.category) problems.push('missing category');
  if (!product.images?.length) problems.push('no images');
  for (const img of product.images || []) {
    if (!IMAGE_EXT.test(img)) problems.push(`not an image file: ${img}`);
    else if (!fs.existsSync(img)) problems.push(`image not found: ${img}`);
    else if (fs.statSync(img).size > MAX_UPLOAD_BYTES) problems.push(`image over 10 MB: ${img}`);
  }
  const joined = (product.images || []).join(',');
  if (joined.length > 0 && product.images.length > 15) problems.push('more than 15 images (DB column limit)');
  return problems;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.kit || !args.api) { log(HELP); process.exit(args.help ? 0 : 2); }

  const apiUrl = new URL(args.api);
  const host = apiUrl.hostname;
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (!isLocal && args['allow-remote'] !== host) {
    throw new Error(`Refusing to import into ${host}. To target a non-local server pass --allow-remote=${host}`);
  }

  const include = (args.include || 'Waiting: price,Waiting: Shoes category,Waiting: Luggage category')
    .split(',').map((s) => s.trim());
  const only = args.only ? new Set(String(args.only).split(',').map((s) => s.trim())) : null;
  const limit = args.limit ? Number(args.limit) : Infinity;
  const dry = !!args['dry-run'];
  const stateFile = path.resolve(args.state || `jibi-import-state.${host}.json`);
  const requireCloudinary = !isLocal || !!args['require-cloudinary'];

  const all = JSON.parse(fs.readFileSync(args.kit, 'utf8'));
  const state = loadState(stateFile);
  const selected = all.filter((p) => (only ? only.has(p.id) : include.includes(p.status)));
  const skippedStatus = all.filter((p) => !selected.includes(p)).length;
  const todo = selected.filter((p) => !state.products[p.id]);
  const already = selected.length - todo.length;

  log(`Target:        ${apiUrl.origin}${isLocal ? ' (local)' : ' (REMOTE)'}${requireCloudinary ? ', images must go to Cloudinary' : ''}`);
  log(`Kit products:  ${all.length}  | selected: ${selected.length}  | excluded by status: ${skippedStatus}`);
  log(`Already done:  ${already} (from ${path.basename(stateFile)})  | to import now: ${Math.min(todo.length, limit)}`);

  const invalid = todo.map((p) => [p, validate(p)]).filter(([, e]) => e.length);
  for (const [p, e] of invalid) log(`  ! ${p.id} ${p.name}: ${e.join('; ')}`);
  const batch = todo.filter((p) => validate(p).length === 0).slice(0, limit);
  const imageCount = new Set(batch.flatMap((p) => p.images).filter((i) => !state.images[i])).size;
  const byCat = batch.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {});
  log(`Batch:         ${batch.length} products, ${imageCount} new images, by category ${JSON.stringify(byCat)}`);
  if (invalid.length) log(`Invalid:       ${invalid.length} products will be skipped (listed above)`);

  if (dry) { log('Dry run: nothing uploaded or created.'); return; }
  if (batch.length === 0) { log('Nothing to do.'); return; }

  const api = new Api(args.api);
  const email = args.email || process.env.JIBI_ADMIN_EMAIL;
  if (!email) throw new Error('Pass --email or set JIBI_ADMIN_EMAIL');
  await api.login(email, await promptHidden(`Password for ${email}: `));
  log(`Logged in as ${email} (ADMIN).`);

  // One store per category: reuse the first existing store, otherwise create (only with --create-stores).
  const stores = await api.call('GET', '/stores');
  const storeFor = {};
  for (const cat of Object.keys(byCat)) {
    let s = stores.find((x) => x.category === cat);
    if (!s) {
      if (!args['create-stores']) throw new Error(`No store with category ${cat}. Create one, or re-run with --create-stores.`);
      s = await api.call('POST', '/stores', { name: CATEGORY_STORE_NAMES[cat] || cat, category: cat });
      log(`Created store "${s.name}" (${cat}).`);
    }
    storeFor[cat] = s.id;
  }

  let ok = 0; const failed = [];
  for (const [i, p] of batch.entries()) {
    try {
      for (const img of p.images) {
        if (!state.images[img]) {
          const url = await api.upload(img);
          if (requireCloudinary && !url.startsWith(CLOUDINARY_PREFIX)) {
            const err = new Error(`image was not stored on Cloudinary (got ${url.slice(0, 60)}). Stopping: check the backend's CLOUDINARY_* settings.`);
            err.fatal = true; throw err;
          }
          state.images[img] = url; saveState(stateFile, state);
        }
      }
      const created = await api.call('POST', '/products', buildPayload(p, storeFor[p.category], (f) => state.images[f]));
      if (created.status !== 'DRAFT') throw new Error(`server returned status ${created.status}, expected DRAFT`);
      state.products[p.id] = { jibiId: created.id, storeId: storeFor[p.category], at: new Date().toISOString() };
      saveState(stateFile, state);
      ok++;
      log(`  [${i + 1}/${batch.length}] ${p.id} -> draft #${created.id}  ${p.name}`);
    } catch (e) {
      failed.push({ id: p.id, error: e.message });
      log(`  [${i + 1}/${batch.length}] ${p.id} FAILED: ${e.message}`);
      if (e.fatal) break;
      if (e.status === 401 || e.status === 403) { log('Authentication problem: stopping.'); break; }
    }
  }
  log(`Done: ${ok} drafts created, ${failed.length} failed. Progress saved to ${stateFile}`);
  if (failed.length) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:')}` ||
    process.argv[1]?.endsWith('import.mjs')) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}

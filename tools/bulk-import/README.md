# JIBI bulk import

Creates products in JIBI **as drafts** from a JIBI Upload Kit (`work/products.json`): images, names, descriptions, categories and colour variants. Prices can stay empty. Nothing becomes visible to customers until an admin publishes it from the store page (one by one, or "Select all drafts" → "Publish selected").

Requires: Node 18+, a backend with the `feature/product-drafts` changes and DB migrations `V2026_10_28_01` and `V2026_10_28_02`, and an ADMIN account.

## Safety

- Every product is created with `status: DRAFT`; the script stops if the server returns anything else.
- Only `localhost` is accepted unless you pass `--allow-remote=<exact host>`.
- Progress is saved after every image and every product in `jibi-import-state.<host>.json`. Re-running continues where it stopped and never creates duplicates. Delete the state file only if that server's products were removed.
- The password is asked in a hidden prompt (or read from `JIBI_ADMIN_PASSWORD`) and is never written to disk or logs.
- Kit products with status `Skip...` are never imported. By default only `Waiting: price`, `Waiting: Shoes category` and `Waiting: Luggage category` are imported.

## Usage

```bash
# 1. Check everything, upload nothing
node tools/bulk-import/import.mjs --kit "<kit>/work/products.json" --api http://localhost:8081/api --dry-run

# 2. A few products first
node tools/bulk-import/import.mjs --kit "<kit>/work/products.json" --api http://localhost:8081/api \
     --email admin@example.com --create-stores --limit 5

# 3. The rest (resumes automatically)
node tools/bulk-import/import.mjs --kit "<kit>/work/products.json" --api http://localhost:8081/api \
     --email admin@example.com --create-stores
```

| Option | Meaning |
|---|---|
| `--only P001,P014` | Import specific kit products |
| `--create-stores` | Create a store for a category that has none (otherwise the first existing store of that category is used) |
| `--state <file>` | Custom progress file |

## Notes

- Products with colour variants get one cover image plus per-colour image sets; products without variants get all their images.
- Prices from the kit are sent if present, but products are still created as drafts. Publishing is a separate, deliberate step.

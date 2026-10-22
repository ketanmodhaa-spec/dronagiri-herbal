# Database Backups

Nightly at 02:30 IST, GitHub Actions dumps the Neon `production` branch, compresses and encrypts it,
and uploads it to the private R2 bucket `dronagiri-backups` under `neon/production/`.
Workflow: `.github/workflows/nightly-db-backup.yml`.

Dumps hold customer names, phones and addresses. They are encrypted with [age](https://age-encryption.org)
to a public key — GitHub can write backups but can never read them. Only the private key can decrypt.

---

## One-time setup

### 1. Encryption key (on your own computer — never on a server)

```bash
age-keygen -o dronagiri-backup.key
```

It prints `Public key: age1...` — that line is the **recipient**.
Keep `dronagiri-backup.key` in a password manager **and** an offline copy (printed or USB).
Lose it and every backup is unreadable.

### 2. Private R2 bucket

Cloudflare → R2 → **Create bucket** `dronagiri-backups`.
- Leave public access **off** (no r2.dev URL, no custom domain).
- Settings → **Object lifecycle rules** → add a rule: prefix `neon/production/`, delete objects after **30 days**.

Cloudflare → R2 → **Manage API tokens** → create token:
- Permission: **Object Read & Write**, scoped to `dronagiri-backups` only.
- Not the website's R2 token — the website must not reach backups, and backups must not reach product images.

### 3. GitHub repository secrets

GitHub → repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Value |
|---|---|
| `NEON_DIRECT_URL` | Production **direct** (non-pooled) connection string — the host without `-pooler` |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BACKUP_ACCESS_KEY_ID` | From the token in step 2 |
| `R2_BACKUP_SECRET_ACCESS_KEY` | From the token in step 2 |
| `BACKUP_AGE_RECIPIENT` | The `age1...` public key from step 1 |

Store values raw — no quotes.

### 4. First run

GitHub → Actions → **Nightly Neon Backup** → **Run workflow**. Check the run summary shows the file,
then do a test restore (below) once. GitHub emails the repo owner when a scheduled run fails.

---

## Restore

Restore into a **new Neon branch first**, check it, then decide. Never restore straight over production.

```bash
# 1. Download (R2 dashboard → dronagiri-backups → neon/production/ → pick a file → Download)

# 2. Decrypt and unpack
age --decrypt -i dronagiri-backup.key dronagiri-2026-10-22_21-00-05.sql.gz.age | gunzip > restore.sql

# 3. Neon console → Branches → Create branch (empty, or from production) → copy its direct URL
psql "<new-branch-direct-url>" -v ON_ERROR_STOP=1 -f restore.sql

# 4. Delete restore.sql when done — it is plaintext customer data
```

Restoring onto a branch that already has the schema fails on existing tables — use an empty branch,
or a fresh database on the branch.

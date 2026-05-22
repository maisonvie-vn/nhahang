# Maison Vie — "Le Voyage" · Deploy Guide

A 4-language landing page with a Supabase-backed reservation form, plus a
staff dashboard and an optional email-notification Edge Function.

---

## Files

| File | Purpose |
|------|---------|
| `le-voyage.html` | The public website (rename to `index.html` when you upload). |
| `dashboard.html` | Private staff page to view & manage reservations. |
| `supabase-setup.sql` | Creates the `reservations` table + access policies. |
| `notify-reservation.ts` | Edge Function — emails staff on each new booking (optional). |
| `DEPLOY-GUIDE.md` | This file. |

---

## STEP 1 — Supabase (database)

1. Go to **supabase.com** → create account → **New Project**.
2. **SQL Editor → New query** → paste all of `supabase-setup.sql` → **Run**.
3. **Project Settings → API** → copy:
   - **Project URL** — `https://xxxx.supabase.co`
   - **anon public** key — `eyJ...`
4. Paste BOTH values into the CONFIG block of **`le-voyage.html`** AND **`dashboard.html`**:
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGci...";
   ```
5. Go to your Supabase Dashboard → **Authentication → Users** → Click **Add User → Create User** (Email & Password):
   - Enter your staff email (e.g. `admin@maisonvie.vn`) and a secure password (e.g. `@989091383Urmylove@`).
   - Uncheck **Auto-confirm User** or **Send email confirmation** (so the account is active immediately without needing email validation), then click **Save**.

> Without keys, both pages run in DEMO mode (form validates but doesn't save;
> dashboard shows sample rows using `admin@maisonvie.vn` / `@989091383Urmylove@`).

---

## STEP 2 — GitHub

1. Create a repo (e.g. `maison-vie-web`).
2. Upload **`le-voyage.html` renamed to `index.html`**.
3. Upload **`dashboard.html`** as-is.

---

## STEP 3 — Vercel (publish)

1. **vercel.com** → sign in with GitHub → **Add New → Project** → import the repo → **Deploy**.
2. Live URLs:
   - Website: `https://your-project.vercel.app/`
   - Dashboard: `https://your-project.vercel.app/dashboard.html`
3. (Optional) Add a custom domain in Vercel → Settings → Domains.

Every push to GitHub auto-redeploys.

---

## STEP 4 — Email notifications (optional, recommended)

Get an email at `info@maisonvie.vn` whenever a booking comes in.

1. Sign up at **resend.com** (free 100/day) → create an API key.
   Verify a sender domain/address (e.g. `info@maisonvie.vn`).
2. Install the Supabase CLI, then from the folder containing the function:
   ```bash
   supabase functions deploy notify-reservation --no-verify-jwt
   ```
   (Or paste the code in Supabase → Edge Functions → New Function.)
3. Supabase → **Project Settings → Edge Functions → Secrets** add:
   ```
   RESEND_API_KEY = re_xxxxxxxx
   NOTIFY_TO       = info@maisonvie.vn
   NOTIFY_FROM     = info@maisonvie.vn
   ```
4. Supabase → **Database → Webhooks → Create**:
   - Table: `reservations` · Event: **INSERT**
   - Type: **Supabase Edge Function** → choose `notify-reservation`.

Prefer a different provider (SendGrid/Mailgun)? Edit the `EMAIL SENDING`
block in `notify-reservation.ts`.

---

## Things to customise

- **Photos** — gallery + signature dishes currently use placeholder images
  (Pearl / maisonvie.vn). Replace the `src="..."` links with your own.
- **WhatsApp** — quick-book button points to `+84 904 150 383`. To change it,
  edit `const WA_NUMBER` in `le-voyage.html`.
- **Signature dishes** — search `sig1_name`, `sig2_name`, etc.

---

## Security note on the dashboard

The dashboard is fully secured using **Supabase GoTrue Authentication** and strict **Row-Level Security (RLS)**:
- Anonymous public users can only **INSERT** reservations into the database (`to anon` role). They cannot retrieve, view, or update any entries.
- Only logged-in staff accounts (`to authenticated` role) have permission to **SELECT** (view) and **UPDATE** (change status/manage) reservations.
- Even if a user inspects the HTML source code, they will only see the public anonymous keys, which are completely locked out of reading or modifying data without a valid user session.

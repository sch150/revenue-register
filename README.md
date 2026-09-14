# Revenue Register — web app

A single-file web app that replicates your paper Revenue Register (date, cash,
cheque, running balance) — now multi-branch, multi-user, with a cheques
register and a cascading debtors ledger.

## What's in this version

- **Branches.** Onboard each office/location under Admin → Branches. Every
  register entry, debtor, deposit and momo confirmation is tagged to a branch,
  and the Daily Register keeps a separate running balance per branch (as a
  real cash book would).
- **Users — Admin & Finance Officer.** First launch asks you to create the
  Admin account. Admins create Finance Officer accounts and assign each one to
  a branch; a Finance Officer only ever records data into their own branch.
  Admins can see and switch between all branches. Log in from the picker
  screen with your name + PIN; log out from the sidebar.
- **Daily Register entry** is a spreadsheet-style grid: pick the line type and
  department/customer from dropdowns, type the amounts, press **Enter** to
  save the line and jump straight into a fresh blank row. Date and line type
  stick between rows so entering several department sales in a row is just
  Enter, Enter, Enter. Existing lines edit in place via the pencil icon.
- **Multiple cheques per line.** When a line can carry a cheque (a sale or a
  payment on account), the Cheque cell becomes a button. It opens a small
  form: "Multiple cheques? N (single) / Y (multiple)", then one row per
  cheque — date received, drawer/customer, bank drawn on, cheque number,
  amount, due date. Save and the cell collapses back to just the total.
- **Cheques Register** (its own tab) lists every cheque captured through the
  register, with a status (Pending / Overdue / Presented), a Daily / Weekly /
  Date-range filter for "due for presentation", and a checkbox to mark a
  cheque as presented. Exportable to CSV for whichever window you're viewing.
- **Debtors**, cascading: all debtors (admin, across every branch) → a branch
  → a sales department within that branch — each level down is one click.
  Click a debtor's name for a full statement (opening balance, every payment
  recorded against them through the register, and any manual adjustments,
  with a running balance). Admins can record manual adjustments (e.g. a new
  credit sale from another system) directly on the statement.
- **Debtors upload.** Import an initial list from Excel (.xlsx/.xls) or CSV —
  columns `name, contact, branch, department, balance, notes`. Unrecognised
  branch names are created automatically. After that, "Payment on account" and
  "Direct transfer" lines typed into the Daily Register look up the debtor by
  name (creating a new debtor record on the fly if needed) and reconcile
  their balance automatically.
- **Backup.** Settings → Backup downloads a dated `.json` file to your
  computer, and the same screen restores from one. The Dashboard reminds you
  if it's been a few days since your last backup.

The interface uses a dark, terminal/till-style theme (monospace numerals,
phosphor-green accent) rather than a generic light dashboard look.

## First run

1. Open `index.html`. You'll be asked to create the Admin account (name + PIN).
2. Go to **Branches** and add your office locations.
3. Go to **Users** and add a Finance Officer per branch (name, PIN, branch).
4. Everyone logs in from the picker screen with their name + PIN from then on.

Files in this folder:

| File | Purpose |
|---|---|
| `index.html` | The whole app. Open it directly in a browser, or host it. |
| `google-apps-script.gs` | Optional backend script for syncing to a Google Sheet. |
| `README.md` | This file. |

Data is stored in the browser's local storage by default — it works fully
offline with no setup. Google Sheets sync (below) is optional, for backup and
for sharing the data across devices/staff.

---

## 1. Use it right away (no setup)

Just open `index.html` in Chrome/Safari/Edge on your phone, tablet or PC.
Everything is saved to that browser automatically. Use **Settings → Export
backup** regularly, and before clearing browser data or switching devices.

## 2. Put it on GitHub Pages (a link you can open from anywhere)

1. Create a new repository on GitHub (e.g. `revenue-register`).
2. Upload `index.html` (and this README) to the repository — either drag-and-drop
   in the GitHub web UI ("Add file → Upload files"), or via git:
   ```
   git init
   git add index.html README.md google-apps-script.gs
   git commit -m "Revenue register app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/revenue-register.git
   git push -u origin main
   ```
3. In the repository: **Settings → Pages → Build and deployment → Deploy from
   a branch**, choose `main` and `/ (root)`, then Save.
4. GitHub gives you a URL like `https://YOUR-USERNAME.github.io/revenue-register/`.
   Open it, bookmark it, or add it to your phone's home screen.

Because everything runs in the browser, GitHub Pages (a static host) is enough —
no server needed for the app itself.

## 3. Connect Google Sheets (optional, for sync & backup)

This lets you push your data into a Google Sheet (readable tables plus a raw
backup), and pull it back down on another device. It uses a small Google Apps
Script "Web App" as the bridge — GitHub Pages can't talk to Google Sheets
directly, so the script stands in as a simple API.

**Set it up once:**

1. Create a new Google Sheet (e.g. "Revenue Register Data").
2. In the Sheet, go to **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of
   `google-apps-script.gs` from this folder.
4. Near the bottom, find `setSharedSecretOnce()`. Replace `YOUR-SECRET-HERE`
   with a password only you and your admin know, e.g. `'Kwabena-2026-secret'`.
5. With `setSharedSecretOnce` selected in the function dropdown, click **Run**.
   The first time, Google will ask you to authorize the script — approve it.
   This only needs to run once (it stores the secret so the web app can check it).
6. Click **Deploy → New deployment**. Choose type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
   - Click **Deploy**, then **Authorize access** again if asked.
7. Copy the **Web app URL** it gives you (ends in `/exec`).

**Connect the app:**

1. Open the Revenue Register app → **Settings & Sync**.
2. Paste the Web App URL into "Web App URL".
3. Paste the same secret you set in step 4 above into "Shared secret".
4. Click **Save connection**, then **Push to Google Sheets** to do your first sync.

From then on:
- **Push** sends what's on this device up to the Sheet (and overwrites the Sheet's copy).
- **Pull** brings down whatever is in the Sheet (and overwrites this device's copy).
- The Sheet will grow four tabs automatically: `Register`, `Customers`,
  `Deposits`, `MomoConfirmations` (readable tables), plus a hidden `AppData`
  tab holding the raw backup used for Pull.

**Note on security:** the shared secret keeps casual visitors out, but anyone
who has both the Web App URL and the secret can read/write the sheet — treat
them like a password. For stronger control, restrict "Who has access" to your
Google Workspace domain instead of "Anyone with the link" in step 6.

## 4. Chart of accounts

The **Chart of Accounts** tab (Admin/Reviewer) is pre-loaded with the bank
accounts and mobile money wallets from your uploaded chart of accounts
(`Chart_of_Accounts_2026-09-07.xlsx`), scoped to the accounts relevant to
deposits and momo confirmations:

- **Bank accounts** — ABSA, ADB (Ridge & Adum), EcoBank, Stanbic, OMNIBSIC (Cedi,
  USD, Euro accounts) — used when logging a deposit.
- **Mobile money wallets** — Accra Mobile Money, Kumasi Mobile Money — used when
  logging a momo confirmation.
- **Cash locations** — Petty Cash (Accra/Kumasi), Cash on Hand — kept for
  reference.

Add, rename, or remove accounts any time from that tab; changes apply
immediately to the dropdowns in Deposits and Mobile Money Confirmations.

## 5. Admin / Reviewer access

Deposit Confirmations, Mobile Money Confirmations, and Chart of Accounts sit
behind a PIN (set on first use from any of those tabs, or from Settings). This
is a simple on-device lock for a shared computer or tablet — it is **not**
encryption, so don't rely on it if the device itself is not otherwise secured.

## 6. Customers / Debtors

The Customers tab is intentionally flexible: add customers one at a time, or
import a CSV with columns `name, contact, department, balance, notes` once
you have your full debtors list ready. "Delete one" and "Delete all" are both
available so you can clear test data as you go. Customer names entered here
appear as suggestions when recording a "Payment on account" or "Direct
transfer" line in the Daily Register.

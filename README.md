# Gym Tracker

## First Verion
A private, offline-first gym and body tracker. All data is stored **on your device**
(IndexedDB) — no account, no cloud, no server.

## Features

- Log workouts: exercise, weight, reps — with your last used weight prefilled
- Weight progression chart per exercise
- Spot neglected exercises (longest time since last performed)
- Gym visit counts per week / month / year
- Body weight tracking with trend chart
- Installable PWA: works fully offline at the gym (iPhone home screen / Mac dock)
- Backup: export/import all data as a JSON file (share to iCloud Drive / AirDrop)

## Development

```sh
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # type-check + production build to dist/
npm run lint       # oxlint
npm run icons      # regenerate PWA icons (macOS only, uses sips)
```

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and
publishes it to GitHub Pages. One-time setup on GitHub:

1. Create a repository and push this project.
2. Repo → Settings → Pages → Source: **GitHub Actions**.

The site is then served at `https://<user>.github.io/<repo>/`. Only the app code is
published — your training data never leaves your device.

## Using it on iPhone + Mac

1. Open the deployed URL in Safari on the iPhone → Share → **Add to Home Screen**.
   Installing is important: it makes the app work offline **and** exempts its data
   from Safari's automatic cleanup of unused website data.
2. On the Mac, use the same URL in any browser (or Safari → File → Add to Dock).
3. Each device has its own local copy of the data. To move data between devices:
   Settings → **Export backup** (save to iCloud Drive or AirDrop), then
   **Import backup** on the other device. Import replaces the data on that device,
   so treat one device (e.g. the iPhone) as the source of truth.

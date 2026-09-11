# Crane Clearance Checker (Trimble Connect 3D Viewer extension)

Read `PLAN.md` first — it covers what's actually confirmed about the Trimble
Connect Workspace API and the (nonexistent) 3D Warehouse public API, and why
this scaffold is shaped the way it is.

## What this scaffold does

- A side-panel UI (`index.html` + `src/main.ts`) that connects to Trimble
  Connect via the Workspace API.
- Opens 3D Warehouse in a new tab for manual browse/download (no public API
  to hook into — see `PLAN.md` §2.2).
- Lists and places models already in the current project (`viewer.getModels`,
  `viewer.toggleModel`, `viewer.placeModel`).
- Generates a crane "swing envelope" solid (`src/geometry/swing-envelope.ts`)
  as a plain `.obj` file you import through Connect's normal upload pipeline,
  for use in a native Clash Set clearance check.

## What it does NOT do yet

- It doesn't upload files into the project for you — Connect's own
  upload UI handles that today. Scripting the upload is a good next step
  once you've confirmed the Core REST API's file-upload endpoint against a
  live developer account (see `PLAN.md` §2.3).
- It doesn't create or run Clash Sets — that's a one-time manual setup in
  Connect's Clashes panel per `PLAN.md` §3 step 5, for the same reason.
- It doesn't animate the crane swinging — that's the phase-2 stretch goal in
  `PLAN.md` §3 step 6.

## The manifest schema (confirmed)

Trimble's real schema, from the published `ExtensionSetting` reference
(<https://components.connect.trimble.com/trimble-connect-project-workspace-api/docs/interfaces/extensionsetting.html>),
has exactly six fields:

| field | required? |
|---|---|
| `title` | **required** |
| `url` | **required** |
| `description` | optional |
| `icon` | optional |
| `enabled` | optional (boolean) |
| `configCommand` | optional |

There's no `name`, `extensionType`, `vendor`, `id`, or `version` field — an
earlier version of this scaffold's `manifest.json` used `name` instead of
`title`, which is why Connect rejected it as "not a valid extension" (it
fetches and validates the manifest, and `title` was missing). `manifest.json`
in this scaffold now matches the confirmed schema.

## Setup

```bash
npm install
npm run dev      # local dev server, for iterating on the UI in isolation
npm run build    # produces dist/ for deployment
```

**You must deploy the built `dist/` output, not the raw repo.** `index.html`
loads `/src/main.ts` as a module — that's TypeScript, and browsers can't
execute it directly. Serving the repo's source files as-is (e.g. GitHub
Pages pointed at the repo root) will load a page with no working JavaScript.

### Deploying via GitHub Pages (GitHub Actions)

This scaffold includes `.github/workflows/deploy.yml`, which builds the
project with Vite and publishes `dist/` automatically on every push to
`main`. To use it:

1. In your repo, go to **Settings → Pages → Build and deployment → Source**
   and set it to **GitHub Actions** (not "Deploy from a branch" — that would
   serve the raw source again).
2. Put any static assets the manifest references (like an icon) in
   `public/` — Vite copies everything in `public/` verbatim into `dist/`.
   If you already have `crane.png` at the repo root, move it to
   `public/crane.png`.
3. Check `vite.config.ts` — `base` must match your GitHub Pages URL path
   (`/<repo-name>/` for a project site). It's currently set for a repo named
   `Clearance-Warehouse`; update it if your repo is named differently.
4. Push to `main`. The Actions tab will show the build/deploy run; once it's
   green, your manifest and panel URLs
   (`https://<user>.github.io/<repo>/manifest.json` /
   `.../index.html`) will be serving the real built app.

Any other static HTTPS host (Netlify, Vercel, etc.) works too — just deploy
`dist/` after `npm run build`; they don't need the GitHub Actions workflow
or the `base` path adjustment (Netlify/Vercel serve from the domain root).

5. Edit `manifest.json`'s `url` and `icon` to your real deployed URLs.
6. In Trimble Connect for Browser, open a project you admin, go to
   **Project Settings → Apps & Capabilities → Add Custom**, and enter your
   `manifest.json` URL.
7. Open the project's 3D Viewer — the panel should appear as a side panel
   extension.

## Before you trust the Workspace API calls

`src/workspace.ts` and `src/main.ts` are flagged inline wherever a call's
exact signature wasn't independently verifiable through public docs during
this build (mainly the `connect()` bootstrap and the exact `placeModel`
payload shape). Once you `npm install`, check
`node_modules/trimble-connect-workspace-api`'s type declarations and
Trimble's example app at
<https://components.connect.trimble.com/trimble-connect-workspace-api/examples/index.html>,
and adjust as needed. The method *names* (`getModels`, `toggleModel`,
`placeModel`, `getObjectBoundingBoxes`, `setSelection`, `getObjects`,
`addTrimbimModel`, etc.) are confirmed from Trimble's published API
reference — it's only the call *shapes* that need a final check.

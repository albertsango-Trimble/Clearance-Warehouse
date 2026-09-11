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

## Setup

```bash
npm install
npm run dev      # local dev server, for iterating on the UI in isolation
npm run build    # produces dist/ for deployment
```

1. Deploy `dist/` (after `npm run build`) to any static HTTPS host — Netlify,
   Vercel, GitHub Pages, etc. all work fine for development. The manifest and
   panel URL must be HTTPS and CORS-enabled.
2. Edit `manifest.json`: replace `REPLACE_WITH_YOUR_DEPLOYED_URL` with your
   real deployed URL, and re-verify the field names (`extensionType`, `url`,
   `icon`, `description`) against Trimble's current manifest schema at
   <https://developer.trimble.com/docs/connect/tools/api/workspace> — this
   scaffold's manifest is built from a summarized read of that page, not the
   literal schema, so double-check before registering.
3. In Trimble Connect for Browser, open a project you admin, go to
   **Project Settings → Apps & Capabilities**, and add your manifest URL as
   a custom extension.
4. Open the project's 3D Viewer — the panel should appear as a side panel
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

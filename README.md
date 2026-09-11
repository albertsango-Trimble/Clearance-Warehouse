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

## Setup — plain JS, no build step (use this one)

`index.html` now loads `src/main.js` — plain JavaScript, not TypeScript —
plus the real Trimble Connect Workspace API library straight from a CDN:

```html
<script src="https://unpkg.com/trimble-connect-workspace-api@0.3.34/dist/iife/trimbleconnect.workspace.api.js"></script>
<script src="./src/main.js"></script>
```

That means **you can deploy the raw repo as-is** — no `npm install`, no
build, no GitHub Actions, no Pages source setting to change. Whatever's
committed to `main` is what runs. If you've deployed via GitHub Pages
pointed at the repo root (the default "Deploy from a branch" setting),
you're done as soon as `index.html`, `src/main.js`, and a fixed
`manifest.json` (see below) are pushed.

The old TypeScript files (`src/main.ts`, `src/workspace.ts`,
`src/geometry/swing-envelope.ts`) and the Vite/GitHub Actions setup
(`vite.config.ts`, `.github/workflows/deploy.yml`) are still in this
scaffold as an *optional* upgrade path — useful later if you want real
type-checking and a proper dev workflow — but they're not needed to get
this working. Ignore them for now; `src/main.js` has the identical logic
and has been checked (syntax-checked with Node, and the swing-envelope
geometry re-tested to produce the same output) to match.

### To fix your live deployment

1. Push the updated `index.html` and add `src/main.js` (both in this
   scaffold) to your repo.
2. Fix `manifest.json` — same required field as before:

   ```json
   {
     "title": "Crane Clearance Checker",
     "description": "Import a crane model, place it, and generate a swing-envelope solid for clearance checking against your design.",
     "url": "https://<your-username>.github.io/<your-repo>/index.html",
     "icon": "https://<your-username>.github.io/<your-repo>/crane.png"
   }
   ```
3. Wait a minute for GitHub Pages to redeploy, then in Trimble Connect
   remove the existing "Crane Clearance Checker" extension entry entirely
   (not just toggle it off) and re-add it with the manifest URL — we saw
   earlier that Trimble Connect can hold onto a stale manifest snapshot
   from a prior registration, so a plain page refresh isn't always enough.
4. In Trimble Connect for Browser, open a project you admin, go to
   **Project Settings → Apps & Capabilities → Add Custom**, and enter your
   `manifest.json` URL.
5. Open the project's 3D Viewer — the panel should appear as a side panel
   extension, and its buttons should now actually respond.

## Before you trust the Workspace API calls

`src/main.js` is flagged inline wherever a call's exact signature wasn't
independently verifiable through public docs during this build (mainly the
exact `placeModel` payload shape). The `TrimbleConnectWorkspace.connect(targetWindow, eventHandler, timeout)`
bootstrap call and its global name *are* confirmed — pulled directly from
the published package's actual IIFE bundle on unpkg, not guessed. The
ViewerAPI method *names* (`getModels`, `toggleModel`, `placeModel`,
`getObjectBoundingBoxes`, `setSelection`, `getObjects`, `addTrimbimModel`,
etc.) are confirmed from Trimble's published API reference — it's only a
couple of call *shapes* that need a final check against a live project.

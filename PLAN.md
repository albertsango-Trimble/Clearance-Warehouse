# Crane Clearance Checker — a Trimble Connect 3D Viewer extension

**Goal:** a side-panel extension in Trimble Connect for Browser's 3D Viewer that lets you bring in a crane model (sourced from SketchUp's 3D Warehouse), place it on your design, and check swing clearance against the rest of the model.

This document is the feasibility check and build plan. It's based on Trimble's and SketchUp's own public documentation (linked throughout) rather than assumption — where something isn't confirmed by a public source, it's called out explicitly as a risk to verify against a live developer account.

---

## 1. Verdict

Buildable, with one real constraint: **there is no public 3D Warehouse API**, confirmed across multiple SketchUp community threads and staff replies going back years. So "search 3D Warehouse from inside the extension and auto-place the result" isn't available as a one-click flow. The realistic version is: browse/download from 3D Warehouse the normal way (a browser tab, not a scraped API), then let the extension handle import, placement, and clearance checking, which *is* well supported by Trimble Connect's real, documented Workspace API and its native clash/clearance engine.

That's a fully legitimate, ToS-safe extension — it's just "assisted import" rather than "in-panel search."

---

## 2. What's actually confirmed

### 2.1 Trimble Connect Workspace API (real, documented, browser-only)

- Docs: [developer.trimble.com/docs/connect/tools/api/workspace](https://developer.trimble.com/docs/connect/tools/api/workspace), [Workspace API reference](https://components.connect.trimble.com/trimble-connect-workspace-api/index.html), npm package [`trimble-connect-workspace-api`](https://www.npmjs.com/package/trimble-connect-workspace-api).
- Extensions are iframed panels registered against a project via a **manifest URL** (JSON: extension URL, name, icon, description, `extensionType: "3dviewer" | "project"`). A project admin adds the manifest URL under **Project Settings → Apps & Capabilities**. The manifest URL must be served over HTTPS and be CORS-enabled, since Connect fetches it directly.
- Communication is `window.postMessage()` under the hood; the npm package wraps this.
- Auth: the extension calls `extension.requestPermission()`, the user sees a consent prompt, and on approval Connect emits an `extension.accessToken` event. Tokens can expire mid-session (`extension.sessionInvalid`), so the panel needs to handle re-requesting.
- Relevant `ViewerAPI` methods confirmed from the reference docs:
  - `getModels` / `getLoadedModel` / `toggleModel` / `toggleModelVersion` — list and load/unload models already in the project's file tree.
  - `placeModel` — sets a model's placement (position/rotation) asynchronously. This is the mechanism for "positioning the crane," and also what a hand-rolled swing animation would call repeatedly.
  - `addTrimbimModel` — adds a small model **already in Trimble's proprietary `.trimbim` binary format** (≤10MB) directly into the scene without going through the project file tree. Useful in principle, but see the limitation in §4 — we can't easily *author* `.trimbim` files ourselves, only consume ones exported by Trimble's own tools.
  - `getObjectBoundingBoxes` — per-object bounding boxes by runtime ID (the building block for any custom clearance math).
  - `setSelection` / `getSelection` / `setObjectState` / `getObjects` / `isolateEntities` — selection, visibility, and querying by criteria.
  - `setCamera` / `getCamera` / `setCameraMode` / `getSnapshot` — camera control and screenshots.
  - No dedicated "rotate this object over time" or animation method exists — an animated swing has to be hand-rolled as a loop of `placeModel` calls.

### 2.2 SketchUp 3D Warehouse — no public API

- SketchUp community threads confirm this directly: ["Unfortunately there does not (yet) exist a public API for 3D Warehouse (although often requested!)"](https://forums.sketchup.com/t/integrate-warehouse-using-apis/98593), and a separate 2022 thread noting an undocumented internal API exists but "if it's not documented, it's probably not a public API" ([3dwarehouse-api](https://forums.sketchup.com/t/3dwarehouse-api/201774)).
- The same thread flags that scripting against the undocumented internal JSON "could violate the data scraping section" of the [3D Warehouse Terms of Use](https://help.sketchup.com/en/3d-warehouse/3d-warehouse-terms-use-faq).
- Given your answer, the extension will **not** attempt that internal API. It'll link/open the 3D Warehouse site for normal manual browsing and downloading.
- Practical note: `3dwarehouse.sketchup.com` will very likely refuse to render inside an `<iframe>` (most sites like this set `X-Frame-Options`/`frame-ancestors`). Budget for "Browse 3D Warehouse" opening a **new browser tab**, not a true embedded panel — I'll build it that way from the start rather than discovering the block later.

### 2.3 Clash/clearance detection is a real, native Connect feature

- Trimble Connect's 3D Viewer has built-in **Clash Sets**, which explicitly support both "clash" (overlap) and "**clearance**" (objects within some minimum distance) checks: [Creating Clash Sets](https://docs.3d.connect.trimble.com/clashes/creating-clash-sets), [Viewing Clashes](https://docs.3d.connect.trimble.com/clashes/viewing-clashes), [Re-running Clash Sets](https://docs.3d.connect.trimble.com/clashes/re-running-clash-sets).
- This is exactly the "clearance to design files" check you described, and it's a cloud-run engine, not something to reimplement with bounding-box math.
- What's **not confirmed** from public docs is whether clash sets can be created/run via the REST API (vs. UI-only). The [Core API overview](https://developer.trimble.com/docs/connect/tools/api/core/) mentions the clash engine conceptually but the publicly-crawlable pages don't show a documented endpoint for it. Treat this as **unverified — needs checking against Trimble's OpenAPI spec from an authenticated developer account**, or a question to `connect-support@trimble.com`. The plan below is designed to work either way (manual one-time setup in the UI, or scripted later if the endpoint turns out to exist).

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Trimble Connect for Browser — 3D Viewer                 │
│                                                           │
│  ┌───────────────────────┐   ┌──────────────────────┐   │
│  │  Your design project   │   │  Crane Clearance      │   │
│  │  (existing model tree) │   │  Checker — side panel │   │
│  │                         │   │  (this extension)     │   │
│  └───────────────────────┘   └──────────┬────────────┘   │
│                                          │ Workspace API   │
│                                          │ (postMessage)   │
└──────────────────────────────────────────┼───────────────┘
                                            │
                          window.open() ────┴──── 3D Warehouse
                          (new tab, manual browse/download)
```

**Workflow:**

1. **Get the crane model.** Panel has a "Browse 3D Warehouse" button → opens `3dwarehouse.sketchup.com` in a new tab. You search, preview, and download a model (Collada `.dae`/`.zip` is the most broadly-supported export; `.skp` also works since Connect ingests SketchUp files natively).
2. **Import it into the project.** Upload the downloaded file into the current Connect project's Files the normal way (drag-and-drop in Connect, or scripted later once the upload endpoint is verified). Connect auto-converts it into a viewable model — this is standard Connect behavior for the 60+ CAD formats it ingests, not something the extension needs to build.
3. **Place it.** Once converted, the panel calls `viewer.getModels()` to find it, `viewer.toggleModel()` to load it into the current view, and `viewer.placeModel()` to set its position/rotation at the crane's pick point (you'll type in or pick coordinates — precise placement is worth a dedicated UI step, see Milestone 3 below).
4. **Generate the swing envelope.** Instead of animating the crane and eyeballing clashes frame by frame, the panel generates a single static solid — a wedge/cylinder representing the *full swept volume* of the boom (radius = boom reach, height = boom min/max elevation, angle = slew range, up to a full 360°). This is exported as an `.obj` file (§4 explains why not `.trimbim`), which you import exactly like any other model (step 2/3 above).
5. **Run the clearance check.** In Connect's native Clashes panel, create one Clash Set: swing-envelope solid vs. your design/site model, set to "clearance" mode with your minimum distance. This is a **one-time manual setup per project** given the current unverified API status (§2.3) — after that it's rerunnable from the UI, and the extension can deep-link you there.
6. **(Stretch) Animate it.** Once the static check works, add a "Play swing" button: a loop that calls `placeModel` on the crane model at incrementing slew angles (e.g. every 2°) and, at each step, calls `getObjectBoundingBoxes` on the crane vs. nearby design objects to flag close approaches live. This is genuinely hand-rolled — there's no native rotate/animate call — so it's scoped as a phase 2, after the reliable static check is working.

---

## 4. Known limitations (read before building)

- **No in-panel 3D Warehouse search.** By your own choice (ToS-safe), this is a "browse externally, import manually" flow, not a search box inside the panel. If Trimble ever ships a public 3D Warehouse API this becomes a much smaller lift to upgrade.
- **`.trimbim` is not an authoring format for us.** It's Trimble's own binary format — Connect for Windows can *export* a model to `.trimbim` ([Export as TrimBIM](https://docs.windows.connect.trimble.com/models/export-as-trimbim)), but there's no public spec for *writing* one from scratch. That rules out generating the swing envelope directly as a `.trimbim` fed through `addTrimbimModel`. Practical workaround: generate it as `.obj` (plain geometry, well-understood, this scaffold does it) and push it through the same upload → auto-convert pipeline as any other model. `addTrimbimModel` stays useful later only for genuinely small, pre-converted `.trimbim` payloads (e.g. if you use Connect for Windows to pre-bake something).
- **Clash-set automation is unverified.** See §2.3 — assume manual UI setup unless/until you confirm the REST endpoint exists.
- **Extension registration needs project-admin access** and a hosted, HTTPS, CORS-enabled URL for the manifest and panel — this can't run purely from your local machine without deploying it somewhere (even a free static host works for development).
- **Desktop (Windows) is out of scope for this build** per your answer — the Workspace API and this extension model target Trimble Connect for Browser specifically.

---

## 5. Suggested build order

1. **Milestone 0 — plumbing:** deploy the scaffold (even to a throwaway static host), register it as a project extension, confirm the panel loads and `extension.requestPermission()` succeeds. This alone validates the whole integration path before any crane logic exists.
2. **Milestone 1 — model placement:** import one 3D Warehouse crane manually, get `getModels`/`toggleModel`/`placeModel` working from the panel so you can position it numerically.
3. **Milestone 2 — swing envelope:** build the envelope generator UI (boom length, min/max elevation, slew start/end angle) and confirm the exported `.obj` imports and looks right against a real project.
4. **Milestone 3 — clearance check:** create the Clash Set manually against a real design file, confirm the "clearance" mode and distance threshold give you what you need; have the panel deep-link into the Clashes UI.
5. **Milestone 4 (stretch) — animated swing** with live bounding-box checks, per §3 step 6.

---

## 6. Prerequisites checklist

- A Trimble Connect account with **admin rights on at least one project** (to register the extension).
- A place to host the panel (static HTTPS hosting — Netlify/Vercel/GitHub Pages/etc. all work for development).
- Node.js for the scaffold (`npm install` / `npm run dev` / `npm run build`).
- A downloaded 3D Warehouse crane model to test with (Collada or SKP).

---

## 7. References

- [Trimble Connect Workspace API](https://developer.trimble.com/docs/connect/tools/api/workspace)
- [Workspace API reference (ViewerAPI etc.)](https://components.connect.trimble.com/trimble-connect-workspace-api/index.html)
- [`trimble-connect-workspace-api` on npm](https://www.npmjs.com/package/trimble-connect-workspace-api)
- [Extend the 3D Viewer](https://help.trimble.com/en/trimble-connect/trimble-connect/connect-for-browsers-3d-viewer/getting-started-in-the-3d-viewer/extend-the-3d-viewer)
- [Trimble Connect Core API overview](https://developer.trimble.com/docs/connect/tools/api/core/)
- [Creating Clash Sets](https://docs.3d.connect.trimble.com/clashes/creating-clash-sets) / [Viewing Clashes](https://docs.3d.connect.trimble.com/clashes/viewing-clashes) / [Re-running Clash Sets](https://docs.3d.connect.trimble.com/clashes/re-running-clash-sets)
- [Export as TrimBIM (Connect for Windows)](https://docs.windows.connect.trimble.com/models/export-as-trimbim)
- [3D Warehouse Terms of Use FAQ](https://help.sketchup.com/en/3d-warehouse/3d-warehouse-terms-use-faq)
- SketchUp community on the missing public API: [Integrate Warehouse using APIs](https://forums.sketchup.com/t/integrate-warehouse-using-apis/98593), [3Dwarehouse API](https://forums.sketchup.com/t/3dwarehouse-api/201774)

import { getWorkspaceApi } from "./workspace";
import { generateSwingEnvelopeObj, triggerObjDownload } from "./geometry/swing-envelope";

const statusEl = document.getElementById("status") as HTMLDivElement;
const modelSelect = document.getElementById("model-select") as HTMLSelectElement;

function setStatus(msg: string) {
  statusEl.textContent = msg;
  console.log("[status]", msg);
}

// --- 1. Browse 3D Warehouse -------------------------------------------------
// No public 3D Warehouse API exists (see PLAN.md §2.2), so this opens the
// real site in a new tab rather than attempting to embed/scrape it. Their
// site almost certainly blocks framing anyway.
document.getElementById("browse-warehouse")?.addEventListener("click", () => {
  window.open("https://3dwarehouse.sketchup.com/", "_blank", "noopener");
  setStatus(
    "Opened 3D Warehouse in a new tab. Download your model (Collada .dae or " +
      ".skp), then upload it into this project's Files. Once it's finished " +
      "converting, hit “Refresh model list” below.",
  );
});

// --- 2. Place the crane model ----------------------------------------------
document.getElementById("refresh-models")?.addEventListener("click", async () => {
  try {
    setStatus("Loading model list...");
    const api = await getWorkspaceApi();
    // ViewerAPI.getModels() — confirmed method, see PLAN.md §2.1.
    const models = await api.viewer.getModels();
    modelSelect.innerHTML = "";
    for (const model of models as Array<{ id: string; name: string }>) {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.name;
      modelSelect.appendChild(opt);
    }
    setStatus(`Found ${models.length} model(s) in this project.`);
  } catch (err) {
    setStatus(`Couldn't load models: ${(err as Error).message}`);
  }
});

document.getElementById("place-model")?.addEventListener("click", async () => {
  const modelId = modelSelect.value;
  if (!modelId) {
    setStatus("Pick a model from the list first (refresh if it's empty).");
    return;
  }
  const x = Number((document.getElementById("pos-x") as HTMLInputElement).value);
  const y = Number((document.getElementById("pos-y") as HTMLInputElement).value);
  const z = Number((document.getElementById("pos-z") as HTMLInputElement).value);
  const rotZDeg = Number((document.getElementById("rot-z") as HTMLInputElement).value);

  try {
    setStatus("Loading model into view...");
    const api = await getWorkspaceApi();
    await api.viewer.toggleModel({ modelId, isVisible: true, fitToView: true } as never);

    setStatus("Placing model...");
    // ViewerAPI.placeModel() — confirmed method (sets a model's placement).
    // The exact placement payload shape (matrix vs. position+rotation) needs
    // confirming against the installed package's types — this is a
    // reasonable best guess based on the documented "position/transform"
    // description. See PLAN.md §2.1 / workspace.ts header note.
    await api.viewer.placeModel({
      modelId,
      position: { x, y, z },
      rotation: { x: 0, y: 0, z: rotZDeg },
    } as never);

    setStatus(`Placed at (${x}, ${y}, ${z}), rotated ${rotZDeg}° about Z.`);
  } catch (err) {
    setStatus(`Placement failed: ${(err as Error).message}`);
  }
});

// --- 3. Generate swing envelope ---------------------------------------------
document.getElementById("download-envelope")?.addEventListener("click", () => {
  const radiusM = Number((document.getElementById("boom-radius") as HTMLInputElement).value);
  const minHeightM = Number((document.getElementById("boom-min-h") as HTMLInputElement).value);
  const maxHeightM = Number((document.getElementById("boom-max-h") as HTMLInputElement).value);
  const slewStartDeg = Number((document.getElementById("slew-start") as HTMLInputElement).value);
  const slewEndDeg = Number((document.getElementById("slew-end") as HTMLInputElement).value);

  try {
    const obj = generateSwingEnvelopeObj({
      radiusM,
      minHeightM,
      maxHeightM,
      slewStartDeg,
      slewEndDeg,
    });
    triggerObjDownload(obj, "swing-envelope.obj");
    setStatus(
      "Downloaded swing-envelope.obj. Upload it into this project like any " +
        "other model, then place it at the crane's base point (step 2) " +
        "using position (0,0,0) relative to wherever you place the crane.",
    );
  } catch (err) {
    setStatus(`Couldn't generate envelope: ${(err as Error).message}`);
  }
});

// Kick off the connection on load so the panel is ready as soon as you
// interact with it.
getWorkspaceApi()
  .then(() => setStatus("Connected to Trimble Connect."))
  .catch((err) => setStatus(`Couldn't connect to Trimble Connect: ${(err as Error).message}`));

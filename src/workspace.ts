/**
 * Thin wrapper around the `trimble-connect-workspace-api` package.
 *
 * IMPORTANT — verify before relying on this: the ViewerAPI method names used
 * throughout this project (getModels, toggleModel, placeModel,
 * getObjectBoundingBoxes, setSelection, getObjects, etc.) are confirmed from
 * Trimble's published API reference (see PLAN.md §2.1). The exact shape of
 * the `connect(...)` bootstrap call below is the standard pattern used in
 * Trimble's published sample apps, but Claude could not pull the literal
 * README/type-declaration content for this package while building this
 * scaffold (the docs site is JS-rendered and the npm README didn't return
 * full text via automated fetch). Once you `npm install`, check
 * `node_modules/trimble-connect-workspace-api/*.d.ts` and adjust this file
 * if the signature differs.
 */
import { connect, type WorkspaceAPI } from "trimble-connect-workspace-api";

let apiPromise: Promise<WorkspaceAPI> | null = null;

export function getWorkspaceApi(): Promise<WorkspaceAPI> {
  if (!apiPromise) {
    apiPromise = connect(
      window.parent,
      (event, data) => {
        // Handle events pushed from Connect, e.g. selection changes,
        // extension.sessionInvalid (re-request a token when this fires).
        console.log("[workspace-api event]", event, data);
      },
      1000, // ms poll interval while waiting for the host to respond
    );
  }
  return apiPromise;
}

/**
 * Requests an access token for any calls that need one (e.g. calling the
 * Core REST API directly for file upload, once that flow is verified — see
 * PLAN.md §2.3/§4). Viewer-only calls generally don't need this.
 */
export async function ensureAccessToken(): Promise<string> {
  const api = await getWorkspaceApi();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for access token")), 30_000);
    // NOTE: verify this event-subscription shape against the installed
    // package's real types (the ambient shim in
    // trimble-connect-workspace-api.d.ts is a permissive placeholder, not
    // Trimble's actual definitions) — this mirrors the documented
    // request/consent flow but hasn't been confirmed call-for-call.
    api.extension.on("accessToken", ((token: string) => {
      clearTimeout(timeout);
      resolve(token);
    }) as (...args: unknown[]) => void);
    api.extension.requestPermission("accessToken");
  });
}

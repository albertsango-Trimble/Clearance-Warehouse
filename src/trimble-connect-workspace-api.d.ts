/**
 * Minimal ambient type shim so this scaffold type-checks out of the box.
 *
 * Delete this file once you `npm install trimble-connect-workspace-api` —
 * the real package ships its own (more complete and authoritative) types,
 * and you should reconcile workspace.ts / main.ts against those, not this
 * placeholder. See the header comment in src/workspace.ts.
 */
declare module "trimble-connect-workspace-api" {
  export interface WorkspaceAPI {
    viewer: {
      getModels: (...args: unknown[]) => Promise<Array<{ id: string; name: string }>>;
      toggleModel: (...args: unknown[]) => Promise<unknown>;
      placeModel: (...args: unknown[]) => Promise<unknown>;
      getObjectBoundingBoxes: (...args: unknown[]) => Promise<unknown>;
      setSelection: (...args: unknown[]) => Promise<unknown>;
      getObjects: (...args: unknown[]) => Promise<unknown>;
      [key: string]: unknown;
    };
    extension: {
      requestPermission: (...args: unknown[]) => void;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export function connect(
    targetWindow: Window,
    eventHandler: (event: string, data: unknown) => void,
    pollIntervalMs?: number,
  ): Promise<WorkspaceAPI>;
}

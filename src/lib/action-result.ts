/** Server Action outcome. Actions that redirect on success return it only on failure. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export type CanvasOrientation = "portrait" | "landscape";

export type PendingSession = {
  orientation: CanvasOrientation | null;
  editId: string | null;
};

const SESSION_KEY = "doodlejoy-session";
const PORTRAIT_RATIO = 3 / 4;
const LANDSCAPE_RATIO = 4 / 3;

let sessionMemory: PendingSession | null | undefined;

export const ratioForOrientation = (orientation: CanvasOrientation | null) => {
  if (orientation === "portrait") {
    return PORTRAIT_RATIO;
  }
  if (orientation === "landscape") {
    return LANDSCAPE_RATIO;
  }
  return null;
};

export const setPendingSession = (session: PendingSession | null) => {
  sessionMemory = session;
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const takePendingSession = (): PendingSession | null => {
  if (typeof window === "undefined") {
    return null;
  }
  if (sessionMemory !== undefined) {
    return sessionMemory;
  }
  const raw = sessionStorage.getItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  if (!raw) {
    sessionMemory = null;
    return null;
  }
  try {
    sessionMemory = JSON.parse(raw) as PendingSession;
  } catch {
    sessionMemory = null;
  }
  return sessionMemory;
};

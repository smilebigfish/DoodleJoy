export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.25;

export const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

export const nextZoomIn = (zoom: number) => clampZoom(zoom + ZOOM_STEP);

export const nextZoomOut = (zoom: number) => clampZoom(zoom - ZOOM_STEP);

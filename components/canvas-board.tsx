"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  canvasToBlob,
  drawCoverImage,
  makeThumbnail,
  paintStroke,
  redrawStrokes,
  PAPER,
  type Point,
  type Stroke,
  type Tool,
} from "@/lib/drawing";
import { clampZoom } from "@/lib/zoom";

export type CanvasBoardHandle = {
  undo: () => void;
  redo: () => void;
  exportPng: () => Promise<{ png: Blob; thumbnail: Blob; inkPng: Blob }>;
};

type CanvasBoardProps = {
  color: string;
  size: number;
  tool: Tool;
  backgroundSrc: string | null;
  overlaySrc?: string | null;
  aspectRatio: number | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onHistoryChange: (state: { canUndo: boolean; canRedo: boolean }) => void;
};

const MAX_BACKING_EDGE = 8192;

export const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(
  (
    {
      color,
      size,
      tool,
      backgroundSrc,
      overlaySrc = null,
      aspectRatio,
      zoom,
      onZoomChange,
      onHistoryChange,
    },
    ref,
  ) => {
    const stageRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLCanvasElement>(null);
    const inkRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const cursorRef = useRef(0);
    const drawingRef = useRef(false);
    const panningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const hiResTimerRef = useRef<number | null>(null);
    const renderScaleRef = useRef(1);
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    const overlayImageRef = useRef<HTMLImageElement | null>(null);
    const colorRef = useRef(color);
    const sizeRef = useRef(size);
    const toolRef = useRef(tool);
    const historyCbRef = useRef(onHistoryChange);
    const zoomRef = useRef(zoom);
    const panRef = useRef({ x: 0, y: 0 });
    const pointersRef = useRef(new Map<number, Point>());
    const pinchRef = useRef<{
      distance: number;
      zoom: number;
      panX: number;
      panY: number;
      midX: number;
      midY: number;
    } | null>(null);

    colorRef.current = color;
    sizeRef.current = size;
    toolRef.current = tool;
    historyCbRef.current = onHistoryChange;

    const aspectRef = useRef(aspectRatio);
    aspectRef.current = aspectRatio;

    const backingScale = (cssW: number, cssH: number) => {
      const dpr = window.devicePixelRatio || 1;
      const wanted = dpr * zoomRef.current;
      const cap = MAX_BACKING_EDGE / Math.max(cssW, cssH, 1);
      return Math.max(1, Math.min(wanted, cap));
    };

    const applyTransform = () => {
      const wrap = wrapRef.current;
      if (!wrap) {
        return;
      }
      const { x, y } = panRef.current;
      wrap.style.transform = `translate(${x}px, ${y}px) scale(${zoomRef.current})`;
      wrap.style.transformOrigin = "0 0";
    };

    const clampPan = () => {
      const stage = stageRef.current;
      const wrap = wrapRef.current;
      if (!stage || !wrap) {
        return;
      }
      const zoomValue = zoomRef.current;
      const contentW = wrap.offsetWidth * zoomValue;
      const contentH = wrap.offsetHeight * zoomValue;
      const minX = Math.min(0, stage.clientWidth - contentW);
      const minY = Math.min(0, stage.clientHeight - contentH);
      if (contentW <= stage.clientWidth) {
        panRef.current.x = (stage.clientWidth - contentW) / 2;
      } else {
        panRef.current.x = Math.min(0, Math.max(minX, panRef.current.x));
      }
      if (contentH <= stage.clientHeight) {
        panRef.current.y = (stage.clientHeight - contentH) / 2;
      } else {
        panRef.current.y = Math.min(0, Math.max(minY, panRef.current.y));
      }
    };

    const layoutStage = () => {
      const stage = stageRef.current;
      const wrap = wrapRef.current;
      if (!stage || !wrap) {
        return;
      }
      const ratio = aspectRef.current;
      if (!ratio) {
        wrap.style.width = "100%";
        wrap.style.height = "100%";
      } else {
        const maxW = stage.clientWidth;
        const maxH = stage.clientHeight;
        let width = maxW;
        let height = width / ratio;
        if (height > maxH) {
          height = maxH;
          width = height * ratio;
        }
        wrap.style.width = `${Math.max(1, Math.floor(width))}px`;
        wrap.style.height = `${Math.max(1, Math.floor(height))}px`;
      }
      clampPan();
      applyTransform();
    };

    const emitHistory = () => {
      historyCbRef.current({
        canUndo: cursorRef.current > 0,
        canRedo: cursorRef.current < strokesRef.current.length,
      });
    };

    const setupSize = () => {
      const wrap = wrapRef.current;
      const bg = bgRef.current;
      const ink = inkRef.current;
      const overlay = overlayRef.current;
      if (!wrap || !bg || !ink || !overlay) {
        return;
      }
      const width = Math.max(1, wrap.clientWidth);
      const height = Math.max(1, wrap.clientHeight);
      const scale = backingScale(width, height);
      renderScaleRef.current = scale;
      [bg, ink, overlay].forEach((canvas) => {
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      });
      paintBackground();
      redrawInk();
      paintOverlay();
    };

    const scheduleHiRes = () => {
      if (hiResTimerRef.current) {
        window.clearTimeout(hiResTimerRef.current);
      }
      hiResTimerRef.current = window.setTimeout(() => {
        setupSize();
      }, 100);
    };

    const paintBackground = () => {
      const bg = bgRef.current;
      const wrap = wrapRef.current;
      if (!bg || !wrap) {
        return;
      }
      const scale = renderScaleRef.current;
      const ctx = bg.getContext("2d");
      if (!ctx) {
        return;
      }
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, bg.width, bg.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const image = backgroundImageRef.current;
      if (image) {
        drawCoverImage(ctx, image, cssW, cssH, image.width, image.height);
      }
    };

    const paintOverlay = () => {
      const overlay = overlayRef.current;
      const wrap = wrapRef.current;
      if (!overlay || !wrap) {
        return;
      }
      const ctx = overlay.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      const image = overlayImageRef.current;
      if (!image) {
        return;
      }
      const scale = renderScaleRef.current;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawCoverImage(
        ctx,
        image,
        wrap.clientWidth,
        wrap.clientHeight,
        image.width,
        image.height,
      );
    };

    const redrawInk = () => {
      const ink = inkRef.current;
      const wrap = wrapRef.current;
      if (!ink || !wrap) {
        return;
      }
      const ctx = ink.getContext("2d");
      if (!ctx) {
        return;
      }
      const scale = renderScaleRef.current;
      redrawStrokes(
        ctx,
        strokesRef.current.slice(0, cursorRef.current),
        ink.width,
        ink.height,
        scale,
      );
    };

    const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const ink = inkRef.current;
      if (!ink) {
        return { x: 0, y: 0 };
      }
      const rect = ink.getBoundingClientRect();
      const scaleX = rect.width === 0 ? 1 : ink.clientWidth / rect.width;
      const scaleY = rect.height === 0 ? 1 : ink.clientHeight / rect.height;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    };

    const cancelDrawing = () => {
      if (!drawingRef.current) {
        return;
      }
      drawingRef.current = false;
      if (cursorRef.current > 0) {
        strokesRef.current = strokesRef.current.slice(0, cursorRef.current - 1);
        cursorRef.current = strokesRef.current.length;
        redrawInk();
        emitHistory();
      }
    };

    const twoPointerState = () => {
      const points = [...pointersRef.current.values()];
      if (points.length < 2) {
        return null;
      }
      const [first, second] = points;
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      return {
        distance,
        midX: (first.x + second.x) / 2,
        midY: (first.y + second.y) / 2,
      };
    };

    const applyPinch = () => {
      const pinch = pinchRef.current;
      const two = twoPointerState();
      const stage = stageRef.current;
      if (!pinch || !two || !stage || two.distance < 8) {
        return;
      }
      const rect = stage.getBoundingClientRect();
      const nextZoom = clampZoom(pinch.zoom * (two.distance / pinch.distance));
      const localX = pinch.midX - rect.left;
      const localY = pinch.midY - rect.top;
      const worldX = (localX - pinch.panX) / pinch.zoom;
      const worldY = (localY - pinch.panY) / pinch.zoom;
      zoomRef.current = nextZoom;
      panRef.current.x = localX - worldX * nextZoom + (two.midX - pinch.midX);
      panRef.current.y = localY - worldY * nextZoom + (two.midY - pinch.midY);
      clampPan();
      applyTransform();
      onZoomChange(nextZoom);
    };

    useImperativeHandle(ref, () => ({
      undo: () => {
        if (cursorRef.current <= 0) {
          return;
        }
        cursorRef.current -= 1;
        redrawInk();
        emitHistory();
      },
      redo: () => {
        if (cursorRef.current >= strokesRef.current.length) {
          return;
        }
        cursorRef.current += 1;
        redrawInk();
        emitHistory();
      },
      exportPng: async () => {
        const wrap = wrapRef.current;
        if (!wrap) {
          throw new Error("畫布還沒好");
        }
        const cssW = Math.max(1, wrap.clientWidth);
        const cssH = Math.max(1, wrap.clientHeight);
        const exportScale = Math.min(2, window.devicePixelRatio || 2);
        const compose = async (withOverlay: boolean) => {
          const out = document.createElement("canvas");
          out.width = Math.round(cssW * exportScale);
          out.height = Math.round(cssH * exportScale);
          const ctx = out.getContext("2d");
          if (!ctx) {
            throw new Error("無法存檔");
          }
          ctx.fillStyle = PAPER;
          ctx.fillRect(0, 0, out.width, out.height);
          ctx.setTransform(exportScale, 0, 0, exportScale, 0, 0);
          const under = backgroundImageRef.current;
          if (under) {
            drawCoverImage(ctx, under, cssW, cssH, under.width, under.height);
          }
          strokesRef.current.slice(0, cursorRef.current).forEach((stroke) => {
            paintStroke(ctx, stroke);
          });
          const over = overlayImageRef.current;
          if (withOverlay && over) {
            drawCoverImage(ctx, over, cssW, cssH, over.width, over.height);
          }
          return { canvas: out, blob: await canvasToBlob(out) };
        };
        const flat = await compose(true);
        const ink = await compose(false);
        const thumbnail = await makeThumbnail(flat.canvas);
        return { png: flat.blob, thumbnail, inkPng: ink.blob };
      },
    }));

    useEffect(() => {
      layoutStage();
      setupSize();
      const observer = new ResizeObserver(() => {
        layoutStage();
        setupSize();
      });
      if (stageRef.current) {
        observer.observe(stageRef.current);
      }
      return () => {
        observer.disconnect();
        if (hiResTimerRef.current) {
          window.clearTimeout(hiResTimerRef.current);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- resize listener
    }, [aspectRatio]);

    useEffect(() => {
      const prev = zoomRef.current;
      const stage = stageRef.current;
      if (stage && prev !== zoom && prev > 0) {
        const cx = stage.clientWidth / 2;
        const cy = stage.clientHeight / 2;
        const worldX = (cx - panRef.current.x) / prev;
        const worldY = (cy - panRef.current.y) / prev;
        panRef.current.x = cx - worldX * zoom;
        panRef.current.y = cy - worldY * zoom;
      }
      zoomRef.current = zoom;
      clampPan();
      applyTransform();
      scheduleHiRes();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- zoom from parent buttons
    }, [zoom]);

    useEffect(() => {
      if (!backgroundSrc) {
        backgroundImageRef.current = null;
        paintBackground();
        return;
      }
      let cancelled = false;
      const image = new Image();
      image.onload = () => {
        if (cancelled) {
          return;
        }
        backgroundImageRef.current = image;
        paintBackground();
      };
      image.src = backgroundSrc;
      return () => {
        cancelled = true;
      };
    }, [backgroundSrc]);

    useEffect(() => {
      if (!overlaySrc) {
        overlayImageRef.current = null;
        paintOverlay();
        return;
      }
      let cancelled = false;
      const image = new Image();
      image.onload = () => {
        if (cancelled) {
          return;
        }
        overlayImageRef.current = image;
        paintOverlay();
      };
      image.src = overlaySrc;
      return () => {
        cancelled = true;
      };
    }, [overlaySrc]);

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      event.currentTarget.setPointerCapture(event.pointerId);

      if (pointersRef.current.size >= 2) {
        cancelDrawing();
        panningRef.current = false;
        const two = twoPointerState();
        if (two) {
          pinchRef.current = {
            distance: two.distance,
            zoom: zoomRef.current,
            panX: panRef.current.x,
            panY: panRef.current.y,
            midX: two.midX,
            midY: two.midY,
          };
        }
        return;
      }

      if (!event.isPrimary) {
        return;
      }

      const activeTool = toolRef.current;
      if (activeTool === "pan") {
        panningRef.current = true;
        panStartRef.current = {
          x: event.clientX,
          y: event.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
        return;
      }

      const ink = inkRef.current;
      const ctx = ink?.getContext("2d");
      if (!ink || !ctx) {
        return;
      }
      drawingRef.current = true;
      strokesRef.current = strokesRef.current.slice(0, cursorRef.current);
      const point = pointFromEvent(event);
      const stroke: Stroke = {
        tool: activeTool,
        color: colorRef.current,
        size: Math.max(1, sizeRef.current / zoomRef.current),
        points: [point],
      };
      strokesRef.current.push(stroke);
      cursorRef.current = strokesRef.current.length;
      const scale = renderScaleRef.current;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      paintStroke(ctx, stroke);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }
      if (pointersRef.current.size >= 2) {
        applyPinch();
        return;
      }
      if (panningRef.current && event.isPrimary) {
        const start = panStartRef.current;
        panRef.current.x = start.panX + (event.clientX - start.x);
        panRef.current.y = start.panY + (event.clientY - start.y);
        clampPan();
        applyTransform();
        return;
      }
      if (!drawingRef.current || !event.isPrimary) {
        return;
      }
      const stroke = strokesRef.current[strokesRef.current.length - 1];
      const ctx = inkRef.current?.getContext("2d");
      if (!stroke || !ctx) {
        return;
      }
      const point = pointFromEvent(event);
      stroke.points.push(point);
      const scale = renderScaleRef.current;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const prev = stroke.points[stroke.points.length - 2];
      paintStroke(ctx, { ...stroke, points: [prev, point] });
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) {
        if (pinchRef.current) {
          scheduleHiRes();
        }
        pinchRef.current = null;
      }
      if (!event.isPrimary) {
        return;
      }
      panningRef.current = false;
      if (drawingRef.current) {
        drawingRef.current = false;
        emitHistory();
      }
    };

    return (
      <div
        ref={stageRef}
        className="relative h-full min-h-0 w-full overflow-hidden overscroll-none touch-none"
      >
        <div ref={wrapRef} className="absolute left-0 top-0 overflow-hidden bg-paper shadow-kid">
          <canvas ref={bgRef} className="pointer-events-none absolute inset-0" />
          <canvas
            ref={inkRef}
            className={
              tool === "pan"
                ? "absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
                : "absolute inset-0 touch-none"
            }
            aria-label="畫布"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(event) => event.preventDefault()}
          />
          <canvas
            ref={overlayRef}
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  },
);

CanvasBoard.displayName = "CanvasBoard";

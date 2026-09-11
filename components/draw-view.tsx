"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Home, ImagePlus, Redo2, Save, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { CanvasBoard, type CanvasBoardHandle } from "@/components/canvas-board";
import { KidButton } from "@/components/kid-button";
import { OrientationSheet } from "@/components/orientation-sheet";
import { Toolbar } from "@/components/toolbar";
import { UnlockHoldButton } from "@/components/unlock-hold-button";
import { useScreenLock } from "@/components/screen-lock-provider";
import {
  getArtwork,
  getSettings,
  isQuotaError,
  saveArtwork,
  saveSettings,
  type CustomColors,
  type Settings,
} from "@/lib/db";
import { DEFAULT_BRUSH, blobToDataUrl, dataUrlToBlob, readImageFile, type Tool } from "@/lib/drawing";
import {
  ratioForOrientation,
  takePendingSession,
  type CanvasOrientation,
} from "@/lib/session-art";
import { CRAYON_COLORS } from "@/lib/palette";
import { MAX_ZOOM, MIN_ZOOM, nextZoomIn, nextZoomOut } from "@/lib/zoom";
import { cn } from "@/lib/cn";

export const DrawView = () => {
  const boardRef = useRef<CanvasBoardHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { locked, unlock } = useScreenLock();
  const [backgroundSrc, setBackgroundSrc] = useState<string | null>(null);
  const [overlaySrc, setOverlaySrc] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<CanvasOrientation | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [color, setColor] = useState(CRAYON_COLORS[0]);
  const [size, setSize] = useState<number>(DEFAULT_BRUSH);
  const [tool, setTool] = useState<Tool>("pen");
  const [activeCustomSlot, setActiveCustomSlot] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [quotaFull, setQuotaFull] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const savedTimerRef = useRef<number | null>(null);
  const canPan = zoom > 1;

  useEffect(() => {
    let cancelled = false;
    const pending = takePendingSession();
    /* eslint-disable react-hooks/set-state-in-effect -- 從 sessionStorage 還原進畫頁，只能在 client 掛載後做 */
    if (pending?.orientation) {
      setOrientation(pending.orientation);
    }
    if (pending?.editId) {
      setEditId(pending.editId);
      void getArtwork(pending.editId).then(async (art) => {
        if (cancelled || !art) {
          return;
        }
        if (art.overlayPng && art.inkPng) {
          const [inkUrl, overlayUrl] = await Promise.all([
            blobToDataUrl(art.inkPng),
            blobToDataUrl(art.overlayPng),
          ]);
          if (cancelled) {
            return;
          }
          setBackgroundSrc(inkUrl);
          setOverlaySrc(overlayUrl);
        } else {
          const pngUrl = await blobToDataUrl(art.png);
          if (cancelled) {
            return;
          }
          setBackgroundSrc(pngUrl);
          setOverlaySrc(null);
        }
      });
    }
    void getSettings().then((next) => {
      if (!cancelled) {
        setSettings(next);
      }
    });
    return () => {
      cancelled = true;
      if (savedTimerRef.current) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleZoom = (next: number) => {
    setZoom(next);
    if (next <= 1) {
      setTool((current) => (current === "pan" ? "pen" : current));
    }
  };

  const persistSettings = async (next: Settings) => {
    setSettings(next);
    await saveSettings(next);
  };

  const handleCustomSlot = (index: number) => {
    setActiveCustomSlot(index);
    const slot = settings?.customColors[index];
    if (slot) {
      setColor(slot);
      setTool("pen");
    }
  };

  const handlePickCustom = (hex: string) => {
    if (!settings) {
      return;
    }
    const customColors = [...settings.customColors] as CustomColors;
    customColors[activeCustomSlot] = hex;
    void persistSettings({ ...settings, customColors });
    setColor(hex);
    setTool("pen");
  };

  const handleBackground = async (nextOrientation: CanvasOrientation) => {
    if (!pendingFile) {
      return;
    }
    const imported = await readImageFile(pendingFile, nextOrientation);
    if (imported.overlay) {
      setOverlaySrc(imported.dataUrl);
    } else {
      setBackgroundSrc(imported.dataUrl);
    }
    setOrientation(nextOrientation);
    setPendingFile(null);
  };

  const handleSave = async () => {
    try {
      const exported = await boardRef.current?.exportPng();
      if (!exported) {
        return;
      }
      const overlayPng = overlaySrc ? await dataUrlToBlob(overlaySrc) : null;
      const id = editId ?? crypto.randomUUID();
      await saveArtwork({
        id,
        createdAt: Date.now(),
        png: exported.png,
        thumbnail: exported.thumbnail,
        hasBackground: Boolean(backgroundSrc || overlaySrc),
        inkPng: overlayPng ? exported.inkPng : null,
        overlayPng,
      });
      setEditId(id);
      setSaved(true);
      if (savedTimerRef.current) {
        window.clearTimeout(savedTimerRef.current);
      }
      savedTimerRef.current = window.setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      if (isQuotaError(error)) {
        setQuotaFull(true);
      }
    }
  };

  if (!settings) {
    return <div className="min-h-[100dvh] bg-cream" />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none bg-cream">
      <header className="flex shrink-0 flex-wrap items-center gap-1.5 px-2 pb-1.5 pt-[max(0.35rem,env(safe-area-inset-top))]">
        {/* 完整重新載入，避免畫布殘留狀態 */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          aria-label="回家"
          tabIndex={0}
          className="kid-press inline-flex h-12 w-12 items-center justify-center rounded-full bg-white px-0 font-bold text-ink shadow-kid focus-visible:outline-4 focus-visible:outline-mint"
        >
          <Home strokeWidth={3} className="h-6 w-6" />
        </a>
        <KidButton
          variant={saved ? "mint" : "primary"}
          ariaLabel="存檔"
          className="h-12 w-12 rounded-full px-0"
          onClick={() => void handleSave()}
        >
          {saved ? (
            <Check strokeWidth={3} className="h-6 w-6" />
          ) : (
            <Save strokeWidth={3} className="h-6 w-6" />
          )}
        </KidButton>
        <KidButton
          ariaLabel="上一步"
          disabled={!canUndo}
          className="h-12 w-12 rounded-full px-0"
          onClick={() => boardRef.current?.undo()}
        >
          <Undo2 strokeWidth={3} className="h-6 w-6" />
        </KidButton>
        <KidButton
          ariaLabel="下一步"
          disabled={!canRedo}
          className="h-12 w-12 rounded-full px-0"
          onClick={() => boardRef.current?.redo()}
        >
          <Redo2 strokeWidth={3} className="h-6 w-6" />
        </KidButton>
        <KidButton
          ariaLabel="縮小畫布"
          disabled={zoom <= MIN_ZOOM}
          className="h-12 w-12 rounded-full px-0"
          onClick={() => handleZoom(nextZoomOut(zoom))}
        >
          <ZoomOut strokeWidth={3} className="h-6 w-6" />
        </KidButton>
        <KidButton
          ariaLabel="放大畫布"
          disabled={zoom >= MAX_ZOOM}
          className="h-12 w-12 rounded-full px-0"
          onClick={() => handleZoom(nextZoomIn(zoom))}
        >
          <ZoomIn strokeWidth={3} className="h-6 w-6" />
        </KidButton>
        <KidButton
          variant="sun"
          ariaLabel="選照片當底圖"
          className={cn("h-12 w-12 rounded-full px-0", !locked && "ml-auto")}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus strokeWidth={3} className="h-6 w-6" />
        </KidButton>
        {locked ? (
          <div className="ml-auto">
            <UnlockHoldButton onUnlock={() => void unlock()} />
          </div>
        ) : null}
      </header>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="上傳底圖"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            setPendingFile(file);
          }
        }}
      />

      <div className="min-h-0 flex-1 px-2 pb-1">
        <div className="h-full overflow-hidden rounded-[22px] border-4 border-ink/10">
          <CanvasBoard
            ref={boardRef}
            color={color}
            size={size}
            tool={tool}
            backgroundSrc={backgroundSrc}
            overlaySrc={overlaySrc}
            aspectRatio={ratioForOrientation(orientation)}
            zoom={zoom}
            onZoomChange={handleZoom}
            onHistoryChange={(state) => {
              setCanUndo(state.canUndo);
              setCanRedo(state.canRedo);
            }}
          />
        </div>
      </div>

      <Toolbar
        color={color}
        size={size}
        tool={tool}
        paletteSize={settings.paletteSize}
        customColors={settings.customColors}
        activeCustomSlot={activeCustomSlot}
        onColor={(value) => {
          setColor(value);
          setTool("pen");
        }}
        onSize={setSize}
        onTool={setTool}
        onCustomSlot={handleCustomSlot}
        onPickCustom={handlePickCustom}
        canPan={canPan}
      />

      {pendingFile ? (
        <OrientationSheet
          onCancel={() => setPendingFile(null)}
          onPick={(nextOrientation) => void handleBackground(nextOrientation)}
        />
      ) : null}

      {quotaFull ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-[32px] bg-cream p-6 text-center">
            <p className="mb-4 font-display text-xl font-bold text-ink">
              空間不夠了，先丟掉幾張舊畫再存。
            </p>
            <KidButton
              variant="primary"
              ariaLabel="空間滿了，先丟掉舊畫"
              className="h-16 w-full text-xl"
              onClick={() => {
                setQuotaFull(false);
                // 回列表並重整，讓小朋友去丟掉舊畫
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload
                window.location.assign("/");
              }}
            >
              <Home strokeWidth={3} className="h-8 w-8" />
            </KidButton>
          </div>
        </div>
      ) : null}
    </div>
  );
};

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { MAX_BRUSH, MIN_BRUSH } from "@/lib/drawing";

type BrushSizePickerProps = {
  size: number;
  color: string;
  eraser?: boolean;
  onSize: (value: number) => void;
};

const sizeFromClientX = (clientX: number, track: HTMLElement) => {
  const rect = track.getBoundingClientRect();
  const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
  const clamped = Math.min(1, Math.max(0, ratio));
  return Math.round(MIN_BRUSH + clamped * (MAX_BRUSH - MIN_BRUSH));
};

export const BrushSizePicker = ({
  size,
  color,
  eraser = false,
  onSize,
}: BrushSizePickerProps) => {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState({ bottom: 96, left: 12 });
  const [canClose, setCanClose] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const preview = Math.max(10, Math.min(size, 56));
  const triggerPreview = Math.max(8, Math.min(size * 0.55, 28));
  const percent = ((size - MIN_BRUSH) / (MAX_BRUSH - MIN_BRUSH)) * 100;

  const handleOpen = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPanel({
        bottom: window.innerHeight - rect.top + 12,
        left: Math.max(12, rect.left),
      });
    }
    setCanClose(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCanClose(false);
  };

  const handleToggle = () => {
    if (open) {
      handleClose();
      return;
    }
    handleOpen();
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeTimer = window.setTimeout(() => setCanClose(true), 250);
    const handleResize = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setPanel({
        bottom: window.innerHeight - rect.top + 12,
        left: Math.max(12, rect.left),
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.clearTimeout(closeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  const handlePick = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    onSize(sizeFromClientX(clientX, track));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    handlePick(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }
    handlePick(event.clientX);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onSize(Math.max(MIN_BRUSH, size - 2));
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onSize(Math.min(MAX_BRUSH, size + 2));
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        tabIndex={0}
        aria-label={eraser ? "橡皮擦粗細" : "筆的粗細"}
        aria-expanded={open}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleToggle();
        }}
        className={cn(
          "kid-press relative z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-kid",
          open && "ring-[5px] ring-ink",
        )}
      >
        <span
          className={cn(
            "pointer-events-none rounded-full border-2",
            eraser ? "border-dashed border-ink bg-paper" : "border-ink bg-ink",
          )}
          style={{ width: triggerPreview, height: triggerPreview }}
        />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                tabIndex={0}
                aria-label="關掉粗細"
                className="fixed inset-0 z-40 cursor-default bg-ink/20"
                onPointerDown={() => {
                  if (!canClose) {
                    return;
                  }
                  handleClose();
                }}
              />
              <div
                className="fixed z-50 w-72 rounded-[28px] border-4 border-ink/10 bg-paper p-4 shadow-kid"
                style={{ bottom: panel.bottom, left: panel.left }}
              >
                <div className="mb-3 flex h-16 items-center justify-center">
                  <span
                    className={cn(
                      "rounded-full border-2",
                      eraser ? "border-dashed border-ink bg-paper" : "border-ink",
                    )}
                    style={{
                      width: preview,
                      height: preview,
                      backgroundColor: eraser ? undefined : color,
                    }}
                  />
                </div>
                <div
                  ref={trackRef}
                  role="slider"
                  tabIndex={0}
                  aria-label={eraser ? "拖曳選擇橡皮擦粗細" : "拖曳選擇筆的粗細"}
                  aria-valuemin={MIN_BRUSH}
                  aria-valuemax={MAX_BRUSH}
                  aria-valuenow={size}
                  className="relative mx-4 h-14 touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onKeyDown={handleKeyDown}
                >
                  <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-ink/15" />
                  <div
                    className="absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ink bg-sun shadow-kid"
                    style={{ left: `${percent}%` }}
                  />
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
};

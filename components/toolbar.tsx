"use client";

import { Check, Eraser, Hand, Palette, Pencil } from "lucide-react";
import { BrushSizePicker } from "@/components/brush-size-picker";
import { cn } from "@/lib/cn";
import { type Tool } from "@/lib/drawing";
import type { CustomColors } from "@/lib/db";
import { getVisibleColors, type PaletteSize } from "@/lib/palette";
import { useHorizontalDragScroll } from "@/lib/use-horizontal-drag-scroll";

const isLightColor = (hex: string) => {
  const value = hex.replace("#", "");
  if (value.length < 6) {
    return false;
  }
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 160;
};

const ColorCheck = ({ hex }: { hex: string }) => (
  <Check
    strokeWidth={4}
    className={cn(
      "pointer-events-none h-4 w-4 drop-shadow-sm",
      isLightColor(hex) ? "text-ink" : "text-white",
    )}
    aria-hidden="true"
  />
);

type ToolbarProps = {
  color: string;
  size: number;
  tool: Tool;
  paletteSize: PaletteSize;
  customColors: CustomColors;
  activeCustomSlot: number;
  onColor: (value: string) => void;
  onSize: (value: number) => void;
  onTool: (value: Tool) => void;
  onCustomSlot: (index: number) => void;
  onPickCustom: (hex: string) => void;
  canPan: boolean;
};

export const Toolbar = ({
  color,
  size,
  tool,
  paletteSize,
  customColors,
  activeCustomSlot,
  onColor,
  onSize,
  onTool,
  onCustomSlot,
  onPickCustom,
  canPan,
}: ToolbarProps) => {
  const colors = getVisibleColors(paletteSize);
  const {
    scrollRef,
    didDrag,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useHorizontalDragScroll();

  return (
    <div className="flex items-center gap-3 bg-cream/95 px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
      <BrushSizePicker
        size={size}
        color={color}
        eraser={tool === "eraser"}
        onSize={onSize}
      />

      <div
        ref={scrollRef}
        className="palette-scroll flex min-w-0 flex-1 cursor-grab items-center gap-2 overflow-x-auto overscroll-x-contain px-3 py-1.5 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {colors.map((swatch) => {
          const selected = color === swatch;
          return (
            <div
              key={swatch}
              className="flex h-12 w-12 shrink-0 items-center justify-center"
            >
              <button
                type="button"
                tabIndex={0}
                aria-label={`顏色 ${swatch}`}
                aria-pressed={selected}
                onPointerUp={() => {
                  if (didDrag()) {
                    return;
                  }
                  onColor(swatch);
                }}
                className={cn(
                  "kid-press relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink",
                  selected && "h-11 w-11 ring-[3px] ring-ink",
                )}
                style={{ backgroundColor: swatch }}
              >
                {selected ? <ColorCheck hex={swatch} /> : null}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {customColors.map((slot, index) => {
          const selected = Boolean(slot) && color === slot;
          return (
            <button
              key={`custom-${index}`}
              type="button"
              tabIndex={0}
              aria-label={`自訂顏色 ${index + 1}`}
              aria-pressed={selected}
              onClick={() => onCustomSlot(index)}
              className={cn(
                "kid-press relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-ink bg-white",
                activeCustomSlot === index && "border-solid ring-[3px] ring-ink",
              )}
              style={slot ? { backgroundColor: slot, borderStyle: "solid" } : undefined}
            >
              {selected ? <ColorCheck hex={slot} /> : null}
              {!slot ? <span className="text-xl font-bold text-ink/40">+</span> : null}
            </button>
          );
        })}
        <label className="kid-press relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-sun text-ink shadow-kid">
          <Palette strokeWidth={3} className="pointer-events-none h-5 w-5" />
          <span className="sr-only">調色</span>
          <input
            type="color"
            aria-label="調色"
            value={customColors[activeCustomSlot] || color}
            onChange={(event) => onPickCustom(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          tabIndex={0}
          aria-label="畫筆"
          onClick={() => onTool("pen")}
          className={cn(
            "kid-press flex h-12 w-12 items-center justify-center rounded-full text-ink shadow-kid",
            tool === "pen" ? "bg-sun ring-[3px] ring-ink" : "bg-white",
          )}
        >
          <Pencil strokeWidth={3} className="h-6 w-6" />
        </button>
        <button
          type="button"
          tabIndex={0}
          aria-label="橡皮擦"
          onClick={() => onTool("eraser")}
          className={cn(
            "kid-press flex h-12 w-12 items-center justify-center rounded-full shadow-kid",
            tool === "eraser"
              ? "bg-mint text-white ring-[3px] ring-ink"
              : "bg-white text-ink",
          )}
        >
          <Eraser strokeWidth={3} className="h-6 w-6" />
        </button>
        {canPan ? (
          <button
            type="button"
            tabIndex={0}
            aria-label="拖動畫布"
            onClick={() => onTool("pan")}
            className={cn(
              "kid-press flex h-12 w-12 items-center justify-center rounded-full text-ink shadow-kid",
              tool === "pan" ? "bg-sun ring-[3px] ring-ink" : "bg-white",
            )}
          >
            <Hand strokeWidth={3} className="h-6 w-6" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

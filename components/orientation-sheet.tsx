"use client";

import { X } from "lucide-react";
import type { CanvasOrientation } from "@/lib/session-art";

type OrientationSheetProps = {
  onPick: (orientation: CanvasOrientation) => void;
  onCancel: () => void;
};

export const OrientationSheet = ({ onPick, onCancel }: OrientationSheetProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="直向或橫向"
  >
    <div className="relative w-full max-w-sm rounded-[32px] bg-cream p-6 shadow-kid">
      <button
        type="button"
        tabIndex={0}
        aria-label="取消"
        onClick={onCancel}
        className="kid-press absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-kid"
      >
        <X strokeWidth={3} className="h-7 w-7" />
      </button>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <button
          type="button"
          tabIndex={0}
          aria-label="直向匯入"
          onClick={() => onPick("portrait")}
          className="kid-press flex h-36 flex-col items-center justify-center rounded-[28px] bg-white shadow-kid"
        >
          <span className="h-20 w-14 rounded-xl border-4 border-ink bg-paper" />
        </button>
        <button
          type="button"
          tabIndex={0}
          aria-label="橫向匯入"
          onClick={() => onPick("landscape")}
          className="kid-press flex h-36 flex-col items-center justify-center rounded-[28px] bg-white shadow-kid"
        >
          <span className="h-14 w-20 rounded-xl border-4 border-ink bg-paper" />
        </button>
      </div>
    </div>
  </div>
);

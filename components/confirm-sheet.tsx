"use client";

import { Trash2, X } from "lucide-react";

type ConfirmSheetProps = {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmSheet = ({ title, onConfirm, onCancel }: ConfirmSheetProps) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div className="w-full max-w-md rounded-[32px] bg-cream p-6 shadow-kid">
      <p className="mb-4 text-center font-display text-xl font-bold text-ink">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          tabIndex={0}
          aria-label="取消"
          onClick={onCancel}
          className="kid-press flex h-[72px] items-center justify-center rounded-[28px] bg-white text-ink shadow-kid"
        >
          <X strokeWidth={3} className="h-9 w-9" />
        </button>
        <button
          type="button"
          tabIndex={0}
          aria-label="丟掉"
          onClick={onConfirm}
          className="kid-press flex h-[72px] items-center justify-center rounded-[28px] bg-coral text-white shadow-kid"
        >
          <Trash2 strokeWidth={3} className="h-9 w-9" />
        </button>
      </div>
    </div>
  </div>
);

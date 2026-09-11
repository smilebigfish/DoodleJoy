"use client";

import { useState } from "react";
import { Unlock } from "lucide-react";
import { MathUnlockSheet } from "@/components/math-unlock-sheet";
import { cn } from "@/lib/cn";

type UnlockButtonProps = {
  onUnlock: () => void;
  className?: string;
};

export const UnlockButton = ({ onUnlock, className }: UnlockButtonProps) => {
  const [open, setOpen] = useState(false);

  const handleUnlock = () => {
    setOpen(false);
    onUnlock();
  };

  return (
    <>
      <button
        type="button"
        tabIndex={0}
        aria-label="解鎖"
        onClick={() => setOpen(true)}
        className={cn(
          "kid-press flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-kid",
          className,
        )}
      >
        <Unlock strokeWidth={3} className="h-6 w-6" />
      </button>
      {open ? (
        <MathUnlockSheet
          onClose={() => setOpen(false)}
          onUnlock={handleUnlock}
        />
      ) : null}
    </>
  );
};

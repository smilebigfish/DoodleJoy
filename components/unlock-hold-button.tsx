"use client";

import { useEffect, useRef, useState } from "react";
import { Unlock } from "lucide-react";
import { cn } from "@/lib/cn";

const HOLD_MS = 2500;

type UnlockHoldButtonProps = {
  onUnlock: () => void;
};

export const UnlockHoldButton = ({ onUnlock }: UnlockHoldButtonProps) => {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const handleStop = () => {
    startRef.current = null;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setProgress(0);
  };

  const handleTick = (now: number) => {
    if (startRef.current === null) {
      return;
    }
    const next = Math.min(1, (now - startRef.current) / HOLD_MS);
    setProgress(next);
    if (next >= 1) {
      handleStop();
      onUnlock();
      return;
    }
    frameRef.current = requestAnimationFrame(handleTick);
  };

  const handleStart = () => {
    startRef.current = performance.now();
    frameRef.current = requestAnimationFrame(handleTick);
  };

  useEffect(() => () => handleStop(), []);

  return (
    <button
      type="button"
      tabIndex={0}
      aria-label="長按解鎖"
      onPointerDown={handleStart}
      onPointerUp={handleStop}
      onPointerLeave={handleStop}
      onPointerCancel={handleStop}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleStart();
        }
      }}
      onKeyUp={handleStop}
      className={cn(
        "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white text-ink shadow-kid",
      )}
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background: `conic-gradient(#2EC4B6 ${progress * 360}deg, transparent 0deg)`,
        }}
      />
      <Unlock strokeWidth={3} className="relative h-6 w-6" />
    </button>
  );
};

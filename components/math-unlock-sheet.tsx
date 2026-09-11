"use client";

import { useState } from "react";
import { Check, Delete, X } from "lucide-react";
import { KidButton } from "@/components/kid-button";
import { makeMathChallenge } from "@/lib/math-challenge";
import { cn } from "@/lib/cn";

type MathUnlockSheetProps = {
  onUnlock: () => void;
  onClose: () => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export const MathUnlockSheet = ({ onUnlock, onClose }: MathUnlockSheetProps) => {
  const [challenge] = useState(() => makeMathChallenge());
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  const handleDigit = (digit: string) => {
    setWrong(false);
    setValue((current) => (current.length >= 4 ? current : `${current}${digit}`));
  };

  const handleDelete = () => {
    setWrong(false);
    setValue((current) => current.slice(0, -1));
  };

  const handleSubmit = () => {
    if (value === "" || Number.parseInt(value, 10) !== challenge.answer) {
      setWrong(true);
      setValue("");
      return;
    }
    onUnlock();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="輸入答案解鎖"
    >
      <div className="relative w-full max-w-sm rounded-[32px] bg-cream p-6 shadow-kid">
        <button
          type="button"
          tabIndex={0}
          aria-label="關閉"
          onClick={onClose}
          className="kid-press absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-kid"
        >
          <X strokeWidth={3} className="h-7 w-7" />
        </button>
        <p className="pr-14 text-center font-display text-3xl font-bold text-ink">
          {challenge.prompt}
        </p>
        <p
          className={cn(
            "mt-3 min-h-12 rounded-[20px] bg-paper px-4 py-2 text-center font-display text-3xl font-bold tracking-widest text-ink",
            wrong && "ring-4 ring-coral",
          )}
          aria-live="polite"
        >
          {value || "?"}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {KEYS.map((digit) => (
            <KidButton
              key={digit}
              ariaLabel={`數字 ${digit}`}
              className="h-14 text-2xl"
              onClick={() => handleDigit(digit)}
            >
              {digit}
            </KidButton>
          ))}
          <KidButton ariaLabel="倒退" className="h-14" onClick={handleDelete}>
            <Delete strokeWidth={3} className="h-7 w-7" />
          </KidButton>
          <KidButton
            ariaLabel="數字 0"
            className="h-14 text-2xl"
            onClick={() => handleDigit("0")}
          >
            0
          </KidButton>
          <KidButton
            variant="mint"
            ariaLabel="送出答案"
            className="h-14"
            onClick={handleSubmit}
          >
            <Check strokeWidth={3} className="h-7 w-7" />
          </KidButton>
        </div>
      </div>
    </div>
  );
};

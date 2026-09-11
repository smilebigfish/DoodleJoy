"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type KidButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "sun" | "mint";
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
};

const variantClass: Record<NonNullable<KidButtonProps["variant"]>, string> = {
  primary: "bg-coral text-white shadow-kid",
  secondary: "bg-white text-ink shadow-kid",
  sun: "bg-sun text-ink shadow-kid",
  mint: "bg-mint text-white shadow-kid",
};

export const KidButton = ({
  children,
  onClick,
  type = "button",
  variant = "secondary",
  className,
  ariaLabel,
  disabled = false,
}: KidButtonProps) => (
  <button
    type={type}
    aria-label={ariaLabel}
    tabIndex={0}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "kid-press inline-flex items-center justify-center gap-2 rounded-[28px] font-bold",
      "focus-visible:outline-4 focus-visible:outline-mint disabled:bg-disabled disabled:text-ink/40 disabled:shadow-none",
      variantClass[variant],
      className,
    )}
  >
    {children}
  </button>
);

"use client";

import { useEffect, useState } from "react";
import { Home } from "lucide-react";
import { BlobDecor } from "@/components/blob-decor";
import { useScreenLock } from "@/components/screen-lock-provider";
import { getSettings, saveSettings, type Settings } from "@/lib/db";
import { PALETTE_SIZES, type PaletteSize } from "@/lib/palette";
import { cn } from "@/lib/cn";

const PALETTE_HINTS: Record<PaletteSize, string> = {
  6: "剛開始塗鴉，顏色少比較好選。",
  12: "顏色不多，適合慢慢熟悉。",
  18: "顏色夠用，也不會太雜。",
  24: "一般使用，多數小朋友都適合。",
  48: "顏色很多，適合想配更多色的時候。",
};

type SettingsFieldProps = {
  legend: string;
  description: string;
  children: React.ReactNode;
};

const SettingsField = ({ legend, description, children }: SettingsFieldProps) => (
  <fieldset className="flex flex-col gap-3 rounded-[28px] border border-ink/10 bg-paper p-5">
    <legend className="px-1 font-display text-lg font-bold text-ink">{legend}</legend>
    <p className="text-sm font-semibold leading-relaxed text-ink/65">{description}</p>
    {children}
  </fieldset>
);

export const SettingsView = () => {
  const { locked } = useScreenLock();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (locked) {
      window.location.replace("/");
      return;
    }
    void getSettings().then(setSettings);
  }, [locked]);

  const handlePaletteSize = async (size: Settings["paletteSize"]) => {
    if (!settings) {
      return;
    }
    const next = { ...settings, paletteSize: size };
    setSettings(next);
    await saveSettings(next);
  };

  if (locked || !settings) {
    return <div className="min-h-dvh bg-cream" />;
  }

  return (
    <div className="relative flex h-dvh justify-center overflow-hidden bg-cream">
      <BlobDecor />
      <main className="relative mx-auto flex h-full min-h-0 w-full max-w-lg flex-col gap-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-xl">
        <header className="flex shrink-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            aria-label="回家"
            tabIndex={0}
            className="kid-press inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white font-bold text-ink shadow-kid focus-visible:outline-4 focus-visible:outline-mint"
          >
            <Home strokeWidth={3} className="h-7 w-7" />
          </a>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ink">設定</h1>
            <p className="text-sm font-semibold text-ink/60">給家長調整，小朋友畫的時候不會看到這裡。</p>
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <SettingsField
            legend="色盤數量"
            description="塗鴉頁能選的顏色顆數。年紀較小可以先選少一點，比較好選到想要的顏色。"
          >
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="色盤數量">
              {PALETTE_SIZES.map((size) => {
                const selected = settings.paletteSize === size;
                return (
                  <label
                    key={size}
                    className={cn(
                      "kid-press flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 focus-within:outline-4 focus-within:outline-mint",
                      selected ? "border-ink bg-sun" : "border-ink/10 bg-white",
                    )}
                  >
                    <input
                      type="radio"
                      name="paletteSize"
                      value={size}
                      checked={selected}
                      className="sr-only"
                      onChange={() => void handlePaletteSize(size)}
                    />
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink",
                        selected ? "bg-ink" : "bg-white",
                      )}
                      aria-hidden="true"
                    >
                      {selected ? (
                        <span className="h-2 w-2 rounded-full bg-sun" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-bold text-ink">
                        {size} 色
                      </span>
                      <span className="block text-sm font-semibold text-ink/60">
                        {PALETTE_HINTS[size]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </SettingsField>
        </form>
      </main>
    </div>
  );
};

"use client";

import { useEffect, useState } from "react";
import { PencilLine, Settings } from "lucide-react";
import { BlobDecor } from "@/components/blob-decor";
import { Gallery } from "@/components/gallery";
import { AppLink, useScreenLock } from "@/components/screen-lock-provider";
import { listArtworks, type Artwork } from "@/lib/db";
import { setPendingSession } from "@/lib/session-art";

export const HomeView = () => {
  const { locked } = useScreenLock();
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  const handleLoad = async () => {
    setArtworks(await listArtworks());
  };

  useEffect(() => {
    let cancelled = false;
    void listArtworks().then((rows) => {
      if (!cancelled) {
        setArtworks(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartBlank = () => {
    setPendingSession(null);
  };

  return (
    <div className="relative flex h-dvh justify-center overflow-hidden bg-cream">
      <BlobDecor />
      <main className="relative mx-auto flex h-full min-h-0 w-full max-w-lg flex-col gap-4 px-5 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-3xl md:gap-6 lg:max-w-5xl">
        <header className="flex shrink-0 items-center justify-center">
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl md:text-6xl">
            寶寶愛塗鴉
          </h1>
        </header>

        <AppLink
          href="/draw"
          ariaLabel="開始塗鴉"
          className="kid-press inline-flex h-[84px] w-full shrink-0 items-center justify-center rounded-[28px] bg-coral text-white shadow-kid focus-visible:outline-4 focus-visible:outline-mint md:h-24"
          onClick={handleStartBlank}
        >
          <PencilLine strokeWidth={3} className="h-10 w-10 md:h-12 md:w-12" />
        </AppLink>

        <section
          aria-label="我的畫"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <Gallery
            artworks={artworks}
            locked={locked}
            onChange={() => void handleLoad()}
          />
        </section>
      </main>

      {!locked ? (
        <div className="pointer-events-none absolute right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30">
          <div className="pointer-events-auto">
            <AppLink
              href="/settings"
              ariaLabel="設定"
              className="kid-press inline-flex h-14 w-14 items-center justify-center rounded-full bg-white font-bold text-ink shadow-kid focus-visible:outline-4 focus-visible:outline-mint md:h-16 md:w-16"
            >
              <Settings strokeWidth={3} className="h-7 w-7" />
            </AppLink>
          </div>
        </div>
      ) : null}
    </div>
  );
};

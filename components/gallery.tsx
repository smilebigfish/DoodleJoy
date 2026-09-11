"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Pencil, Trash2, X } from "lucide-react";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { deleteArtwork, type Artwork } from "@/lib/db";
import { orientationFromSize } from "@/lib/drawing";
import { setPendingSession } from "@/lib/session-art";

type GalleryProps = {
  artworks: Artwork[];
  locked?: boolean;
  onChange: () => void;
};

const LONG_PRESS_MS = 650;

const startEdit = async (art: Artwork) => {
  const url = URL.createObjectURL(art.thumbnail);
  const orientation = await new Promise<"portrait" | "landscape">((resolve) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(orientationFromSize(image.width, image.height));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("portrait");
    };
    image.src = url;
  });
  setPendingSession({
    orientation,
    editId: art.id,
  });
  // 進畫頁用整頁導向，避免舊畫布狀態殘留
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload clears canvas
  window.location.assign("/draw");
};

export const Gallery = ({ artworks, locked = false, onChange }: GalleryProps) => {
  const [active, setActive] = useState<Artwork | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Artwork | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const longPressTimer = useRef<number | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    const urls: Record<string, string> = {};
    artworks.forEach((art) => {
      urls[art.id] = URL.createObjectURL(art.thumbnail);
    });
    // blob URL 必須在 effect 建立並在 cleanup 釋放
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URLs belong in an effect
    setThumbUrls(urls);
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [artworks]);

  const handleClearTimer = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleStartPress = (art: Artwork) => {
    didLongPress.current = false;
    handleClearTimer();
    if (locked) {
      return;
    }
    longPressTimer.current = window.setTimeout(() => {
      didLongPress.current = true;
      setPendingDelete(art);
    }, LONG_PRESS_MS);
  };

  const handleDownload = (art: Artwork) => {
    const url = URL.createObjectURL(art.png);
    const link = document.createElement("a");
    link.href = url;
    link.download = `doodlejoy-${art.id}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    await deleteArtwork(pendingDelete.id);
    setPendingDelete(null);
    setActive(null);
    onChange();
  };

  if (artworks.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto overscroll-contain rounded-[32px] border-4 border-dashed border-ink/15 bg-white/70 px-6 py-6">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-sun"
          aria-hidden="true"
        >
          <div className="relative h-12 w-16">
            <span className="absolute left-2 top-2 h-3 w-3 rounded-full bg-ink" />
            <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-ink" />
            <span className="absolute bottom-1 left-1/2 h-6 w-10 -translate-x-1/2 rounded-b-full border-4 border-ink border-t-0" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {artworks.map((art) => (
          <button
            key={art.id}
            type="button"
            tabIndex={0}
            aria-label="打開畫作"
            onClick={() => {
              if (didLongPress.current) {
                didLongPress.current = false;
                return;
              }
              setActive(art);
            }}
            onPointerDown={() => handleStartPress(art)}
            onPointerUp={handleClearTimer}
            onPointerLeave={handleClearTimer}
            className="kid-press overflow-hidden rounded-[28px] border-4 border-ink/10 bg-paper shadow-kid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrls[art.id]}
              alt=""
              className="aspect-square h-auto w-full bg-paper object-contain"
            />
          </button>
        ))}
        </div>
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="畫作"
        >
          <div className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-3 rounded-[32px] bg-cream p-4">
            <button
              type="button"
              tabIndex={0}
              aria-label="繼續畫"
              className="overflow-hidden rounded-[24px] bg-paper"
              onClick={() => void startEdit(active)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrls[active.id]}
                alt="畫作"
                className="max-h-[50dvh] w-full object-contain"
              />
            </button>
            <div className={locked ? "grid grid-cols-3 gap-2" : "grid grid-cols-4 gap-2"}>
              <button
                type="button"
                tabIndex={0}
                aria-label="關掉"
                className="kid-press flex h-16 items-center justify-center rounded-[24px] bg-white text-ink shadow-kid"
                onClick={() => setActive(null)}
              >
                <X strokeWidth={3} className="h-7 w-7" />
              </button>
              <button
                type="button"
                tabIndex={0}
                aria-label="繼續畫"
                className="kid-press flex h-16 items-center justify-center rounded-[24px] bg-coral text-white shadow-kid"
                onClick={() => void startEdit(active)}
              >
                <Pencil strokeWidth={3} className="h-7 w-7" />
              </button>
              <button
                type="button"
                tabIndex={0}
                aria-label="下載"
                className="kid-press flex h-16 items-center justify-center rounded-[24px] bg-sun text-ink shadow-kid"
                onClick={() => handleDownload(active)}
              >
                <Download strokeWidth={3} className="h-7 w-7" />
              </button>
              {locked ? null : (
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="丟掉"
                  className="kid-press flex h-16 items-center justify-center rounded-[24px] bg-white text-ink shadow-kid"
                  onClick={() => setPendingDelete(active)}
                >
                  <Trash2 strokeWidth={3} className="h-7 w-7" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmSheet
          title="這張畫丟掉嗎？"
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
};

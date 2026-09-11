"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LOCK_KEY = "doodlejoy-locked";

type ScreenLockContextValue = {
  locked: boolean;
  lock: () => Promise<void>;
  unlock: () => Promise<void>;
  refreshGuards: () => Promise<void>;
};

const ScreenLockContext = createContext<ScreenLockContextValue | null>(null);

const enterFullscreen = async () => {
  if (document.fullscreenElement) {
    return;
  }
  const root = document.documentElement;
  try {
    await root.requestFullscreen({ navigationUI: "hide" });
  } catch {
    try {
      await root.requestFullscreen();
    } catch {
      /* 瀏覽器可能拒絕全螢幕 */
    }
  }
};

export const ScreenLockProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const persist = (next: boolean) => {
    lockedRef.current = next;
    if (next) {
      sessionStorage.setItem(LOCK_KEY, "1");
    } else {
      sessionStorage.removeItem(LOCK_KEY);
    }
    setLocked(next);
  };

  const applyGuards = useCallback(async () => {
    await enterFullscreen();
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* 可忽略 */
    }
    wakeLockRef.current = null;
    try {
      if (navigator.wakeLock) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* 可忽略 */
    }
  }, []);

  const releaseGuards = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      /* 可忽略 */
    }
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* 可忽略 */
    }
    wakeLockRef.current = null;
  };

  useEffect(() => {
    const wasLocked = sessionStorage.getItem(LOCK_KEY) === "1";
    if (!wasLocked) {
      return;
    }
    // sessionStorage 只能在掛載後讀，避免 SSR / hydration 不一致
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore lock flag from sessionStorage
    persist(true);
    void applyGuards();
  }, [applyGuards]);

  useEffect(() => {
    document.documentElement.dataset.screenLocked = locked ? "1" : "0";
    return () => {
      document.documentElement.dataset.screenLocked = "0";
    };
  }, [locked]);

  useEffect(() => {
    if (!locked) {
      return;
    }
    const handleWake = () => {
      if (lockedRef.current && document.visibilityState === "visible") {
        void applyGuards();
      }
    };
    const handleFullscreen = () => {
      if (!lockedRef.current || document.fullscreenElement) {
        return;
      }
      void applyGuards();
    };
    document.addEventListener("visibilitychange", handleWake);
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => {
      document.removeEventListener("visibilitychange", handleWake);
      document.removeEventListener("fullscreenchange", handleFullscreen);
    };
  }, [locked, applyGuards]);

  useEffect(() => {
    if (!locked || pathname !== "/draw") {
      return;
    }
    const handleTouchMove = (event: TouchEvent) => {
      if (event.target instanceof Element && event.target.closest(".palette-scroll")) {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [locked, pathname]);

  const lock = useCallback(async () => {
    persist(true);
    await applyGuards();
  }, [applyGuards]);

  const unlock = useCallback(async () => {
    persist(false);
    await releaseGuards();
  }, []);

  const value = useMemo(
    () => ({ locked, lock, unlock, refreshGuards: applyGuards }),
    [locked, lock, unlock, applyGuards],
  );

  return (
    <ScreenLockContext.Provider value={value}>
      {children}
    </ScreenLockContext.Provider>
  );
};

export const useScreenLock = () => {
  const context = useContext(ScreenLockContext);
  if (!context) {
    throw new Error("useScreenLock 必須在 ScreenLockProvider 內");
  }
  return context;
};

type AppLinkProps = {
  href: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export const AppLink = ({
  href,
  ariaLabel,
  className,
  children,
  onClick,
}: AppLinkProps) => {
  const { locked, refreshGuards } = useScreenLock();
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      tabIndex={0}
      className={className}
      onClick={() => {
        onClick?.();
        if (locked) {
          void refreshGuards();
        }
      }}
    >
      {children}
    </Link>
  );
};

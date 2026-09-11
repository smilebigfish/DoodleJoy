"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const LOCK_KEY = "doodlejoy-locked";

type ScreenLockContextValue = {
  locked: boolean;
  lock: () => Promise<void>;
  unlock: () => Promise<void>;
};

const ScreenLockContext = createContext<ScreenLockContextValue | null>(null);

export const ScreenLockProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [locked, setLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const persist = (next: boolean) => {
    if (next) {
      sessionStorage.setItem(LOCK_KEY, "1");
    } else {
      sessionStorage.removeItem(LOCK_KEY);
    }
    setLocked(next);
  };

  const requestGuards = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* 瀏覽器可能拒絕全螢幕 */
    }
    try {
      if (navigator.wakeLock) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* 可忽略 */
    }
  };

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
    void requestGuards();
  }, []);

  useEffect(() => {
    if (!locked) {
      return;
    }
    const handlePop = () => {
      history.pushState(null, "", location.href);
    };
    history.pushState(null, "", location.href);
    window.addEventListener("popstate", handlePop);
    const handleWake = () => {
      if (document.visibilityState === "visible") {
        void navigator.wakeLock
          ?.request("screen")
          .then((sentinel) => {
            wakeLockRef.current = sentinel;
          })
          .catch(() => {
            /* 可忽略 */
          });
      }
    };
    document.addEventListener("visibilitychange", handleWake);
    return () => {
      window.removeEventListener("popstate", handlePop);
      document.removeEventListener("visibilitychange", handleWake);
    };
  }, [locked]);

  const lock = useCallback(async () => {
    persist(true);
    await requestGuards();
  }, []);

  const unlock = useCallback(async () => {
    persist(false);
    await releaseGuards();
  }, []);

  const value = useMemo(
    () => ({ locked, lock, unlock }),
    [locked, lock, unlock],
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

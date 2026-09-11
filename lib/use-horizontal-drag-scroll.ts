"use client";

import { useRef } from "react";

const DRAG_THRESHOLD = 8;

export const useHorizontalDragScroll = () => {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: node.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    const drag = dragRef.current;
    if (!node || drag.pointerId !== event.pointerId) {
      return;
    }
    const delta = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) > DRAG_THRESHOLD) {
      drag.moved = true;
      node.setPointerCapture(event.pointerId);
    }
    if (drag.moved) {
      node.scrollLeft = drag.startScroll - delta;
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    const drag = dragRef.current;
    if (node && drag.pointerId === event.pointerId && node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      drag.moved = false;
      drag.pointerId = null;
    }, 0);
  };

  const didDrag = () => dragRef.current.moved;

  return {
    scrollRef: ref,
    didDrag,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

const MIN_SCALE = 0.08;
const MAX_SCALE = 2;
const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
type TrackpadGesture = Event & { scale: number; clientX: number; clientY: number };

export function useBracketViewport(width: number, height: number, collapsed: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [autoFit, setAutoFit] = useState(true);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const style = getComputedStyle(viewport);
    const availableWidth = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const next = clampScale(Math.min(1, availableWidth / width, availableHeight / height));
    scaleRef.current = next;
    setScale(next);
    viewport.scrollTo(0, 0);
  }, [width, height]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !autoFit || collapsed) return;
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [autoFit, collapsed, fit]);

  // Keep the diagram point under the fingers stationary as its scale changes.
  const zoomAt = useCallback((requestedScale: number, clientX?: number, clientY?: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = clampScale(requestedScale);
    const rect = viewport.getBoundingClientRect();
    const style = getComputedStyle(viewport);
    const x = (clientX ?? rect.left + viewport.clientWidth / 2) - rect.left - viewport.clientLeft - parseFloat(style.paddingLeft);
    const y = (clientY ?? rect.top + viewport.clientHeight / 2) - rect.top - viewport.clientTop - parseFloat(style.paddingTop);
    const diagramX = (viewport.scrollLeft + x) / scaleRef.current;
    const diagramY = (viewport.scrollTop + y) / scaleRef.current;
    scaleRef.current = next;
    // Native gesture listeners need the resized stage before setting its scroll offsets.
    flushSync(() => {
      setAutoFit(false);
      setScale(next);
    });
    viewport.scrollLeft = diagramX * next - x;
    viewport.scrollTop = diagramY * next - y;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || collapsed) return;
    let gestureStartScale: number | null = null;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return; // Two-finger panning uses native overflow scrolling.
      event.preventDefault();
      if (gestureStartScale !== null) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
      zoomAt(scaleRef.current * Math.exp(-delta * 0.01), event.clientX, event.clientY);
    };
    const gestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartScale = scaleRef.current;
    };
    const gestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as TrackpadGesture;
      if (gestureStartScale !== null && Number.isFinite(gesture.scale)) {
        zoomAt(gestureStartScale * gesture.scale, gesture.clientX, gesture.clientY);
      }
    };
    const gestureEnd = (event: Event) => {
      event.preventDefault();
      gestureStartScale = null;
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    // Safari sends gesture events instead of Chromium's ctrl+wheel pinch events.
    viewport.addEventListener('gesturestart', gestureStart, { passive: false });
    viewport.addEventListener('gesturechange', gestureChange, { passive: false });
    viewport.addEventListener('gestureend', gestureEnd, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', wheel);
      viewport.removeEventListener('gesturestart', gestureStart);
      viewport.removeEventListener('gesturechange', gestureChange);
      viewport.removeEventListener('gestureend', gestureEnd);
    };
  }, [collapsed, zoomAt]);

  return {
    viewportRef,
    scale,
    autoFit,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    changeScale: (difference: number) => zoomAt(scaleRef.current + difference),
    enableAutoFit: () => {
      setAutoFit(true);
      fit();
    },
    resetScale: () => {
      zoomAt(1);
      viewportRef.current?.scrollTo(0, 0);
    },
  };
}

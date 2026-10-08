'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export function useEventScheduleStream(eventId: string | undefined, refresh: () => Promise<unknown>) {
  const [connected, setConnected] = useState(false);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    setConnected(false);
    if (!eventId || typeof EventSource === 'undefined') return;
    let source: EventSource | undefined;
    let lastMessageAt = Date.now();
    let refreshing = false;
    let refreshPending = false;
    let active = true;

    const refreshSchedule = async () => {
      refreshPending = true;
      if (refreshing) return;
      refreshing = true;
      try {
        while (active && refreshPending) {
          refreshPending = false;
          await refreshRef.current().catch(() => undefined);
        }
      } finally {
        refreshing = false;
      }
    };
    const close = () => {
      source?.close();
      source = undefined;
      setConnected(false);
    };
    const connect = () => {
      if (!active || document.visibilityState === 'hidden' || source) return;
      const baseUrl = String(api.defaults.baseURL || '/api').replace(/\/$/, '');
      source = new EventSource(`${baseUrl}/matches/event/${encodeURIComponent(eventId)}/stream`);
      lastMessageAt = Date.now();
      source.addEventListener('ready', () => {
        lastMessageAt = Date.now();
        setConnected(true);
        // A fresh snapshot also recovers events missed while disconnected/hidden.
        void refreshSchedule();
      });
      source.addEventListener('schedule-changed', () => {
        lastMessageAt = Date.now();
        void refreshSchedule();
      });
      source.addEventListener('heartbeat', () => { lastMessageAt = Date.now(); });
      source.onerror = () => { setConnected(false); };
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') close();
      else connect();
    };
    connect();
    const watchdog = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      // Recover even when a proxy silently stops delivering the stream, or the
      // browser stops retrying an unsuccessful HTTP response.
      if (source && Date.now() - lastMessageAt > 45_000) close();
      connect();
    }, 10_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      source?.close();
      window.clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [eventId]);

  return { connected };
}

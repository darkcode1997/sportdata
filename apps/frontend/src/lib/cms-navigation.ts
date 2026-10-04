import type { MouseEvent } from 'react';

export function withCmsReturnTo(href: string, returnTo: string) {
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

export function resolveCmsReturnTo(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/cms/') || value.startsWith('//')) return fallback;
  try {
    const url = new URL(value, 'http://sportdata.local');
    if (url.origin !== 'http://sportdata.local' || !url.pathname.startsWith('/cms/')) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function openCmsScoreboard(event: MouseEvent<HTMLElement>, matchId: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  event.stopPropagation();
  const target = 'sportdata-scoreboard';
  // Returning from a scoreboard to the schedule retains the tab name.
  // Free that name so the schedule cannot become its own scoreboard target.
  if (window.name === target) window.name = '';
  window.open(`/cms/matches/${encodeURIComponent(matchId)}/scoreboard`, target)?.focus();
}

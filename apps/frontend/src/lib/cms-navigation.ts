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

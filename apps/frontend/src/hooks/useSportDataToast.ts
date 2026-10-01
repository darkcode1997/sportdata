'use client';

import { App } from 'antd';

/** Toast scoped to the nearest SportData theme provider (public site or CMS). */
export function useSportDataToast() {
  return App.useApp().message;
}

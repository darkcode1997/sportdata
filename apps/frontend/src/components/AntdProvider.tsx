'use client';

import { App, ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

export type SportdataColorMode = 'light' | 'dark';

export function applyDocumentColorMode(mode: SportdataColorMode) {
  if (typeof document === 'undefined') return;
  const background = mode === 'light' ? '#f4f7fb' : '#070b16';
  document.documentElement.dataset.appTheme = mode;
  document.documentElement.style.backgroundColor = background;
  document.documentElement.style.colorScheme = mode;
  document.body.style.backgroundColor = background;
}

export function createSportdataTheme(mode: SportdataColorMode): ThemeConfig {
  const isLight = mode === 'light';

  return {
    inherit: false,
    algorithm: isLight ? theme.defaultAlgorithm : theme.darkAlgorithm,
    cssVar: { prefix: 'sportdata' },
    token: {
      colorPrimary: '#00a6f0',
      colorInfo: '#00a6f0',
      colorSuccess: '#10b981',
      colorWarning: '#f59e0b',
      colorError: '#ef4444',
      colorBgBase: isLight ? '#f4f7fb' : '#070b16',
      colorBgLayout: isLight ? '#f4f7fb' : '#070b16',
      colorBgContainer: isLight ? '#ffffff' : '#11182a',
      colorBgElevated: isLight ? '#ffffff' : '#182238',
      colorBorder: isLight ? '#cbd5e1' : '#2b3853',
      colorBorderSecondary: isLight ? '#e2e8f0' : '#202c43',
      colorText: isLight ? '#0f172a' : '#f1f5f9',
      colorTextSecondary: isLight ? '#475569' : '#9aa9c2',
      colorTextTertiary: isLight ? '#64748b' : '#70819f',
      borderRadius: 12,
      borderRadiusLG: 18,
      fontFamily: '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif',
      controlHeight: 42,
      controlHeightLG: 48,
      boxShadowSecondary: isLight
        ? '0 24px 64px -28px rgba(15, 23, 42, 0.28)'
        : '0 24px 64px -28px rgba(0, 0, 0, 0.72)',
    },
    components: {
      Button: {
        fontWeight: 700,
        primaryShadow: '0 12px 30px -12px rgba(0, 166, 240, 0.7)',
        defaultBg: isLight ? '#ffffff' : '#182238',
        defaultBorderColor: isLight ? '#cbd5e1' : '#334361',
      },
      Card: {
        colorBgContainer: isLight ? '#ffffff' : '#11182a',
        headerBg: 'transparent',
        headerFontSize: 17,
      },
      Form: {
        labelColor: isLight ? '#334155' : '#dbe7f8',
        labelFontSize: 14,
        itemMarginBottom: 20,
      },
      Input: {
        colorBgContainer: isLight ? '#ffffff' : '#0b1221',
        activeBorderColor: '#22b8f7',
        hoverBorderColor: '#147fc1',
      },
      Layout: {
        bodyBg: isLight ? '#f4f7fb' : '#070b16',
        headerBg: isLight ? '#ffffff' : '#0d1425',
        siderBg: isLight ? '#ffffff' : '#0d1425',
      },
      Menu: {
        itemBg: isLight ? '#ffffff' : '#0d1425',
        itemSelectedBg: isLight ? '#e0f2fe' : 'rgba(0, 166, 240, 0.2)',
        itemSelectedColor: isLight ? '#0369a1' : '#67d2ff',
        itemHoverBg: isLight ? '#f1f5f9' : 'rgba(255,255,255,.055)',
        darkItemBg: '#0d1425',
        darkItemSelectedBg: 'rgba(0, 166, 240, 0.2)',
        darkItemSelectedColor: '#67d2ff',
        darkItemHoverBg: 'rgba(255,255,255,.055)',
        itemBorderRadius: 12,
      },
      Modal: {
        contentBg: isLight ? '#ffffff' : '#12152a',
        headerBg: isLight ? '#ffffff' : '#12152a',
      },
      Table: {
        colorBgContainer: isLight ? '#ffffff' : '#11182a',
        headerBg: isLight ? '#f1f5f9' : '#172137',
        headerColor: isLight ? '#475569' : '#afbdd2',
        borderColor: isLight ? '#e2e8f0' : '#202c43',
        rowHoverBg: isLight ? '#f8fafc' : '#151f34',
        cellPaddingBlock: 15,
      },
      Select: {
        selectorBg: isLight ? '#ffffff' : '#0b1221',
        optionSelectedBg: isLight ? '#e0f2fe' : 'rgba(0, 166, 240, 0.18)',
      },
    },
  };
}

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={createSportdataTheme('dark')}
    >
      <App message={{ top: 76, duration: 4, maxCount: 3 }}>{children}</App>
    </ConfigProvider>
  );
}

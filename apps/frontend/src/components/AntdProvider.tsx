'use client';

import { App, ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.darkAlgorithm,
        cssVar: { prefix: 'sportdata' },
        token: {
          colorPrimary: '#00a6f0',
          colorInfo: '#00a6f0',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorBgBase: '#070b16',
          colorBgLayout: '#070b16',
          colorBgContainer: '#11182a',
          colorBgElevated: '#182238',
          colorBorder: '#2b3853',
          colorBorderSecondary: '#202c43',
          colorText: '#f1f5f9',
          colorTextSecondary: '#9aa9c2',
          colorTextTertiary: '#70819f',
          borderRadius: 12,
          borderRadiusLG: 18,
          fontFamily: '"Google Sans Flex", "Segoe UI", system-ui, sans-serif',
          controlHeight: 42,
          controlHeightLG: 48,
          boxShadowSecondary: '0 24px 64px -28px rgba(0, 0, 0, 0.72)',
        },
        components: {
          Button: {
            fontWeight: 700,
            primaryShadow: '0 12px 30px -12px rgba(0, 166, 240, 0.7)',
            defaultBg: '#182238',
            defaultBorderColor: '#334361',
          },
          Card: {
            colorBgContainer: '#11182a',
            headerBg: 'transparent',
            headerFontSize: 17,
          },
          Form: {
            labelColor: '#dbe7f8',
            labelFontSize: 14,
            itemMarginBottom: 20,
          },
          Input: {
            colorBgContainer: '#0b1221',
            activeBorderColor: '#22b8f7',
            hoverBorderColor: '#147fc1',
          },
          Layout: {
            bodyBg: '#070b16',
            headerBg: '#0d1425',
            siderBg: '#0d1425',
          },
          Menu: {
            darkItemBg: '#0d1425',
            darkItemSelectedBg: 'rgba(0, 166, 240, 0.2)',
            darkItemSelectedColor: '#67d2ff',
            darkItemHoverBg: 'rgba(255,255,255,.055)',
            itemBorderRadius: 12,
          },
          Modal: {
            contentBg: '#12152a',
            headerBg: '#12152a',
          },
          Table: {
            colorBgContainer: '#11182a',
            headerBg: '#172137',
            headerColor: '#afbdd2',
            borderColor: '#202c43',
            rowHoverBg: '#151f34',
            cellPaddingBlock: 15,
          },
          Select: {
            selectorBg: '#0b1221',
            optionSelectedBg: 'rgba(0, 166, 240, 0.18)',
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}

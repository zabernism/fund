import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 保留移动端（TERMINAL.A）原有字面量令牌（up/down/cost/primary/flat），
      // 移动端组件依赖它们的不透明度修饰（bg-primary/10 等），不能改为变量。
      colors: {
        up: '#ef4444',
        down: '#10b981',
        flat: '#8b919e',
        cost: '#f59e0b',
        primary: '#bec6e0',
        // —— 桌面端（ALPHA）Material 3 角色令牌 ——
        // 全部指向 globals.css 中的 --al-* CSS 变量，随主题（light/dark/eye）翻转。
        'market-up': 'var(--price-up)',
        'market-down': 'var(--price-down)',
        background: 'var(--al-bg)',
        surface: 'var(--al-surface)',
        'surface-dim': 'var(--al-surface-dim)',
        'surface-bright': 'var(--al-surface-bright)',
        'surface-container': 'var(--al-sc)',
        'surface-container-low': 'var(--al-sc-low)',
        'surface-container-lowest': 'var(--al-sc-lowest)',
        'surface-container-high': 'var(--al-sc-high)',
        'surface-container-highest': 'var(--al-sc-highest)',
        'surface-variant': 'var(--al-sv)',
        'on-surface': 'var(--al-on-surface)',
        'on-surface-variant': 'var(--al-on-surface-variant)',
        'on-background': 'var(--al-on-surface)',
        outline: 'var(--al-outline)',
        'outline-variant': 'var(--al-outline-variant)',
        secondary: 'var(--al-secondary)',
        'on-secondary': 'var(--al-on-secondary)',
        'secondary-container': 'var(--al-secondary-container)',
        'on-secondary-container': 'var(--al-on-secondary-container)',
        tertiary: 'var(--al-tertiary)',
        'on-tertiary': 'var(--al-on-tertiary)',
        'tertiary-container': 'var(--al-tertiary-container)',
        'on-tertiary-container': 'var(--al-on-tertiary-container)',
        'primary-container': 'var(--al-primary-container)',
        'on-primary-container': 'var(--al-on-primary-container)',
        'on-primary': 'var(--al-on-primary)',
        'inverse-surface': 'var(--al-inverse-surface)',
        'inverse-on-surface': 'var(--al-inverse-on-surface)',
        'inverse-primary': 'var(--al-inverse-primary)',
        'surface-tint': 'var(--al-surface-tint)',
        error: 'var(--al-error)',
        'on-error': 'var(--al-on-error)',
        'error-container': 'var(--al-error-container)',
        'on-error-container': 'var(--al-on-error-container)',
      },
      // 参考设计的响应式间距（不覆盖移动端默认间距）
      spacing: {
        'container-padding': '16px',
        unit: '4px',
        gutter: '8px',
        'component-gap': '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        'display-lg': ['"Hanken Grotesk"', 'Inter', 'sans-serif'],
        'display-sm': ['"Hanken Grotesk"', 'Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'label-caps': ['Inter', 'sans-serif'],
        'data-mono': ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'display-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'label-caps': ['11px', { lineHeight: '16px', fontWeight: '600' }],
        'display-sm': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'data-mono': [
          '13px',
          { lineHeight: '16px', letterSpacing: '-0.02em', fontWeight: '500' },
        ],
      },
    },
  },
  plugins: [],
};

export default config;

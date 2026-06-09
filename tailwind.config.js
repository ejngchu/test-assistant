/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './src/**/*.{tsx,ts,jsx,js}',
    './src/components/**/*.{tsx,ts}',
  ],
  corePlugins: {
    preflight: process.env.TARO_ENV === 'h5' ? true : false,
  },
  darkMode: ['class', '.dark'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        radius: 'var(--radius)',
        // 语义色（error/success/warning/info）—— Code Review 2026-06-09 修复
        // 之前缺失导致 bg-error/text-error/border-success 等类不生成 CSS，
        // 题目卡片/状态标签/练习结果的背景和文字变成白色不可见
        error: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
        borderRadius: {
          DEFAULT: 'var(--radius-md)',
          sm: 'var(--radius-sm)',
          md: 'var(--radius-md)',
          lg: 'var(--radius-lg)',
          xl: 'var(--radius-xl)',
          '2xl': 'var(--radius-2xl)',
        },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

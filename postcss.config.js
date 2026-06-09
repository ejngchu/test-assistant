module.exports = {
  plugins: {
    // Tailwind v3
    // 2026-06-09：回退到 v3，v4 的 @config 不解析嵌套 color 对象
    // （error/success/warning/info 完全没生成 CSS，导致 WeApp 题目卡片白字）
    tailwindcss: {},
    autoprefixer: {},
  },
}

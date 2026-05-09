# 学习助手小程序设计指南

## 1. 品牌定位

**产品定位**：专为上海小学三年级学生设计的学习助手小程序
**目标用户**：8-9岁儿童（小学三年级）
**设计理念**：趣味、友好、鼓励性，帮助孩子建立学习信心

## 2. 设计风格

采用**趣味圆润**风格，特点：
- 童趣亲切、轻松愉悦
- 大圆角、柔和阴影
- 色彩丰富但不刺眼
- 鼓励性的界面设计

## 3. 配色方案

### 主色板（Primary Colors）
```css
/* 学习主题主色 - 活力橙 */
--primary: #F59E0B          /* 琥珀黄/活力橙 */
--primary-foreground: #FFFFFF

/* 主题辅助色 */
--secondary: #10B981        /* 翡翠绿 - 正确/成功 */
--accent: #8B5CF6           /* 紫罗兰 - 重点标记 */

/* 科目专属色 */
--subject-chinese: #EF4444   /* 红色 - 语文 */
--subject-math: #3B82F6     /* 蓝色 - 数学 */
--subject-english: #10B981   /* 绿色 - 英语 */
```

### 语义色（Semantic Colors）
```css
/* 成功/正确 */
--success: #10B981           /* 翡翠绿 */
--success-light: #D1FAE5      /* 浅绿背景 */

/* 警告/提醒 */
--warning: #F59E0B           /* 琥珀黄 */
--warning-light: #FEF3C7     /* 浅黄背景 */

/* 错误/错题 */
--error: #EF4444             /* 红色 */
--error-light: #FEE2E2       /* 浅红背景 */

/* 进度/进行中 */
--info: #3B82F6              /* 蓝色 */
--info-light: #DBEAFE         /* 浅蓝背景 */
```

### 中性色（Neutral Colors）
```css
/* 文字色 */
--foreground: #1F2937        /* 深灰 - 主文字 */
--muted-foreground: #6B7280  /* 中灰 - 次要文字 */

/* 背景色 */
--background: #FAFAF9        /* 暖白 - 页面背景 */
--surface: #FFFFFF           /* 纯白 - 卡片背景 */
--surface-container: #F5F5F4 /* 石灰白 - 输入框背景 */

/* 边框 */
--border: #E5E7EB            /* 浅灰边框 */
--ring: #F59E0B              /* 焦点环 - 与主色一致 */
```

## 4. 字体规范

```css
/* 全局字体 */
--font-sans: "Quicksand", "Noto Sans SC", system-ui, sans-serif;

/* 标题层级 */
.title-xl: text-xl font-bold   /* 页面大标题 */
.title-lg: text-lg font-bold    /* 卡片标题 */
.title-md: text-base font-semibold /* 区块标题 */
.body: text-sm font-normal     /* 正文 */
.caption: text-xs font-normal  /* 辅助说明 */
```

## 5. 间距系统

```css
/* 页面边距 */
--page-padding: 16px (px-4)

/* 卡片间距 */
--card-gap: 12px (gap-3)

/* 组件内间距 */
--card-padding: 16px (p-4)
--button-padding: 12px vertical (py-3)

/* 元素间距 */
--element-gap-sm: 8px (gap-2)
--element-gap-md: 12px (gap-3)
--element-gap-lg: 16px (gap-4)
```

## 6. 圆角与阴影

```css
/* 圆角 - 采用大圆角设计 */
--radius-sm: 8px    /* 小按钮/标签 */
--radius-md: 12px   /* 输入框/小卡片 */
--radius-lg: 16px   /* 主卡片/弹窗 */
--radius-xl: 24px   /* 大卡片/首页模块 */
--radius-full: 9999px /* 圆形按钮/Badge */

/* 阴影 - 柔和卡片阴影 */
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06)
--shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.08)
```

## 7. 组件使用原则

### 通用组件选型约束
- **按钮**：统一使用 `@/components/ui/button`，支持 primary/secondary/destructive 变体
- **输入框**：统一使用 `@/components/ui/input`，样式为 border-none + bg-surface-container
- **卡片**：统一使用 `@/components/ui/card`，配合 subject-* 颜色区分科目
- **标签/Badge**：使用 `@/components/ui/badge` 展示科目标签、状态标签
- **对话框**：使用 `@/components/ui/dialog` 用于确认操作
- **Toast 提示**：使用 `@/components/ui/sonner` 用于操作反馈
- **Tabs 切换**：使用 `@/components/ui/tabs` 用于科目切换、状态切换

### 业务组件选型
- **拍照按钮**：大尺寸圆角按钮，带相机图标
- **科目选择器**：三个科目卡片（语文/数学/英语），带科目专属色
- **错题卡片**：带错误标记、科目标签、知识点标签
- **复习提醒卡片**：带倒计时、记忆曲线图标、状态标签
- **习题卡片**：带题目、选项、提交按钮、正确答案展示

## 8. 页面结构

### 页面清单
1. **首页 (index)** - 学习中心主页面
2. **作业提交 (homework)** - 拍照提交作业
3. **作业结果 (homework-result)** - 作业检查结果
4. **错题本 (mistakes)** - 错题列表
5. **错题详情 (mistake-detail)** - 单道错题分析
6. **复习提醒 (review)** - 记忆曲线复习计划
7. **练习中心 (practice)** - 同类习题练习
8. **练习答题 (practice-answer)** - 答题页面

### TabBar 导航结构
```
pages/index/index      → 首页
pages/homework/index   → 作业提交
pages/mistakes/index   → 错题本
pages/review/index     → 复习提醒
pages/practice/index   → 练习中心
```

## 9. 功能模块设计

### 9.1 拍照提交作业
- 科目选择：语文/数学/英语（三色卡片）
- 拍照上传：调用相机拍照
- AI 检查：识别作业完成情况
- 结果展示：正确/错误标记、提示信息

### 9.2 错题记录与分析
- 拍照录入错题
- AI 分析知识点
- 标记知识盲点
- 查看错题详情

### 9.3 卡思宾记忆曲线复习
- 复习计划列表
- 倒计时提醒
- 记忆周期：1天/3天/7天/14天/30天
- 已复习/待复习状态

### 9.4 同类习题练习
- 根据薄弱知识点生成
- 定时练习任务
- 正确率统计
- 知识点巩固追踪

## 10. 状态设计

### 空状态
- 友好的插画/图标
- 鼓励性文案（如"还没有错题，继续保持！"）
- 引导操作按钮

### 加载状态
- 使用 Skeleton 骨架屏
- 避免纯 loading spinner

### 错误状态
- 友好的错误提示
- 重试按钮

## 11. 小程序特殊约束

### 包体积限制
- 静态资源必须上传 TOS，使用 URL 引用
- 仅 TabBar 图标可放在本地

### 性能优化
- 图片懒加载
- 列表虚拟滚动（长列表）
- 避免频繁 setData

### 跨端兼容
- 使用 Taro 跨端组件
- 平台检测处理差异

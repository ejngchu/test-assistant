# 会话总结 · 2026-06-09

> **本会话定位**：
> 1. 全面 Code Review + WeApp 兼容修复（opencode + 寇豆码协作）
> 2. **白字问题**（顽固问题）的真正根因定位 + Tailwind v3 回退
> 3. **新需求 6 项**（V-01..V-06）+ **建议功能 4 项**（V-07..V-10）+ **边缘化要求 1 项**——写入 `PHASE4-PLAN-2026-06-09-v1.0.md`
> 4. **文档重组**：handover/MVP/旧 phase plan 全部归档或归并

---

## 一、Code Review 10 项修复（9 + 1）

### 1.1 修复状态

| # | 问题 | 修复方 | 状态 |
|---|------|--------|------|
| 1 | `<Text>` 嵌套 `<Text>` | opencode 重构为平级 | ✅ |
| 2 | `sticky top-0` WeApp 不支持 | opencode 移除 | ✅ |
| 3 | `window.open()` WeApp 静默 | opencode 平台分支 | ✅ |
| 4 | 4 段硬编码占位符（65%/除法/余数）| opencode 走动态数据 | ✅ |
| 5 | `saveMistakesToBook` 不调后端 | opencode 加 `POST /mistake/save` | ✅ |
| 6 | `fetchMistakes()` 空壳 | opencode 真实 GET + 容错 | ✅ |
| 7 | `MistakeItem` 缺字段 | opencode 补 `questionText/status/hint/learningSuggestion` | ✅ |
| 8 | `markAsMastered` 不调后端 | opencode 改调 `review/complete` | ✅ |
| 9 | `saveMistake` POST body 缺字段 | opencode 补全 | ✅ |
| 10 | `switch transition` WeApp 不支持 | 寇豆码 移除 | ✅ |

### 1.2 验证推翻的误报

- Switch 背景色在 WeApp 不变化 → ❌ Taro 4 序列化 style 到 WXML
- 动态 inline style 在 WeApp 不工作 → ❌ Taro 4 WeApp 支持 style prop
- `space-y-*` / `bg-opacity-*` 不工作 → ❓（白字问题修复后已确证 v3 完美工作）

---

## 二、白字问题（顽固 3 次）根因 + 修复

### 2.1 完整根因链

```
Tailwind v4 + @config 导入 v3 配置
  ↓
v4 的 @config 不解析 theme.extend.colors 中的嵌套 color 对象
  ↓
error/success/warning/info 四个语义色完全没生成 CSS
  ↓
47 处业务代码用 bg-error bg-opacity-10 等类名
  ↓
v4 编译产物中 className 被原样保留为字面量
  ↓
微信小程序 WXSS 中 background-color: bg-error bg-opacity-10 → 无色（透明）
  ↓
文字色继承白色 → 不可见
```

### 2.2 决定性验证

```bash
$ grep -c 'bg-error\|bg-success\|bg-warning\|bg-info' dist/app-origin.wxss
0   # v4 编译产物 0 处

$ grep -oE '\.(bg|text)-(error|success|warning|info)\b\{[^}]*\}' dist/app-origin.wxss
.bg-error{...background-color:rgba(239, 68, 68, ...)}   # v3 编译产物 4 处 bg + 4 处 text
.bg-info{...}
.bg-success{...}
.bg-warning{...}
.text-error{...}
.text-info{...}
.text-success{...}
.text-warning{...}
```

### 2.3 评估两条路后选择：回退 v3

| 方案 | 改动 | 风险 | 时间 |
|------|------|------|------|
| **A. 回退 v3**（采用） | 4 个配置文件 | 低 | 1-2h |
| B. 兼容 v4 | 47 处业务代码 | 中高 | 4-8h |

### 2.4 改动 4 文件

| 文件 | 改动 |
|------|------|
| `package.json` | `tailwindcss@^4.1.18` → `^3.4.17`；保留 `@tailwindcss/postcss@^4.1.18`（仅作 `weapp-tailwindcss@4.12.0` 的 peer dep）|
| `postcss.config.js` | `'@tailwindcss/postcss'` → `'tailwindcss'` |
| `config/index.ts` | import 来源改为 `tailwindcss` |
| `tailwind.config.js` | 加 `error`/`success`/`warning`/`info` 简单字符串色值 |
| `src/app.css` | v4 语法 → v3 语法（`@tailwind base/components/utilities`）|
| `src/components/ui/switch.tsx` | 移除 `transition: 'transform 0.2s'`（Code Review #10 修复）|

### 2.5 weapp-tailwindcss 4.12 隐藏依赖确认

| 操作 | 结果 |
|------|------|
| 移除 `@tailwindcss/postcss`，保留 v3 | ❌ `Unable to locate Tailwind CSS package "@tailwindcss/postcss"` |
| 装回 `@tailwindcss/postcss`，保留 v3 | ✅ 编译成功 |

源码确认：`tailwindcss-patch@9.0.1/dist/validate-*.js:2560` 直接 throw。

**结论**：`@tailwindcss/postcss` 在 v3 流程中不参与 PostCSS 编译（`postcss.config.js` 走 `tailwindcss` 插件），只是 weapp-tailwindcss 4.12 的硬要求。**必须保留**。

---

## 三、用户新需求（已写入 PHASE4-PLAN v1.0）

### 3.1 用户原话（6 项 + 1 边缘化）

1. **mock 边缘化**：全局除非 mock mode 手动打开，绝不使用 mock；出错时改走 error 流程
2. **公式与图形渲染**：数学题可能有公式与图形，是否有好的方法
3. **题目录入手动修改**：识别错可手改；改后让 AI 重新生成或手动输入答案
4. **错题 save 500 错误**：服务端 bug 需修复
5. **错题本可编辑/可删除**：答案、解析希望也能操作
6. **错题标签折叠**：超过 N 个时展开/闭合

**边缘化要求**（新功能基础）：
- 录入的错题有**权重系统**（维持错题权重）
- 错题本页是回顾复习，点进详情**只显示题目不显示答案**（像背单词）
- 三个选项：**不会 / 犹豫 / 掌握**（名称由寇豆码定）
- "不会"可点空白或某处显示答案+解析
- 复习过程能**修改错题权重**
- 我的页面有**练习生成系统**（基于知识盲区，科目/数量有默认值 + 可调）
- 考题**可打印**
- 练习完**拍照检测**
- 拍照检测目的也是改错题权重
- 设置系统通过**小页面切换**处理

### 3.2 建议功能（4 项，已入档）

- 错题权重系统
- 公式 + 图形渲染（KaTeX 推荐）
- 题目录入手动修改
- 错题本可编辑/可删除

### 3.3 新计划文档编号

详见 `PHASE4-PLAN-2026-06-09-v1.0.md`：
- **P0-1..P0-4**：4 个阻塞项（save 500 / mock 边缘化 / 错题可编辑 / 标签折叠）
- **V-01..V-10**：10 个新功能

---

## 四、文档重组

### 4.1 新结构

```
docs/                          # 当前生效（5 份活文档，agent 一看就懂开发阶段/遗留/下一步）
├── README.md                  # 索引
├── PHASE4-PLAN-2026-06-09-v1.0.md   # 当前开发计划
├── DESIGN.md
├── REFACTOR-LOG.md
└── SESSION-SUMMARY-2026-06-09.md

archive/                       # 仅历史参考
├── 2026-06-06-plans/          # V1 PRD / V2 升级 / Phase 2 / F-01..F-09
├── 2026-06-summaries/         # 3 份早期 session summary
└── README.md                  # 归档说明
```

### 4.2 处置动作

| 文档 | 处置 | 原因 |
|------|------|------|
| `MVP-HANDOVER.md` | **删除** | H-01~H-05 全部解决、风险清单已过；价值已被 REFACTOR-LOG 覆盖 |
| `SESSION-HANDOVER-2026-06-05.md` | **删除** | 避坑点已在 REFACTOR-LOG 中；无独立保留价值 |
| `PRD-wrong-answer-notebook-2025-01.md` | **删除** | 2025 旧文档，所有需求已被 V2/V4 取代 |
| `PHASE2-PLAN.md` / `FEATURE-PLAN.md` / `V2-UPGRADE-ANALYSIS.md` | **归档** | Phase 2/3 已全部完成；F-01..F-09 已被 V-01..V-10 取代 |
| `SESSION-SUMMARY-2026-06-{05b,06,06b}.md` | **归档** | 历史会话记录；保留但不再 active |
| `SESSION-SUMMARY-2026-06-09.md` | **更新并保留** | 反映本会话所有成果 |
| 新建 `PHASE4-PLAN-2026-06-09-v1.0.md` | **新建** | 整合用户新需求 |
| **结构微调** | 5 份活文档从 `active/` 移到 `docs/` 根 | 用户原话"放在 docs 根即可，能让其他 agent 一看就懂开发阶段/遗留/下一步" |

### 4.3 命名规范（用户原话："要有一定的规则，便于查找"）

- `docs/` 根：当前活跃文档，文件名带日期和版本号
- `archive/YYYY-MM-DD-类别/`：按类别和日期归档
- 文件命名：`{TYPE}-{YYYY-MM-DD}-v{X.Y}.md`（如 `PHASE4-PLAN-2026-06-09-v1.0.md`）

---

## 五、变更统计

| 维度 | 数字 |
|------|------|
| 修复 Code Review 问题 | 9（opencode）+ 1（寇豆码）= **10 / 10** |
| Tailwind v3 回退 | 4 文件改动 + 1 文件清理（switch transition） |
| 用户新需求 | 6 项 + 1 边缘化要求 |
| 建议功能 | 4 项 |
| 新建活跃文档 | 1（PHASE4-PLAN v1.0）|
| 删除过期文档 | 3（handover + MVP）|
| 归档文档 | 6（3 plans + 3 summaries + 0 PRDs）|
| WeApp 编译产物验证 | bg-error/bg-success/bg-warning/bg-info 全部正确生成 |
| 服务端测试 | 18/18 通过 |

---

## 六、文件变更清单

| 操作 | 文件 |
|------|------|
| 修改 | `package.json` |
| 修改 | `postcss.config.js` |
| 修改 | `config/index.ts` |
| 修改 | `tailwind.config.js` |
| 修改 | `src/app.css` |
| 修改 | `src/components/ui/switch.tsx`（Code Review #10）|
| 删除 | `docs/MVP-HANDOVER.md` |
| 删除 | `docs/SESSION-HANDOVER-2026-06-05.md` |
| 删除 | `docs/PRD-wrong-answer-notebook-2025-01.md` |
| 归档 | `docs/PHASE2-PLAN.md` → `archive/2026-06-06-plans/PHASE2-PLAN-2026-06-06-v2.3.md` |
| 归档 | `docs/FEATURE-PLAN.md` → `archive/2026-06-06-plans/FEATURE-PLAN-2026-06-06-v1.1.md` |
| 归档 | `docs/V2-UPGRADE-ANALYSIS.md` → `archive/2026-06-06-plans/V2-UPGRADE-2026-06-06-v2.3.md` |
| 归档 | `docs/PRD-v1.0-2026-06-02.md` → `archive/2026-06-06-plans/` |
| 归档 | 3 份 session summary → `archive/2026-06-summaries/` |
| 新建 | `docs/PHASE4-PLAN-2026-06-09-v1.0.md` |
| 重写 | `docs/README.md` |
| 重写 | `docs/archive/README.md` |
| 更新 | `docs/SESSION-SUMMARY-2026-06-09.md`（本文档）|
| 更新 | `docs/REFACTOR-LOG.md`（追加 v3 回退条目）|

---

## 七、当前已知遗留（按风险排序）

| # | 风险 | 来源 | 计划任务 |
|---|------|------|----------|
| 1 | save 500 错误（阻塞） | 用户截屏 | **P0-1** |
| 2 | mock fallback 掩盖真实错误 | 用户新需求 #1 | **P0-2** |
| 3 | 错题不可编辑/删除 | 用户新需求 #5 | **P0-3** |
| 4 | 错题标签无折叠 | 用户新需求 #6 | **P0-4** |
| 5 | 缺错题权重系统 | 用户边缘化要求 | V-01 |
| 6 | 错题详情"全显示"UX 错 | 用户边缘化要求 | V-02 |
| 7 | 无练习生成中心 | 用户边缘化要求 | V-03 |
| 8 | 公式/图形不渲染 | 用户新需求 #2 | V-06 |
| 9 | 题目识别错无手改入口 | 用户新需求 #3 | V-07 |

---

## 八、给接手者

```bash
# 1. 启动
pnpm install
pnpm dev

# 2. 跑基线
pnpm validate

# 3. 读计划
cat docs/PHASE4-PLAN-2026-06-09-v1.0.md

# 4. 按 P0-1 → P0-2 → P0-3 → P0-4 → V-01 → ... 顺序执行
```

每个 V-XX 完成后：
- 更新 `PHASE4-PLAN-2026-06-09-v1.0.md`（打勾 + 完成时间）
- 追加 `REFACTOR-LOG.md` 条目
- 跑 `pnpm validate`

---

*本文档记录于全面 Code Review + 白字问题 v3 回退 + 新需求汇总 + 文档重组 一次会话。*

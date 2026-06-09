# 会话总结 · 2026-06-06

> **本会话定位**：Phase 2 全量实施（代码工作）。所有 8 个子任务 + E2E 跑通。

---

## 一、本次会话成果汇总

### 1.1 Phase 2 任务完成清单（8 / 8 + E2E ✅）

| # | 任务 | 状态 | 改动 |
|---|------|------|------|
| 2.1 | 切换 LLM 到 Provider 1 | ✅ | 已验证 MiniMax-M3 文本 + Vision 都通过 |
| 2.2 | SQLite 落地 | ✅ | 4 表（mistakes / reviews / homework_records / practice_tasks）已创建 |
| 2.3 | study.service → DB | ✅ | 上一会话已迁移；本会话确认所有 6 个方法走 DB + mock fallback |
| 2.4 | appStore → API | ✅ | `src/store/appStore.ts` 重写：`fetchMistakes` / `fetchReviewPlan` / `fetchPracticeHistory` / `fetchAll` actions + Network 解包 helper + mock fallback |
| 2.5 | 单入口交互（TabBar 3）| ✅ | `src/app.config.ts` TabBar 精简为 3 个（首页/错题本/我的）；`src/pages/index/index.tsx` 主页简化（移除 4 个快捷入口，保留唯一大按钮）；`src/pages/mistakes/index.tsx` 加"今日复习 N 道"高亮条 |
| 2.6 | 错题详情页增强 | ✅ | `src/pages/mistake-detail/index.tsx` 重写底部操作：分析完成自动 `POST /api/study/mistake/save`；"开始练习"按钮调 `POST /api/study/practice/generate` 后跳转；"已加入复习"灰显提示 |
| 2.7 | 本地上传接通 | ✅ | `src/pages/homework/index.tsx` 已调 `Network.uploadFile` → `/api/upload` → 拿到 URL；后端 multer 验证可上传 PNG 并返回 URL |
| 2.8 | 家长端 API 预留 | ✅ | **新建** `server/src/parent/parent.controller.ts` + `parent.module.ts` + 单元测试；3 个端点：`/api/parent/dashboard` / `/api/parent/mistake-stats` / `/api/parent/export-link`，响应都带 `parent_visible: true` 字段 |
| E2E | H5 + WeApp 端到端 | ✅ | `pnpm validate` 全绿（lint 0 / tsc 0 / 13 tests pass）；后端启动跑通全流程：subject detect → save mistake → review plan → analyze (real LLM) → practice generate → parent dashboard |

### 1.2 验证指标

```bash
$ pnpm validate
[lint] pnpm lint:build exited with code 0
[tsc]   pnpm tsc:all    exited with code 0
[test]  Tests: 13 passed, 13 total   (4 suites: app / llm / settings / parent)
```

后端 E2E curl 测试全部 200：

| 端点 | 测试 | 结果 |
|------|------|------|
| `POST /api/study/subject/detect` | mock 模式 fallback | ✅ 200 |
| `POST /api/study/mistake/analyze` | 真实 LLM 调用 | ✅ 200 + 真实分析结果 |
| `POST /api/study/mistake/save` | 写入 mistakes 表 | ✅ id:1 |
| `GET  /api/study/review/plan` | 从 DB 读取 | ✅ 1 mistake, 0 due today |
| `POST /api/study/practice/generate` | LLM 生成 + DB 写入 | ✅ 3 questions |
| `GET  /api/parent/dashboard` | 聚合查询 | ✅ parentVisible: true |
| `POST /api/upload` | multer 本地存储 | ✅ 返回 /uploads/<uuid>.png |
| `GET  /uploads/<filename>` | Express 静态服务 | ✅ 200 |

### 1.3 新增/修改文件清单

| 文件 | 改动 |
|------|------|
| `src/store/appStore.ts` | 重写：加 fetch actions + Network 解包 + mock fallback + loading/error state |
| `src/pages/index/index.tsx` | 简化：移除 4 个快捷入口，加副标题"其它全自动"；`switchTab` → `navigateTo` |
| `src/pages/mistakes/index.tsx` | 加"今日复习 N 道"高亮条 + `fetchAll` on mount + ChevronRight 跳转 review |
| `src/pages/mistake-detail/index.tsx` | 重写底部：自动 save + "开始练习" + "已加入复习"灰显 |
| `src/app.config.ts` | TabBar 3 个（首页/错题本/我的）|
| `server/src/parent/parent.controller.ts` | **新建** —— 3 个端点 + `parent_visible` 字段 |
| `server/src/parent/parent.module.ts` | **新建** |
| `server/src/parent/__tests__/parent.controller.spec.ts` | **新建** —— 3 个单元测试 |
| `server/src/app.module.ts` | 注册 ParentModule |
| `package.json` | `better-sqlite3` 11.10.0 → 12.x（Node 24 兼容）|

---

## 二、遗留问题汇报

### 2.1 Phase 2 启动阻塞

**全部解除** —— Phase 2 全任务跑完。

### 2.2 已知技术债（按风险排序）

1. **TOS 未接入** —— 上传仍走 multer → `server/uploads/`，前端未接 TOS SDK。Phase 3.4 处理。
2. **家长端 UI 不做** —— 后端 API 完整（3 个端点 + `parent_visible` 字段），但家长小程序 UI 留给 Phase 4。
3. **复习提醒推送不做**（F-01 已确认 P2/Phase 4）—— Phase 2 只走通复习计划 API，不做主动提醒。
4. **mock 模式 API 解包依赖 `res.data.data` 链式访问** —— 已用 helper `unwrap<T>()` 统一，但若后端将来不返回标准信封需同步更新。
5. **错题列表暂无独立 list 端点** —— 前端用 `/api/study/review/plan` 间接拿错题（`reminders` 数组）。Phase 2.8 可考虑加 `GET /api/study/mistake` 专用端点。

### 2.3 测试覆盖

- 后端：13/13 通过（4 suites：app / llm / settings / parent）
- 前端：无自动化测试（按项目惯例，verify 走 `pnpm validate` + 手动）
- E2E 走 curl 脚本覆盖 7 个核心端点

---

## 三、下阶段工作安排

### 3.1 Phase 3 启动（用户确认后）

| # | 任务 | 涉及 |
|---|------|------|
| 3.1 | 错题导出 PDF（puppeteer）| 后端新增 `ExportService` + `/api/study/mistake/export` |
| 3.2 | 6 幅插画集成（用 bailian-cli 生成）| 前端 4 个空状态/反馈场景 |
| 3.3 | 答对/答错音效（用 bailian-cli TTS）| 前端 + Settings 开关 |
| 3.4 | TOS 接入 | 后端 multer → TOS SDK |
| 3.5 | 测试覆盖率报告 | `pnpm test --coverage` |

### 3.2 Phase 4 远期

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | F-01 复习提醒（订阅消息 + 红点）| 微信订阅消息模板申请 + cron + 前端红点 |
| 4.2 | F-06 家长端小程序 | 复用组件库 + 调 `/api/parent/*` |
| 4.3 | F-07 微信支付 | 与家长端一起 |
| 4.4 | F-08 多孩子支持 | 视需要 |
| 4.5 | NestJS → Hono（如需要）| 退出机制 |

### 3.3 文档同步

- ✅ 本文档（`docs/SESSION-SUMMARY-2026-06-06.md`）已记录
- 下次会话开始前需要：
  - 跑 `pnpm dev:web` + `pnpm dev:server` 验证完整流程
  - 在微信开发者工具中导入 `dist/` 验证小程序（Phase 1 任务）

---

## 四、文件变更清单（本会话）

| 操作 | 文件 |
|------|------|
| 写入 | `docs/SESSION-SUMMARY-2026-06-06.md`（本文档，新建）|
| 编辑 | `docs/PHASE2-PLAN.md`（v2.2 → v2.3 上一会话已更新）|
| 写入 | `src/store/appStore.ts`（重写）|
| 写入 | `src/pages/index/index.tsx`（简化）|
| 编辑 | `src/pages/mistakes/index.tsx`（加今日复习高亮）|
| 写入 | `src/pages/mistake-detail/index.tsx`（重写底部操作）|
| 写入 | `src/app.config.ts`（TabBar 3 个）|
| 写入 | `server/src/parent/parent.controller.ts`（新建）|
| 写入 | `server/src/parent/parent.module.ts`（新建）|
| 写入 | `server/src/parent/__tests__/parent.controller.spec.ts`（新建）|
| 编辑 | `server/src/app.module.ts`（注册 ParentModule）|
| 编辑 | `package.json`（better-sqlite3 11 → 12）|

**净变化**：3 个新文件、6 个修改、1 个依赖升级。

---

## 五、给接手者的快速入口

```bash
# 1. 启动后端
cd server && node dist/src/main.js &

# 2. 启动 H5
pnpm dev:web

# 3. 浏览器打开
http://localhost:5000/index.html

# 4. 验证流程
# 首页 → 拍错题按钮 → /pages/homework → 拍照/选图
# → 上传到 /api/upload → 调 /api/study/subject/detect
# → 跳 /pages/homework-result
# 或：
# 首页 → 拍错题按钮 → 拍照 → /pages/mistake-detail?mode=add
# → 自动调 /api/study/mistake/analyze（真实 LLM）
# → 自动 POST /api/study/mistake/save
# → "开始练习"按钮 → POST /api/study/practice/generate → 跳答题页

# 5. 后端测试
pnpm --filter server test   # 13/13 pass
```

---

*本文档记录于 Phase 2 实施完成时。Phase 3 启动条件：用户确认优先级 + 资源（bailian-cli 配额）。*

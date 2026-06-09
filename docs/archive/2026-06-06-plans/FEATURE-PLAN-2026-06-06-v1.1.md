# Venus-Mate 新功能详细方案（FEATURE-PLAN）

> **版本**：v1.1 | **日期**：2026-06-06 | **状态**：**已确认（2026-06-06），启动 Phase 2**  
> **变更（v1.0 → v1.1）**：F-01 复习提醒 P0 → P2（F-01 移到 Phase 4）；F-03 / F-04 加 `bailian-cli` skill 说明
>
> 配套阅读：`docs/V2-UPGRADE-ANALYSIS.md`（产品定位 + 技术栈）、`docs/PHASE2-PLAN.md`（当前开发计划）

---

## 0. 阅读须知

本文档描述 V2 定位下的**所有新功能**（F-01..F-09），每个功能包含：
- **是什么**（用户视角）
- **为什么**（产品价值）
- **怎么实现**（技术方案 / API / 数据模型）
- **验收标准**

**优先级**：
- **P0** —— Phase 2 必须（核心闭环）
- **P1** —— Phase 3 推荐（增强体验）
- **P2** —— Phase 4 远期（增值 / 商业化）

**实施原则**（用户原话）：
> "操作一定要简易，最好只有录入错题一个操作，其它全自动实现"

所有功能都应服从这个原则——**孩子只需要做"拍错题"一件事**。

---

## F-01 复习提醒推送（**P2 · Phase 4**）⬇

> **2026-06-06 用户决策**：F-01 从 P0/Phase 2 降到 **P2/Phase 4**。Phase 2 不实现复习提醒，Phase 4 一并做。复习计划本身的算法（艾宾浩斯）仍在 Phase 2 走通，**只是不做主动提醒**（用户进入首页时仍能看到"今日复习"高亮条）。

### 是什么

孩子在错题录入后，系统按艾宾浩斯曲线（1天 / 3天 / 7天 / 14天 / 30天）自动安排复习，到时间时**主动提醒**孩子复习。

### 为什么

不提醒 = 不复习 = 录了白录。复习提醒是把"录入"转化为"掌握"的关键。

### 怎么实现

#### 提醒方式：方案 A（微信订阅消息）+ 方案 C（小程序内红点）组合

| 通道 | 场景 | 触发 |
|------|------|------|
| **微信订阅消息** | 用户授权后，每天定时推送"今天有 N 道题要复习" | 后端 cron 每天 09:00 跑批 |
| **小程序内红点** | 用户打开小程序时，首页显示红点 + 待复习数量 | 任何页面进入时拉接口 |

#### 微信订阅消息

```typescript
// 1. 用户点击"开启复习提醒"
async function enableReviewReminder() {
  const tmplIds = ['TEMPLATE_ID_HERE']  // 需在微信公众平台申请
  await Taro.requestSubscribeMessage({ tmplIds })
  // 授权成功后调后端保存 openid + 授权状态
  await Network.request({ url: '/api/study/review/subscribe', method: 'POST' })
}

// 2. 后端 cron 每天 09:00 触发
@Cron('0 0 9 * * *')
async function pushReviewReminders() {
  const dueReviews = await db.query.reviews.findMany({
    where: and(eq(reviews.status, 'pending'), lte(reviews.dueAt, new Date())),
    with: { user: true },
  })
  for (const review of dueReviews) {
    if (review.user.subscribed) {
      await wechatApi.sendSubscribeMessage({
        openid: review.user.openid,
        tmplId: 'TEMPLATE_ID_HERE',
        data: { thing1: { value: review.title }, time2: { value: formatTime(review.dueAt) } },
      })
    } else {
      await db.insert(inAppNotifications).values({ userId: review.userId, type: 'review_due', payload: review })
    }
  }
}
```

#### 微信小程序内红点

```typescript
// 首页 onShow 时拉未读通知
useDidShow(async () => {
  const res = await Network.request({ url: '/api/study/notifications/unread' })
  if (res.data.data.count > 0) {
    setShowRedDot(true)
  }
})
```

#### API 设计

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/study/review/subscribe` | 开启/关闭订阅消息（保存用户授权状态）|
| GET | `/api/study/review/plan?userId=` | 已有（艾宾浩斯计划查询）|
| POST | `/api/study/review/complete` | 已有（标记完成）|
| GET | `/api/study/notifications/unread` | 新增：未读通知（红点 + 列表）|
| POST | `/api/study/notifications/:id/read` | 新增：标记已读 |

#### 数据模型（Drizzle）

```typescript
// 新表
export const reviewSubscriptions = sqliteTable('review_subscriptions', {
  userId: text('user_id').primaryKey(),
  subscribed: integer('subscribed', { mode: 'boolean' }).notNull().default(false),
  tmplId: text('tmpl_id'),
  subscribedAt: integer('subscribed_at', { mode: 'timestamp' }),
})

export const inAppNotifications = sqliteTable('in_app_notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),  // 'review_due' | 'practice_due' | 'system'
  payload: text('payload', { mode: 'json' }).$type<Record<string, any>>(),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

#### 微信公众平台申请

需要在 [mp.weixin.qq.com](https://mp.weixin.qq.com) 申请"教育 > 教育信息服务"类目下的订阅消息模板：
- 模板标题：`复习提醒`
- 字段：`题目名称`（thing.DATA）、`复习时间`（time.DATA）、`温馨提示`（thing.DATA）
- 关键词：`你有 1 道错题需要复习`、`2026-06-06 10:00`、`点击进入小程序开始复习`

### 验收标准

- [ ] 用户点击"开启复习提醒" → 弹窗授权 → 授权状态持久化（DB）
- [ ] 授权后，后端 cron 能在到期日推送订阅消息
- [ ] 未授权用户进入小程序，首页有红点显示待复习数量
- [ ] 点击红点进入错题本 → 错题本顶部有"今日复习 N 道"高亮条

### 不在本期做

- 服务通知（教育类难批）
- 第三方推送 SDK
- 自定义推送时间（先用 09:00 固定时间）

---

## F-02 错题导出 PDF（P1 · Phase 3.1）

### 是什么

错题本 → "导出"按钮 → 生成 PDF（含错题统计、知识点分析、练习记录、掌握度曲线）→ 用户可保存到本地 / 打印。

### 为什么

家长是消费者角色。导出 PDF 是家长参与的方式（打印贴墙上、夹在作业本里）。

### 怎么实现

#### PDF 生成库

后端用 [pdfkit](https://pdfkit.org/) 或 [puppeteer](https://pptr.dev/)（推荐 puppeteer，HTML 模板灵活）：
- **pdfkit**：Node 原生，体积小；模板代码繁琐
- **puppeteer**：HTML 渲染 → PDF；体积大（~300MB Chromium）；但模板就是 HTML，前端同学也能写

**推荐 puppeteer**（容器化部署时用 `--no-sandbox`）。

#### API 设计

```
POST /api/study/mistake/export
Body: { dateRange?: { from, to } }  // 可选导出时间范围
Response: { code, data: { downloadUrl: string, expiresAt: string } }
```

生成过程：
1. 后端查 DB 聚合错题数据
2. 用 EJS / Handlebars 渲染 HTML 模板
3. puppeteer 启动 Chromium → HTML → PDF
4. 存到 TOS（未来）或本地临时目录
5. 返回下载 URL（短期有效，如 24h）

#### PDF 内容（建议）

```
封面：
  - 孩子昵称 + 导出日期
  - 总错题数 / 已掌握 / 复习中

第一章 错题概览
  - 科目分布饼图（语文 30% / 数学 50% / 英语 20%）
  - 知识点热力图（哪些知识点错得最多）
  - 掌握度曲线（按月）

第二章 错题明细
  - 每道错题：
    - 题目图片
    - 错题原因（AI 分析）
    - 复习历史
    - 掌握状态

第三章 练习记录
  - 总练习题数 / 正确率 / 平均答题时间
  - 练习历史列表

第四章 学习建议
  - AI 生成的个性化建议（基于错题分布）
```

#### 模板位置

`server/src/export/templates/mistake-report.html` + `mistake-report.css`

#### 数据聚合查询

后端需要新增聚合查询服务 `server/src/study/aggregation.service.ts`，从 `mistakes` / `reviews` / `practice_tasks` 三张表 JOIN 出来。

### 验收标准

- [ ] 错题本页 → 右上角"导出"按钮
- [ ] 点击后 5 秒内生成 PDF 并下载
- [ ] PDF 内容完整（封面 + 4 章节）
- [ ] 可指定日期范围
- [ ] 移动端 H5 / 小程序都能下载（小程序走 `wx.downloadFile` + `wx.openDocument`）

### 不在本期做

- 自定义导出内容（先固定模板）
- 邮件发送（只生成下载链接）
- 定时自动导出

---

## F-03 空状态 / 反馈插画（P1 · Phase 3.2）

> **2026-06-06 用户说明**：插画生成可使用 `bailian-cli` skill（阿里百炼 CLI，可生成图片/视频/语音）。

### 是什么

6 幅统一风格的插画，放在"空状态"和"操作反馈"场景中，让产品更有温度。

### 为什么

8-18 岁孩子使用的产品，视觉情感很重要。一致的 IP 形象能建立品牌认知。

### 怎么实现

#### 插画清单

| # | 文件名 | 场景 | 尺寸 | 用途 |
|---|--------|------|------|------|
| 1 | `empty-mistakes.png` | 错题本为空 | 400x400 | 引导首次录入 |
| 2 | `empty-review.png` | 无复习任务 | 400x400 | 复习计划空状态 |
| 3 | `practice-complete.png` | 练习全部完成 | 400x400 | 练习完成页 |
| 4 | `loading-analyze.png` | Loading 分析中 | 200x200 | 加载动画 |
| 5 | `success-correct.png` | 分析完成/正确 | 200x200 | 答对反馈 |
| 6 | `error-wrong.png` | 答错/需要练习 | 200x200 | 答错鼓励 |

#### 统一 IP 设定

- **角色**：圆乎乎的小机器人猫（圆头 + 猫耳 + 小翅膀）
- **色调**：橙粉渐变 `#F97316 → #EC4899`，白色背景
- **风格**：扁平 kawaii、圆润、无尖锐边缘
- **输出**：PNG 透明背景，四周留白 ≥15%

#### 详细 Prompt（适用于通义万相 / 腾讯混元 / 即梦）

**#1 empty-mistakes（错题本为空）**
```
圆乎乎的小机器人猫坐在空白笔记本旁边，爪子指着页面，表情温暖期待。橙粉渐变扁平风，kawaii 风格，白色背景，PNG 透明，400x400 px，圆润可爱线条。
```

**#2 empty-review（无复习任务）**
```
小机器人猫双臂高举比勾拿星星，周围飘金色彩带，开心自豪地笑。橙粉渐变扁平风，kawaii，白色背景，PNG 透明，400x400 px。
```

**#3 practice-complete（练习完成）**
```
小机器人猫站在领奖台上举金色奖杯，笑脸弯眼，脚边彩纸屑纷飞。橙粉渐变扁平风，kawaii，白色背景，PNG 透明，400x400 px。
```

**#4 loading-analyze（Loading 分析中）**
```
小机器人猫拿放大镜托下巴思考，头顶气泡三点（思考中），适合动画循环。橙粉渐变扁平风，kawaii，白色背景，PNG 透明，200x200 px，可循环。
```

**#5 success-correct（正确）**
```
小机器人猫竖起大拇指，笑眼红晕，旁边有绿色发光对勾。橙粉渐变扁平风，kawaii，白色背景，PNG 透明，200x200 px。
```

**#6 error-wrong（答错鼓励）**
```
小机器人猫温柔地做出鼓励手势（双手展开），旁边有橙色灯泡图标，传递"加油"而非负面情绪。橙粉渐变扁平风，kawaii，白色背景，PNG 透明，200x200 px。
```

#### 接入位置

| 插画 | 接入点 |
|------|--------|
| #1 | `src/pages/mistakes/index.tsx` —— 错题列表空状态 |
| #2 | `src/pages/review/index.tsx` —— 复习计划空状态 |
| #3 | `src/pages/practice-answer/index.tsx` —— 练习完成页 |
| #4 | `src/pages/mistake-detail/index.tsx` —— AI 分析 loading |
| #5 | `src/pages/practice-answer/index.tsx` —— 答对反馈 |
| #6 | `src/pages/practice-answer/index.tsx` —— 答错鼓励 |

#### 文件位置

`src/assets/images/illustrations/{filename}.png`

### 验收标准

- [ ] 6 幅 PNG 文件就位
- [ ] 4 个空状态 / 反馈场景使用对应插画
- [ ] 视觉风格一致（同一 IP、同一色调、同一 kawaii 风格）
- [ ] 文件 < 50KB/张（小程序体积限制）

### 不在本期做

- 动画版（Lottie / GIF）
- 多套不同情绪的 IP 形象

---

## F-04 答对/答错音效（P2 · Phase 3.3）

> **2026-06-06 用户说明**：音效生成可使用 `bailian-cli` skill（阿里百炼 TTS）。

### 是什么

练习答题时，答对播"叮咚"提示音、答错播"咚咚"低沉音，~1 秒。

### 为什么

即时反馈强化学习效果（多感官学习理论），也增加产品的"游戏感"。

### 怎么实现

#### 音效清单

| 触发 | 文件 | 时长 | 风格 |
|------|------|------|------|
| 答对 | `correct.mp3` | <1s | 清脆上扬（叮咚 / 钢琴高音 / 风铃）|
| 答错 | `wrong.mp3` | <1s | 柔和下降（不打击：木琴低音 / 温柔鼓声）|
| 录入完成 | `mistake-saved.mp3` | <1s | 满足感（叮咚 + 上升琶音）|
| 升级/成就 | `level-up.mp3` | 1-2s | 庆祝（铜管短句 / 欢呼）|

#### 文件位置

`src/assets/sounds/{filename}.mp3`

#### 播放 API

```typescript
import Taro from '@tarojs/taro'

function playSound(name: 'correct' | 'wrong' | 'mistake-saved') {
  if (!settingsStore.soundEnabled) return
  Taro.createInnerAudioContext().play()
  // 或 Taro.playVoice / Taro.createAudioContext
}
```

#### 设置页开关

`src/pages/settings/index.tsx` 添加"Sound effects"开关，保存到 `appStore.settings`。

### 验收标准

- [ ] 4 个音效文件就位，每个 < 100KB
- [ ] 答对/答错触发对应音效
- [ ] Settings 开关可一键静音
- [ ] 小程序端在静音模式下也播放（iOS/Android 各自处理）

### 不在本期做

- 自定义音效
- 背景音乐
- 触觉反馈（Taro.vibrateShort）

---

## F-05 家长端 API 预留（P2 · Phase 2 后端）

### 是什么

后端返回数据时带 `parent_visible` 字段和聚合接口（如 `/api/parent/dashboard`），UI 不做家长端页面，但 API 已经能用。

### 为什么

避免未来加家长端时大改后端。预留"地基"成本极低。

### 怎么实现

#### 数据结构改造

所有返回孩子数据的接口都加 `parent_visible: bool` 字段：
- `GET /api/study/mistake` → 错题列表，每条带 `parent_visible`
- `GET /api/study/review/plan` → 复习计划
- `GET /api/study/practice/history` → 练习历史

#### 新增家长端 API

```
GET  /api/parent/dashboard        # 孩子学习总览（错题数、练习数、掌握度）
GET  /api/parent/mistake-stats    # 错题统计（按科目 / 按知识点 / 按时间）
GET  /api/parent/export-link      # 获取 PDF 导出链接（家长可下载）
POST /api/parent/settings         # 家长可设置的（每日复习次数上限、屏幕时长等）
```

#### 数据库预留

`users` 表预留 `parent_openid` 字段（孩子账号关联家长微信）：
```sql
ALTER TABLE users ADD COLUMN parent_openid TEXT;
```

#### 不做

- 家长端 UI（小程序 / H5）
- 家长账号注册流程
- 家长端消息推送

### 验收标准

- [ ] 孩子数据接口返回 `parent_visible: true/false`
- [ ] `/api/parent/*` 接口可用（即使是 mock 数据）
- [ ] `users` 表有 `parent_openid` 字段

---

## F-06 家长端小程序（P3 · Phase 4）

### 是什么

独立小程序，家长登录后查看孩子的学习报告、错题趋势、生成 PDF 报告、设置使用时长。

### 为什么

付费意愿在家长不在孩子。需要一个"展示价值"的窗口。

### 怎么实现

新建一个 Taro 项目 `parent-app/`，复用 `venus-mate` 的组件库和后端 API。

#### 页面

- 首页（dashboard）
- 错题趋势（图表）
- 知识点分布（饼图 + 热力图）
- PDF 导出
- 设置（每日时长 / 休息提醒）

#### 复用

- `components/ui/`（复制到 parent-app）
- `subjectInfo` 颜色映射
- 调 `venus-mate` 后端的 `/api/parent/*` 接口

### 验收标准（详细方案待 Phase 4 启动时细化）

- [ ] 家长用微信扫码绑定孩子
- [ ] dashboard 显示 7 天错题趋势
- [ ] 可生成 PDF 报告
- [ ] 可设置每日最长使用时长

---

## F-07 微信支付（P3 · Phase 4）

### 是什么

会员订阅（解锁高级功能）或题库扩容包。

### 为什么

商业化收口。但**在产品验证完成前不做**——先把核心闭环跑通。

### 怎么实现

- 微信支付 V3 API（[JSAPI / 小程序支付](https://pay.weixin.qq.com/wiki/doc/apiv3/wxpay/pay/transactions/chapter3_3.shtml)）
- 后端新增 `orders` 表 + `payments` 表
- 前端 `pages/settings/index.tsx` → "升级会员"入口
- 回调地址：`/api/payment/wechat-callback`

### 验收标准

- [ ] 会员价格 1 元测试通过
- [ ] 支付成功后状态实时更新
- [ ] 退款流程

---

## F-08 多孩子支持（P3 · 视需要）

### 是什么

同一个家长微信下管理多个孩子的学习数据。

### 为什么

二孩 / 三孩家庭。但**当前决策是不需要**（用户确认）。

### 怎么实现（如未来需要）

- `mistakes` / `reviews` / `practice_tasks` 加 `user_id` 外键
- 家长绑定孩子流程
- 切换孩子 UI

### 当前状态

⏸ **不实现**，但数据结构预留（不删除 `parent_openid` 字段）。

---

## F-09 单操作交互（P0 · Phase 2.6）

### 是什么

孩子只需要"拍一道错题"，剩下的（分析 / 入库 / 生成练习 / 排复习）全自动完成。TabBar 精简为 3 个。

### 为什么

用户原话："操作一定要简易，最好只有录入错题一个操作，其它全自动实现"。降低孩子的认知负担。

### 怎么实现

#### 首页改造

- **删**：问候语卡片、2×2 统计卡片、4 个快捷入口
- **留**：底部 TabBar
- **加**：一个大大的"📷 拍错题"按钮（页面中央、视觉焦点）
- **加**：副标题"拍一道错题，剩下的交给 Venus-Mate"

#### 错题本页改造

- 顶部加"今日复习 N 道"高亮条（红色）
- 错题列表（保持）
- 右上角"+" → 拍照（保持）

#### TabBar 改造

| 之前 | 之后 |
|------|------|
| 首页 | 首页（📷 拍错题入口） |
| 作业 | ❌ 删（合并到错题流程） |
| 错题本 | 错题本（保持） |
| 复习 | ❌ 删（合并到错题本"今日复习"区） |
| 练习 | ❌ 删（错题详情页"开始练习"按钮） |
| 我的 | ❌ 删（合并到设置） |
| — | 设置（从"我的"独立出来） |

**精简后**：首页 / 错题本 / 设置 = **3 个 TabBar**

#### 错题详情页增强

分析完成后，页面底部出现两个按钮：
- "🎯 开始练习" → 跳 `pages/practice-answer/index?from=mistake&mistakeId=xxx`
- "📅 已加入复习" → 灰显按钮（不可点，已自动加入）

### 验收标准

- [ ] 首页只有一个拍照按钮，0 其他干扰
- [ ] TabBar 3 个：首页 / 错题本 / 设置
- [ ] 错题详情页有"开始练习"和"已加入复习"按钮
- [ ] 整个流程孩子只需要操作"拍照 → 看结果 →（可选）做练习"

---

## 实施顺序（**已确认 2026-06-06**）

```
Phase 2:
  2.1 切换 LLM（默认 Provider 1 = MiniMax-M3）  ← 用户已提供 3 个端点
  2.2 SQLite 落地
  2.3 study.service.ts → DB
  2.4 前端 appStore → API
  2.5 单入口交互（首页大按钮 + TabBar 3 个）  ← F-09
  2.6 错题详情页增强（分析→练习→复习）       ← F-09
  2.7 本地上传接通
  2.8 家长端 API 预留                          ← F-05（注意：原 2.9 复习提醒已移到 Phase 4）

Phase 3:
  3.1 错题导出 PDF                              ← F-02
  3.2 6 幅插画集成（用 bailian-cli）             ← F-03
  3.3 答对/答错音效（用 bailian-cli TTS）        ← F-04
  3.4 TOS 接入
  3.5 测试覆盖率报告

Phase 4:
  4.1 复习提醒 API（in-app）+ 微信订阅消息     ← F-01（2026-06-06 移到 Phase 4）
  4.2 家长端小程序                              ← F-06
  4.3 微信支付                                  ← F-07
  4.4 多孩子支持（视需要）                       ← F-08
```

## 用户确认记录（2026-06-06）

> ✅ **所有 6 个待确认事项已收到用户回复**，寇豆码可启动 Phase 2 编码。

| # | 原问题 | 用户回复 | 决策 |
|---|--------|----------|------|
| 1 | F-01 复习提醒同意"微信订阅消息 + 小程序内红点"吗？| "接受" | ✅ 方案 A+C，但 P2/Phase 4（见问题 #5）|
| 2 | F-02 导出 PDF 用 puppeteer 吗？| （未明确指定，沿用推荐）| ⏳ Phase 3 启动时确认（推荐 puppeteer）|
| 3 | F-03 插画 6 幅 prompt 接受吗？| （附加说明："插画/音效生成可以使用 bailian-cli skill"）| ✅ 用 `bailian-cli` skill 生成 |
| 4 | F-09 单入口 TabBar 3 个 OK 吗？| "接受" | ✅ 实施 |
| 5 | Phase 2 顺序调整吗？| "F-01 → P2，其他接受" | ✅ F-01 移到 Phase 4，其他按原顺序 |
| 6 | F-04 音效清单调整吗？| "插画/音效生成可以使用 bailian-cli skill" | ✅ 用 `bailian-cli` TTS 生成 |

**用户附加说明**：
- 插画 + 音效统一用 `bailian-cli` skill（已记入 F-03 / F-04 章节）
- LLM 端点切换：改 `server/.env.local` 的 3 个环境变量，重启后端即可（无需改代码）

**Phase 2 启动阻塞已解除** —— 寇豆码可按 `docs/PHASE2-PLAN.md` v2.3 启动 2.1。

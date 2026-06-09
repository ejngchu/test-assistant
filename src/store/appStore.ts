// 学习助手应用状态管理
import { create } from 'zustand'
import { Network } from '@/network'

// 科目枚举
export type Subject = 'chinese' | 'math' | 'english'

// 所有合法科目值列表
export const ALL_SUBJECTS: Subject[] = ['chinese', 'math', 'english']

// 类型安全的 Subject 解析器：将任意字符串转为 Subject，无效值返回 fallback 或 undefined
export const parseSubject = (value: string): Subject | undefined =>
  ALL_SUBJECTS.includes(value as Subject) ? (value as Subject) : undefined

// 科目信息
export const subjectInfo: Record<Subject, { name: string; color: string; bgColor: string }> = {
  chinese: { name: '语文', color: '#EF4444', bgColor: '#FEE2E2' },
  math: { name: '数学', color: '#3B82F6', bgColor: '#DBEAFE' },
  english: { name: '英语', color: '#10B981', bgColor: '#D1FAE5' }
}

// 错题数据结构
export interface MistakeItem {
  id: string
  subject: Subject
  title: string
  questionImage: string
  answerImage?: string
  correctAnswer: string
  knowledgePoints: string[]
  blindPoints: string[]
  createdAt: string
  reviewCount: number
  lastReviewAt?: string
  nextReviewAt?: string
  // 兼容旧数据的字段（前端页面以前用过的别名）
  date?: string
  mastered?: boolean
  // AI分析文本
  analysis?: string
}

// 作业检查结果类型
export interface ProblemResult {
  id: string
  status: 'correct' | 'incorrect' | 'unclear'
  hint?: string
  correctAnswer?: string
  analysis?: string
  position?: { x: number; y: number; width: number; height: number }
}

// 作业数据结构
export interface HomeworkItem {
  id: string
  subject: Subject
  imageUrl: string
  status: 'pending' | 'checking' | 'completed' | 'error'
  result?: {
    completed: boolean
    problems: ProblemResult[]
  }
  createdAt: string
}

// 复习提醒数据结构
export interface ReviewReminder {
  id: string
  mistakeId: string
  title: string
  subject: Subject
  reviewCycle: number[] // 记忆曲线周期天数
  currentStage: number
  nextReviewAt: string
  status: 'pending' | 'due' | 'completed'
}

// 练习题数据结构
export interface PracticeQuestion {
  id: string
  subject: Subject
  knowledgePoint: string
  content: string
  options?: { key: string; value: string }[]
  answer: string
  difficulty: 'easy' | 'medium' | 'hard'
}

// 练习任务数据结构
export interface PracticeTask {
  id: string
  title: string
  subject: Subject
  knowledgePoints: string[]
  questions: PracticeQuestion[]
  totalCount: number
  completedCount: number
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed'
}

// 应用状态
interface AppState {
  // 当前用户 ID（暂用单用户架构，固定为 'user1'）
  userId: string

  // 错题列表
  mistakes: MistakeItem[]
  addMistake: (mistake: MistakeItem) => void
  removeMistake: (id: string) => void
  updateMistake: (id: string, updates: Partial<MistakeItem>) => void
  setMistakes: (mistakes: MistakeItem[]) => void

  // 复习提醒
  reviewReminders: ReviewReminder[]
  addReviewReminder: (reminder: ReviewReminder) => void
  updateReviewReminder: (id: string, updates: Partial<ReviewReminder>) => void
  setReviewReminders: (reminders: ReviewReminder[]) => void

  // 练习任务
  practiceTasks: PracticeTask[]
  addPracticeTask: (task: PracticeTask) => void
  updatePracticeTask: (id: string, updates: Partial<PracticeTask>) => void
  setPracticeTasks: (tasks: PracticeTask[]) => void

  // 作业历史
  homeworkHistory: HomeworkItem[]
  addHomework: (homework: HomeworkItem) => void
  updateHomework: (id: string, updates: Partial<HomeworkItem>) => void

  // 学习统计
  stats: {
    totalMistakes: number
    masteredCount: number
    reviewToday: number
    practiceAccuracy: number
  }
  updateStats: (updates: Partial<AppState['stats']>) => void

  // 加载状态
  isLoading: boolean
  loadError: string | null

  // API 拉取 actions
  fetchMistakes: () => Promise<void>
  fetchReviewPlan: () => Promise<void>
  fetchPracticeHistory: () => Promise<void>
  fetchAll: () => Promise<void>
}

// 当前用户（单用户架构，固定 user1，与 server/src/db/schema.ts 的 default 'user1' 一致）
const DEFAULT_USER_ID = 'user1'

// 初始 mock 数据（仅在 API 失败时作为 fallback，不作为主数据源）
const initialReminders: ReviewReminder[] = []

const initialTasks: PracticeTask[] = []

// 解包 Network 响应：业务数据在 res.data.data
const unwrap = <T,>(res: Taro.request.SuccessCallbackResult<any>, fallback: T): T => {
  const envelope = res.data
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return (envelope.data ?? fallback) as T
  }
  return fallback
}

export const useAppStore = create<AppState>((set, get) => ({
  userId: DEFAULT_USER_ID,

  // 初始为空，等 fetchAll 拉取
  mistakes: [],
  addMistake: (mistake) =>
    set((state) => ({ mistakes: [...state.mistakes, mistake] })),
  removeMistake: (id) =>
    set((state) => ({ mistakes: state.mistakes.filter((m) => m.id !== id) })),
  updateMistake: (id, updates) =>
    set((state) => ({
      mistakes: state.mistakes.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      )
    })),
  setMistakes: (mistakes) => set({ mistakes }),

  reviewReminders: [],
  addReviewReminder: (reminder) =>
    set((state) => ({ reviewReminders: [...state.reviewReminders, reminder] })),
  updateReviewReminder: (id, updates) =>
    set((state) => ({
      reviewReminders: state.reviewReminders.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      )
    })),
  setReviewReminders: (reviewReminders) => set({ reviewReminders }),

  practiceTasks: [],
  addPracticeTask: (task) =>
    set((state) => ({ practiceTasks: [...state.practiceTasks, task] })),
  updatePracticeTask: (id, updates) =>
    set((state) => ({
      practiceTasks: state.practiceTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      )
    })),
  setPracticeTasks: (practiceTasks) => set({ practiceTasks }),

  homeworkHistory: [],
  addHomework: (homework) =>
    set((state) => ({ homeworkHistory: [homework, ...state.homeworkHistory] })),
  updateHomework: (id, updates) =>
    set((state) => ({
      homeworkHistory: state.homeworkHistory.map((h) =>
        h.id === id ? { ...h, ...updates } : h
      )
    })),

  stats: {
    totalMistakes: 0,
    masteredCount: 0,
    reviewToday: 0,
    practiceAccuracy: 0
  },
  updateStats: (updates) =>
    set((state) => ({ stats: { ...state.stats, ...updates } })),

  isLoading: false,
  loadError: null,

  // 从后端拉取错题列表
  // 错题当前没有 list 端点 → 用 /api/study/review/plan 返回的 reminders 间接组装
  // （plan 接口按艾宾浩斯算法返回所有错题 + 复习状态，前端在 fetchReviewPlan 里处理）
  fetchMistakes: async () => {
    // 暂不直接实现，等 Phase 2.8 加 GET /api/study/mistake 端点
  },

  // 从后端拉取复习计划（艾宾浩斯）
  fetchReviewPlan: async () => {
    const { userId } = get()
    try {
      const res = await Network.request({
        url: `/api/study/review/plan?userId=${userId}`,
        method: 'GET'
      })
      const data = unwrap<{ reminders?: any[]; stats?: any }>(res as any, {})
      const reminders: ReviewReminder[] = (data.reminders || []).map((r: any) => ({
        id: String(r.id),
        mistakeId: String(r.mistakeId),
        title: r.title,
        subject: (parseSubject(r.subject) || 'math') as Subject,
        reviewCycle: r.reviewCycle || [1, 3, 7, 14, 30],
        currentStage: r.currentStage ?? 0,
        nextReviewAt: r.nextReviewAt,
        status: r.status || 'pending'
      }))
      set({ reviewReminders: reminders })

      // 同步统计
      if (data.stats) {
        set({
          stats: {
            totalMistakes: data.stats.total ?? reminders.length,
            masteredCount: data.stats.completed ?? 0,
            reviewToday: data.stats.dueToday ?? 0,
            practiceAccuracy: get().stats.practiceAccuracy
          }
        })
      }
    } catch (err) {
      console.warn('[appStore] fetchReviewPlan failed, using mock fallback:', err)
      // Fallback：保留初始 mock 数据
      if (get().reviewReminders.length === 0) {
        set({ reviewReminders: initialReminders, loadError: String(err) })
      }
    }
  },

  // 从后端拉取练习历史
  fetchPracticeHistory: async () => {
    const { userId } = get()
    try {
      const res = await Network.request({
        url: `/api/study/practice/history?userId=${userId}`,
        method: 'GET'
      })
      const data = unwrap<{ tasks?: any[]; stats?: any }>(res as any, {})
      const tasks: PracticeTask[] = (data.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        subject: (parseSubject(t.subject) || 'math') as Subject,
        knowledgePoints: t.knowledgePoints || [],
        questions: (t.questions || []).map((q: any) => ({
          id: String(q.id),
          subject: (parseSubject(t.subject) || 'math') as Subject,
          knowledgePoint: q.knowledgePoint || '',
          content: q.content || '',
          options: q.options || [],
          answer: q.answer || '',
          difficulty: (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard'
        })),
        totalCount: t.totalCount ?? 0,
        completedCount: t.completedCount ?? 0,
        dueDate: t.dueDate || '',
        status: t.status || 'pending'
      }))
      set({ practiceTasks: tasks })
      if (data.stats && typeof data.stats.accuracy === 'number') {
        set((state) => ({ stats: { ...state.stats, practiceAccuracy: data.stats!.accuracy } }))
      }
    } catch (err) {
      console.warn('[appStore] fetchPracticeHistory failed, using mock fallback:', err)
      if (get().practiceTasks.length === 0) {
        set({ practiceTasks: initialTasks, loadError: String(err) })
      }
    }
  },

  // 一次性拉所有数据
  fetchAll: async () => {
    set({ isLoading: true, loadError: null })
    // 防御性超时：8s 没返回就降级到 mock，避免模拟器 watchdog 误报
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('fetchAll timeout (8s)')), 8000),
    )
    try {
      await Promise.race([
        Promise.all([
          get().fetchReviewPlan(),
          get().fetchPracticeHistory(),
        ]),
        timeout,
      ])
      set({ isLoading: false })
    } catch (err) {
      set({ isLoading: false, loadError: String(err) })
    }
  }
}))

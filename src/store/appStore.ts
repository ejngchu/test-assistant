// 学习助手应用状态管理
import { create } from 'zustand'

// 科目枚举
export type Subject = 'chinese' | 'math' | 'english'

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
  // 兼容前端页面使用的字段
  imageUrl?: string
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
  // 错题列表
  mistakes: MistakeItem[]
  addMistake: (mistake: MistakeItem) => void
  removeMistake: (id: string) => void
  updateMistake: (id: string, updates: Partial<MistakeItem>) => void
  
  // 复习提醒
  reviewReminders: ReviewReminder[]
  addReviewReminder: (reminder: ReviewReminder) => void
  updateReviewReminder: (id: string, updates: Partial<ReviewReminder>) => void
  
  // 练习任务
  practiceTasks: PracticeTask[]
  addPracticeTask: (task: PracticeTask) => void
  updatePracticeTask: (id: string, updates: Partial<PracticeTask>) => void
  
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
}

// 模拟初始数据
const initialMistakes: MistakeItem[] = [
  {
    id: '1',
    subject: 'math',
    title: '有余数的除法',
    questionImage: 'https://picsum.photos/400/300?random=1',
    correctAnswer: '24÷5=4...4',
    knowledgePoints: ['有余数除法', '余数概念'],
    blindPoints: ['余数必须小于除数'],
    createdAt: '2024-05-08',
    reviewCount: 2,
    lastReviewAt: '2024-05-10',
    nextReviewAt: '2024-05-13'
  },
  {
    id: '2',
    subject: 'chinese',
    title: '形近字辨析',
    questionImage: 'https://picsum.photos/400/300?random=2',
    correctAnswer: '已、己',
    knowledgePoints: ['形近字', '汉字结构'],
    blindPoints: ['已开门的已，己是 天干第二位'],
    createdAt: '2024-05-09',
    reviewCount: 1,
    lastReviewAt: '2024-05-10',
    nextReviewAt: '2024-05-12'
  },
  {
    id: '3',
    subject: 'english',
    title: '一般现在时',
    questionImage: 'https://picsum.photos/400/300?random=3',
    correctAnswer: 'She plays tennis every day.',
    knowledgePoints: ['一般现在时', '第三人称单数'],
    blindPoints: ['动词第三人称单数加s'],
    createdAt: '2024-05-10',
    reviewCount: 0
  }
]

const initialReminders: ReviewReminder[] = [
  {
    id: '1',
    mistakeId: '1',
    title: '有余数的除法',
    subject: 'math',
    reviewCycle: [1, 3, 7, 14, 30],
    currentStage: 2,
    nextReviewAt: '2024-05-13',
    status: 'due'
  },
  {
    id: '2',
    mistakeId: '2',
    title: '形近字辨析',
    subject: 'chinese',
    reviewCycle: [1, 3, 7, 14, 30],
    currentStage: 1,
    nextReviewAt: '2024-05-12',
    status: 'pending'
  }
]

const initialTasks: PracticeTask[] = [
  {
    id: '1',
    title: '除法巩固练习',
    subject: 'math',
    knowledgePoints: ['有余数除法', '余数概念'],
    questions: [],
    totalCount: 10,
    completedCount: 6,
    dueDate: '2024-05-15',
    status: 'in_progress'
  }
]

export const useAppStore = create<AppState>((set) => ({
  // 错题列表
  mistakes: initialMistakes,
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
  
  // 复习提醒
  reviewReminders: initialReminders,
  addReviewReminder: (reminder) =>
    set((state) => ({ reviewReminders: [...state.reviewReminders, reminder] })),
  updateReviewReminder: (id, updates) =>
    set((state) => ({
      reviewReminders: state.reviewReminders.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      )
    })),
  
  // 练习任务
  practiceTasks: initialTasks,
  addPracticeTask: (task) =>
    set((state) => ({ practiceTasks: [...state.practiceTasks, task] })),
  updatePracticeTask: (id, updates) =>
    set((state) => ({
      practiceTasks: state.practiceTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      )
    })),
  
  // 作业历史
  homeworkHistory: [],
  addHomework: (homework) =>
    set((state) => ({ homeworkHistory: [homework, ...state.homeworkHistory] })),
  updateHomework: (id, updates) =>
    set((state) => ({
      homeworkHistory: state.homeworkHistory.map((h) =>
        h.id === id ? { ...h, ...updates } : h
      )
    })),
  
  // 学习统计
  stats: {
    totalMistakes: 3,
    masteredCount: 0,
    reviewToday: 2,
    practiceAccuracy: 85
  },
  updateStats: (updates) =>
    set((state) => ({ stats: { ...state.stats, ...updates } }))
}))

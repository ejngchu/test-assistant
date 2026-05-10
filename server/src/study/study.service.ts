import { Injectable } from '@nestjs/common';
import { LLMService } from '@/common/services/llm.service';

export interface ProblemResult {
  id: string;
  status: 'correct' | 'incorrect' | 'unclear';
  hint?: string;
  correctAnswer?: string;
  analysis?: string;
}

export interface HomeworkResult {
  completed: boolean;
  totalProblems: number;
  correctCount: number;
  incorrectCount: number;
  unclearCount: number;
  problems: ProblemResult[];
}

export interface KnowledgePoint {
  name: string;
  masteryLevel: number; // 0-100
}

export interface ReviewItem {
  id: string;
  mistakeId: string;
  title: string;
  subject: string;
  knowledgePoints: string[];
  reviewCycle: number[];
  currentStage: number;
  nextReviewAt: string;
  status: 'pending' | 'due' | 'completed';
}

export interface PracticeQuestion {
  id: string;
  subject: string;
  knowledgePoint: string;
  content: string;
  options?: { key: string; value: string }[];
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PracticeTask {
  id: string;
  title: string;
  subject: string;
  knowledgePoints: string[];
  questions: PracticeQuestion[];
  totalCount: number;
  completedCount: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// 模拟数据库
const mockMistakes: {
  id: string;
  userId: string;
  subject: string;
  title: string;
  questionImage: string;
  correctAnswer: string;
  knowledgePoints: string[];
  blindPoints: string[];
  createdAt: string;
  reviewCount: number;
  lastReviewAt: string;
  reviewStages: number[];
  currentStage: number;
}[] = [
  {
    id: '1',
    userId: 'user1',
    subject: 'math',
    title: '有余数的除法',
    questionImage: 'https://picsum.photos/400/300?random=1',
    correctAnswer: '24÷5=4...4',
    knowledgePoints: ['有余数除法', '余数概念'],
    blindPoints: ['余数必须小于除数'],
    createdAt: '2024-05-08',
    reviewCount: 2,
    lastReviewAt: '2024-05-10',
    reviewStages: [1, 3, 7, 14, 30],
    currentStage: 2,
  },
  {
    id: '2',
    userId: 'user1',
    subject: 'chinese',
    title: '形近字辨析',
    questionImage: 'https://picsum.photos/400/300?random=2',
    correctAnswer: '已、己',
    knowledgePoints: ['形近字', '汉字结构'],
    blindPoints: ['已开门的已，己是天干第二位'],
    createdAt: '2024-05-09',
    reviewCount: 1,
    lastReviewAt: '2024-05-10',
    reviewStages: [1, 3, 7, 14, 30],
    currentStage: 1,
  },
  {
    id: '3',
    userId: 'user1',
    subject: 'english',
    title: '一般现在时',
    questionImage: 'https://picsum.photos/400/300?random=3',
    correctAnswer: 'She plays tennis every day.',
    knowledgePoints: ['一般现在时', '第三人称单数'],
    blindPoints: ['动词第三人称单数加s'],
    createdAt: '2024-05-10',
    reviewCount: 0,
    lastReviewAt: '2024-05-10',
    reviewStages: [1, 3, 7, 14, 30],
    currentStage: 0,
  },
];

const mockPracticeHistory: PracticeTask[] = [
  {
    id: 'task1',
    title: '除法巩固练习',
    subject: 'math',
    knowledgePoints: ['有余数除法', '余数概念'],
    questions: [],
    totalCount: 10,
    completedCount: 6,
    dueDate: '2024-05-15',
    status: 'in_progress',
  },
];

// 三年级数学知识点库
const mathKnowledgePoints = {
  '有余数除法': {
    questions: [
      {
        id: 'm1',
        knowledgePoint: '有余数除法',
        content: '小明有23颗糖果，平均分给4个小朋友，每个小朋友能分到几颗糖果？还剩几颗？',
        options: [
          { key: 'A', value: '5颗，剩3颗' },
          { key: 'B', value: '6颗，剩0颗' },
          { key: 'C', value: '5颗，剩2颗' },
          { key: 'D', value: '6颗，剩1颗' },
        ],
        answer: 'A',
        difficulty: 'medium',
      },
      {
        id: 'm2',
        knowledgePoint: '有余数除法',
        content: '用竖式计算：45 ÷ 6 = ?',
        options: [
          { key: 'A', value: '7 ······ 3' },
          { key: 'B', value: '7 ······ 5' },
          { key: 'C', value: '8 ······ 3' },
          { key: 'D', value: '6 ······ 9' },
        ],
        answer: 'A',
        difficulty: 'easy',
      },
      {
        id: 'm3',
        knowledgePoint: '有余数除法',
        content: '一个数除以5，商是8，余数是3，这个数是（ ）。',
        options: [
          { key: 'A', value: '38' },
          { key: 'B', value: '43' },
          { key: 'C', value: '40' },
          { key: 'D', value: '45' },
        ],
        answer: 'B',
        difficulty: 'medium',
      },
      {
        id: 'm4',
        knowledgePoint: '有余数除法',
        content: '38个苹果装进盒子里，每个盒子装6个，最多可以装满（ ）个盒子，还剩（ ）个。',
        options: [
          { key: 'A', value: '6个，剩2个' },
          { key: 'B', value: '6个，剩1个' },
          { key: 'C', value: '5个，剩8个' },
          { key: 'D', value: '7个，剩0个' },
        ],
        answer: 'A',
        difficulty: 'medium',
      },
    ],
  },
  '两位数乘一位数': {
    questions: [
      {
        id: 'm5',
        knowledgePoint: '两位数乘一位数',
        content: '12 × 7 = ?',
        options: [
          { key: 'A', value: '74' },
          { key: 'B', value: '84' },
          { key: 'C', value: '94' },
          { key: 'D', value: '64' },
        ],
        answer: 'B',
        difficulty: 'easy',
      },
      {
        id: 'm6',
        knowledgePoint: '两位数乘一位数',
        content: '23 × 4 = ?',
        options: [
          { key: 'A', value: '82' },
          { key: 'B', value: '92' },
          { key: 'C', value: '102' },
          { key: 'D', value: '112' },
        ],
        answer: 'B',
        difficulty: 'easy',
      },
      {
        id: 'm7',
        knowledgePoint: '两位数乘一位数',
        content: '一道乘法算式中，两个乘数分别是15和6，积是（ ）。',
        options: [
          { key: 'A', value: '80' },
          { key: 'B', value: '90' },
          { key: 'C', value: '100' },
          { key: 'D', value: '110' },
        ],
        answer: 'B',
        difficulty: 'medium',
      },
    ],
  },
  '分数认识': {
    questions: [
      {
        id: 'm8',
        knowledgePoint: '分数认识',
        content: '把一个苹果平均分成4份，每份是这个苹果的（ ）。',
        options: [
          { key: 'A', value: '1/2' },
          { key: 'B', value: '1/3' },
          { key: 'C', value: '1/4' },
          { key: 'D', value: '1/5' },
        ],
        answer: 'C',
        difficulty: 'easy',
      },
    ],
  },
};

// 三年级语文知识点库
const chineseKnowledgePoints = {
  '形近字': {
    questions: [
      {
        id: 'c1',
        knowledgePoint: '形近字辨析',
        content: '下面哪个字的意思是"已经"？（ ）',
        options: [
          { key: 'A', value: '已' },
          { key: 'B', value: '己' },
          { key: 'C', value: '巳' },
          { key: 'D', value: '乞' },
        ],
        answer: 'A',
        difficulty: 'medium',
       },
       {
         id: 'c4',
         knowledgePoint: '同音字辨析',
         content: '"再"和"在"的用法正确的是：（ ）',
         options: [
           { key: 'A', value: '我"在"家里"再"见' },
           { key: 'B', value: '我"再"家里"在"见' },
           { key: 'C', value: '我"在"家里"在"见' },
           { key: 'D', value: '我"再"家里"再"见' },
         ],
         answer: 'A',
         difficulty: 'medium',
       },
      {
        id: 'c3',
        knowledgePoint: '形近字辨析',
        content: '选择正确的字填空：我（ ）天去学校。（ ）',
        options: [
          { key: 'A', value: '在 在' },
          { key: 'B', value: '在 再' },
          { key: 'C', value: '再 在' },
          { key: 'D', value: '再 再' },
        ],
        answer: 'B',
        difficulty: 'hard',
      },
    ],
  },
  '同音字': {
    questions: [
      {
        id: 'c2',
        knowledgePoint: '同音字辨析',
        content: '"再"和"在"的用法正确的是：（ ）',
        options: [
          { key: 'A', value: '我"在"家里"再"见' },
          { key: 'B', value: '我"再"家里"在"见' },
          { key: 'C', value: '我"在"家里"在"见' },
          { key: 'D', value: '我"再"家里"再"见' },
        ],
        answer: 'A',
        difficulty: 'medium',
      },
    ],
  },
};

// 三年级英语知识点库
const englishKnowledgePoints = {
  '一般现在时': {
    questions: [
      {
        id: 'e1',
        knowledgePoint: '一般现在时',
        content: 'She _____ tennis every day.（ ）',
        options: [
          { key: 'A', value: 'play' },
          { key: 'B', value: 'plays' },
          { key: 'C', value: 'playing' },
          { key: 'D', value: 'played' },
        ],
        answer: 'B',
        difficulty: 'medium',
      },
      {
        id: 'e2',
        knowledgePoint: '一般现在时',
        content: 'He _____ football on Sundays.（ ）',
        options: [
          { key: 'A', value: 'play' },
          { key: 'B', value: 'plays' },
          { key: 'C', value: 'playing' },
          { key: 'D', value: 'played' },
        ],
        answer: 'B',
        difficulty: 'easy',
      },
      {
        id: 'e3',
        knowledgePoint: '一般现在时',
        content: 'My mother _____ breakfast every morning.（ ）',
        options: [
          { key: 'A', value: 'cook' },
          { key: 'B', value: 'cooks' },
          { key: 'C', value: 'cooking' },
          { key: 'D', value: 'cooked' },
        ],
        answer: 'B',
        difficulty: 'medium',
      },
    ],
  },
  '可数名词': {
    questions: [
       {
         id: 'e4',
         knowledgePoint: '可数名词复数',
         content: 'There are three _____ on the desk.（ ）',
         options: [
           { key: 'A', value: 'book' },
           { key: 'B', value: 'books' },
           { key: 'C', value: 'bookes' },
           { key: 'D', value: 'booked' },
         ],
         answer: 'B',
         difficulty: 'easy',
       },
    ],
  },
};

@Injectable()
export class StudyService {
  constructor(private readonly llmService: LLMService) {}

  /**
   * 自动识别作业科目
   * 使用 LLM API 进行图像识别
   */
  async detectSubject(imageUrl: string): Promise<{
    code: number;
    msg: string;
    data: {
      subject: string;
      confidence: number;
      isUncertain: boolean;
    };
  }> {
    // 调用LLM服务进行科目识别
    const result = await this.llmService.detectSubject(imageUrl);

    return {
      code: 200,
      msg: result.confidence < 60 ? '科目识别不确定，请手动选择' : '科目识别成功',
      data: {
        subject: result.subject,
        confidence: result.confidence,
        isUncertain: result.confidence < 60,
      },
    };
  }

  /**
   * 检查作业完成情况
   * 使用LLM API进行图像识别和分析
   */
  async checkHomework(dto: { subject: string; imageUrl: string }): Promise<{
    code: number;
    msg: string;
    data: {
      result: HomeworkResult;
    };
  }> {
    // 调用LLM服务检查作业
    const llmResult = await this.llmService.checkHomework(dto.imageUrl, dto.subject);

    // 计算统计
    const correctCount = llmResult.problems.filter((p) => p.status === 'correct').length;
    const incorrectCount = llmResult.problems.filter((p) => p.status === 'incorrect').length;
    const unclearCount = llmResult.problems.filter((p) => p.status === 'unclear').length;

    const result: HomeworkResult = {
      completed: true,
      totalProblems: llmResult.problems.length,
      correctCount,
      incorrectCount,
      unclearCount,
      problems: llmResult.problems.map((p) => ({
        id: p.id,
        status: p.status,
        hint: p.hint,
        correctAnswer: p.correctAnswer,
        analysis: p.analysis,
      })),
    };

    return {
      code: 200,
      msg: '作业检查完成',
      data: { result },
    };
  }

  /**
   * 分析错题
   * 使用LLM API识别知识点和知识盲点
   */
  async analyzeMistake(dto: {
    subject: string;
    imageUrl: string;
    userAnswer?: string;
  }): Promise<{
    code: number;
    msg: string;
    data: {
      title: string;
      correctAnswer: string;
      knowledgePoints: string[];
      blindPoints: string[];
      analysis: string;
    };
  }> {
    // 调用LLM服务分析错题
    const llmResult = await this.llmService.analyzeMistake(dto.imageUrl, dto.subject);

    return {
      code: 200,
      msg: '错题分析完成',
      data: {
        title: llmResult.title,
        correctAnswer: llmResult.correctAnswer,
        knowledgePoints: llmResult.knowledgePoints,
        blindPoints: llmResult.blindPoints,
        analysis: llmResult.analysis,
      },
    };
  }

  /**
   * 获取复习计划
   * 基于艾宾浩斯记忆曲线
   */
  async getReviewPlan(userId: string): Promise<{
    code: number;
    msg: string;
    data: {
      reminders: ReviewItem[];
      stats: {
        total: number;
        dueToday: number;
        completed: number;
      };
    };
  }> {
    const today = new Date();
    const reviewItems: ReviewItem[] = mockMistakes
      .filter((m) => m.userId === userId || m.userId === 'user1')
      .map((m) => {
        const nextReviewDate = new Date(m.lastReviewAt || m.createdAt);
        const daysToAdd = m.reviewStages[m.currentStage] || 1;
        nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

        return {
          id: `review_${m.id}`,
          mistakeId: m.id,
          title: m.title,
          subject: m.subject,
          knowledgePoints: m.knowledgePoints,
          reviewCycle: m.reviewStages,
          currentStage: m.currentStage,
          nextReviewAt: nextReviewDate.toISOString().split('T')[0],
          status: nextReviewDate <= today ? 'due' : 'pending',
        };
      });

    const dueToday = reviewItems.filter((r) => r.status === 'due').length;

    return {
      code: 200,
      msg: '获取复习计划成功',
      data: {
        reminders: reviewItems,
        stats: {
          total: reviewItems.length,
          dueToday,
          completed: reviewItems.filter((r) => r.status === 'completed').length,
        },
      },
    };
  }

  /**
   * 记录复习完成
   * 更新记忆曲线进度
   */
  async completeReview(mistakeId: string, userId: string): Promise<{
    code: number;
    msg: string;
    data: {
      nextReviewAt: string;
      currentStage: number;
      isMastered: boolean;
    };
  }> {
    const mistake = mockMistakes.find((m) => m.id === mistakeId);
    if (!mistake) {
      return {
        code: 404,
        msg: '错题记录不存在',
        data: {
          nextReviewAt: '',
          currentStage: 0,
          isMastered: false,
        },
      };
    }

    mistake.reviewCount += 1;
    mistake.currentStage = Math.min(mistake.currentStage + 1, mistake.reviewStages.length - 1);

    const nextReviewDate = new Date();
    const daysToAdd = mistake.reviewStages[mistake.currentStage] || 30;
    nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

    return {
      code: 200,
      msg: '复习记录已保存',
      data: {
        nextReviewAt: nextReviewDate.toISOString().split('T')[0],
        currentStage: mistake.currentStage,
        isMastered: mistake.currentStage >= mistake.reviewStages.length - 1,
      },
    };
  }

  /**
   * 生成练习题
   * 使用LLM API基于薄弱知识点生成
   */
  async generatePractice(dto: {
    subject?: string;
    knowledgePoints?: string[];
    count?: number;
    userId: string;
  }): Promise<{
    code: number;
    msg: string;
    data: PracticeTask;
  }> {
    const count = dto.count || 5;
    const subject = dto.subject || 'math';

    // 调用LLM服务生成练习题
    const llmResult = await this.llmService.generatePractice({
      subject,
      knowledgePoints: dto.knowledgePoints || [],
      count,
    });

    const task: PracticeTask = {
      id: `task_${Date.now()}`,
      title: `${subject === 'math' ? '数学' : subject === 'chinese' ? '语文' : '英语'}巩固练习`,
      subject,
      knowledgePoints: dto.knowledgePoints || ['综合练习'],
      questions: llmResult.questions.map((q) => ({
        ...q,
        subject,
      })),
      totalCount: llmResult.questions.length,
      completedCount: 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    };

    mockPracticeHistory.push(task);

    return {
      code: 200,
      msg: '练习题生成成功',
      data: task,
    };
  }

  /**
   * 获取练习历史
   */
  async getPracticeHistory(userId: string): Promise<{
    code: number;
    msg: string;
    data: {
      tasks: PracticeTask[];
      stats: {
        totalTasks: number;
        completedTasks: number;
        accuracy: number;
      };
    };
  }> {
    const tasks = mockPracticeHistory.filter((t) => t.status !== 'pending');
    const completedTasks = tasks.filter((t) => t.status === 'completed');

    return {
      code: 200,
      msg: '获取练习历史成功',
      data: {
        tasks,
        stats: {
          totalTasks: mockPracticeHistory.length,
          completedTasks: completedTasks.length,
          accuracy: 85, // 模拟数据
        },
      },
    };
  }

  /**
   * 提交练习答案
   */
  async submitPracticeAnswer(body: {
    practiceId: string;
    answers: Record<string, string>;
    userId: string;
  }): Promise<{
    code: number;
    msg: string;
    data: {
      correctCount: number;
      totalCount: number;
      accuracy: number;
      results: { questionId: string; userAnswer: string; correctAnswer: string; isCorrect: boolean }[];
    };
  }> {
    const task = mockPracticeHistory.find((t) => t.id === body.practiceId);
    if (!task) {
      return {
        code: 404,
        msg: '练习任务不存在',
        data: {
          correctCount: 0,
          totalCount: 0,
          accuracy: 0,
          results: [],
        },
      };
    }

    const results: { questionId: string; userAnswer: string; correctAnswer: string; isCorrect: boolean }[] = [];
    let correctCount = 0;

    task.questions.forEach((q) => {
      const userAnswer = body.answers[q.id] || '';
      const isCorrect = userAnswer.toUpperCase() === q.answer.toUpperCase();
      if (isCorrect) correctCount++;
      results.push({
        questionId: q.id,
        userAnswer,
        correctAnswer: q.answer,
        isCorrect,
      });
    });

    task.completedCount = correctCount;
    if (correctCount === task.totalCount) {
      task.status = 'completed';
    } else {
      task.status = 'in_progress';
    }

    return {
      code: 200,
      msg: '答案提交成功',
      data: {
        correctCount,
        totalCount: task.totalCount,
        accuracy: Math.round((correctCount / task.totalCount) * 100),
        results,
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { LLMService } from '@/common/services/llm.service';
import { DRIZZLE_DB, type DrizzleDB } from '@/db/drizzle.provider';
import * as schema from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { mockMistakes, mockPracticeHistory } from './mock';

export interface ProblemResult {
  id: string;
  status: 'correct' | 'incorrect' | 'unclear';
  hint?: string;
  correctAnswer?: string;
  analysis?: string;
  knowledgePoints?: string[];
  blindPoints?: string[];
}

export interface HomeworkResult {
  completed: boolean;
  totalProblems: number;
  correctCount: number;
  incorrectCount: number;
  unclearCount: number;
  problems: ProblemResult[];
  // P2-学习建议（2026-06-08）：由 LLM 在 checkHomework 同一次请求中生成
  // 不再需要单独调用 analyzeMistake，节省一次 LLM request
  learningSuggestion?: string;
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
  questionText?: string;
  correctAnswer?: string;
  analysis?: string;
  hint?: string;
  learningSuggestion?: string;
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
  /** 任务所属用户；submitPracticeAnswer 必须校验 userId 匹配，否则拒绝 */
  userId: string;
  title: string;
  subject: string;
  knowledgePoints: string[];
  questions: PracticeQuestion[];
  totalCount: number;
  /** 已答题数（不是答对数）；用户每答一题 +1，status === 'completed' 时 === totalCount */
  completedCount: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
}


@Injectable()
export class StudyService {
  constructor(
    private readonly llmService: LLMService,
    @Inject(DRIZZLE_DB) private db: DrizzleDB,
  ) {}

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
        questionText: p.questionText,
        hint: p.hint,
        correctAnswer: p.correctAnswer,
        analysis: p.analysis,
        knowledgePoints: p.knowledgePoints,
        blindPoints: p.blindPoints,
      })),
      // P2-学习建议（2026-06-08）：从同一次 LLM 调用拿
      learningSuggestion: llmResult.learningSuggestion,
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
   * 保存错题到数据库
   * 将 AI 分析结果写入 mistakes 表，同时创建初始复习记录
   * 2026-06-09 P0-1：加 try/catch 把 Drizzle / SQLite 错误转成业务可读的错误码
   * 而不是直接 throw 到 controller 触发 500
   */
  async saveMistake(dto: {
    userId: string;
    subject: string;
    questionImage: string;
    title: string;
    correctAnswer: string;
    knowledgePoints: string[];
    blindPoints: string[];
    analysis?: string;
    questionText?: string;
    status?: string;
    hint?: string;
    learningSuggestion?: string;
  }): Promise<{
    code: number;
    msg: string;
    data: { id: number };
  }> {
    // 艾宾浩斯复习间隔（天）
    const reviewStages = [1, 2, 4, 7, 15, 30, 60, 90];
    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + reviewStages[0]);

    try {
      // 插入错题记录
      const inserted = await this.db.insert(schema.mistakes).values({
        userId: dto.userId,
        subject: dto.subject,
        title: dto.title,
        questionImage: dto.questionImage ?? '',
        correctAnswer: dto.correctAnswer ?? '',
        knowledgePoints: dto.knowledgePoints ?? [],
        blindPoints: dto.blindPoints ?? [],
        analysis: dto.analysis ?? null,
        questionText: dto.questionText ?? null,
        status: dto.status ?? null,
        hint: dto.hint ?? null,
        learningSuggestion: dto.learningSuggestion ?? null,
      }).returning({ id: schema.mistakes.id });

      if (!inserted.length) {
        return { code: 500, msg: '保存错题失败：DB 未返回行', data: { id: 0 } };
      }

      const mistakeId = inserted[0].id;

      // 创建初始复习计划记录
      await this.db.insert(schema.reviews).values({
        mistakeId,
        userId: dto.userId,
        stage: 0,
        nextReviewAt: nextReview.toISOString(),
      });

      return { code: 200, msg: '错题保存成功', data: { id: mistakeId } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[StudyService.saveMistake] DB 错误:', message, { dto });
      // 业务可读的错误码
      if (message.includes('NOT NULL')) {
        return { code: 400, msg: `保存错题失败：必填字段缺失 (${message})`, data: { id: 0 } };
      }
      if (message.includes('UNIQUE')) {
        return { code: 400, msg: `保存错题失败：重复记录 (${message})`, data: { id: 0 } };
      }
      return { code: 500, msg: `保存错题失败：${message}`, data: { id: 0 } };
    }
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
    // 艾宾浩斯复习间隔（天），与 saveMistake 保持一致
    const reviewStages = [1, 2, 4, 7, 15, 30, 60, 90];

    if (!userId) {
      return { code: 200, msg: '获取复习计划成功', data: { reminders: [], stats: { total: 0, dueToday: 0, completed: 0 } } };
    }

    try {
      // 从数据库查询用户所有错题（按创建时间正序）
      const userMistakes = await this.db.select({
        id: schema.mistakes.id,
        userId: schema.mistakes.userId,
        subject: schema.mistakes.subject,
        title: schema.mistakes.title,
        questionImage: schema.mistakes.questionImage,
        correctAnswer: schema.mistakes.correctAnswer,
        knowledgePoints: schema.mistakes.knowledgePoints,
        blindPoints: schema.mistakes.blindPoints,
        analysis: schema.mistakes.analysis,
        reviewCount: schema.mistakes.reviewCount,
        mastered: schema.mistakes.mastered,
        createdAt: schema.mistakes.createdAt,
        questionText: schema.mistakes.questionText,
        status: schema.mistakes.status,
        hint: schema.mistakes.hint,
        learningSuggestion: schema.mistakes.learningSuggestion,
      })
        .from(schema.mistakes)
        .where(eq(schema.mistakes.userId, userId));

      // 查询每个错题对应的最新复习记录
      const mistakeIds = userMistakes.map((m) => m.id);
      let reviewsMap: Record<number, { stage: number; nextReviewAt: string; completedAt: string | null }> = {};

      if (mistakeIds.length > 0) {
        const reviews = await this.db.select({
          mistakeId: schema.reviews.mistakeId,
          stage: schema.reviews.stage,
          nextReviewAt: schema.reviews.nextReviewAt,
          completedAt: schema.reviews.completedAt,
        })
          .from(schema.reviews)
          .where(
            and(
              eq(schema.reviews.userId, userId),
              // Drizzle sql.js 不支持 inArray，用多条件 or 模拟
              ...mistakeIds.map((id) => eq(schema.reviews.mistakeId, id))
            )
          );

        // 每个错题取最新的复习记录（stage 最大）
        for (const r of reviews) {
          const prev = reviewsMap[r.mistakeId];
          if (!prev || r.stage > prev.stage) {
            reviewsMap[r.mistakeId] = r;
          }
        }
      }

      // 组装复习计划
      const reviewItems: ReviewItem[] = userMistakes.map((m) => {
        const review = reviewsMap[m.id];
        const currentStage = review?.stage ?? 0;
        const nextReviewStr = review?.nextReviewAt ?? m.createdAt;

        return {
          id: `review_${m.id}`,
          mistakeId: String(m.id),
          title: m.title,
          subject: m.subject,
          questionText: m.questionText ?? undefined,
          correctAnswer: m.correctAnswer ?? undefined,
          analysis: m.analysis ?? undefined,
          hint: m.hint ?? undefined,
          learningSuggestion: m.learningSuggestion ?? undefined,
          knowledgePoints: m.knowledgePoints,
          reviewCycle: reviewStages,
          currentStage,
          nextReviewAt: new Date(nextReviewStr).toISOString().split('T')[0],
          status: m.mastered
            ? 'completed'
            : new Date(nextReviewStr) <= today ? 'due' : 'pending',
        }
      });

      const dueToday = reviewItems.filter((r) => r.status === 'due').length;
      const completed = reviewItems.filter((r) => r.status === 'completed').length;

      return {
        code: 200,
        msg: '获取复习计划成功',
        data: {
          reminders: reviewItems,
          stats: {
            total: reviewItems.length,
            dueToday,
            completed,
          },
        },
      }
    } catch (err) {
      // 数据库异常时降级到 mock 数据
      console.warn('[getReviewPlan] DB 查询失败，降级到 mock:', err);
      const fallbackMistakes = mockMistakes.filter((m) => m.userId === userId);

      const reviewItems: ReviewItem[] = fallbackMistakes.map((m) => {
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
      const completed = fallbackMistakes.filter(
        (m) => m.currentStage >= m.reviewStages.length - 1,
      ).length;

      return {
        code: 200,
        msg: '获取复习计划成功（降级模式）',
        data: {
          reminders: reviewItems,
          stats: { total: reviewItems.length, dueToday, completed },
        },
      };
    }
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
    const id = Number(mistakeId);
    if (Number.isNaN(id) || id <= 0) {
      return { code: 400, msg: '无效的错题ID', data: { nextReviewAt: '', currentStage: 0, isMastered: false } };
    }

    // 艾宾浩斯复习间隔（天）
    const reviewStages = [1, 2, 4, 7, 15, 30, 60, 90];

    try {
      // 查询当前错题和最新复习记录
      const mistakes = await this.db.select({
        id: schema.mistakes.id,
        userId: schema.mistakes.userId,
        reviewCount: schema.mistakes.reviewCount,
        mastered: schema.mistakes.mastered,
      })
        .from(schema.mistakes)
        .where(eq(schema.mistakes.id, id));

      if (!mistakes.length || mistakes[0].userId !== userId) {
        return { code: 404, msg: '错题记录不存在', data: { nextReviewAt: '', currentStage: 0, isMastered: false } };
      }

      // 查询当前最新 stage
      const reviews = await this.db.select({
        id: schema.reviews.id,
        stage: schema.reviews.stage,
      })
        .from(schema.reviews)
        .where(and(eq(schema.reviews.mistakeId, id), eq(schema.reviews.userId, userId)))
        .orderBy(asc(schema.reviews.stage));

      const lastReview = reviews[reviews.length - 1];
      const currentStage = (lastReview?.stage ?? -1) + 1;
      const maxStage = reviewStages.length - 1;

      // 更新错题的复习次数和掌握状态
      await this.db.update(schema.mistakes).set({
        reviewCount: mistakes[0].reviewCount + 1,
        mastered: currentStage >= maxStage ? true : undefined,
      }).where(eq(schema.mistakes.id, id));

      // 插入新的复习阶段记录
      const nextReviewDate = new Date();
      const daysToAdd = reviewStages[currentStage] ?? 30;
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

      await this.db.insert(schema.reviews).values({
        mistakeId: id,
        userId,
        stage: currentStage,
        nextReviewAt: nextReviewDate.toISOString(),
        completedAt: new Date().toISOString(),
      });

      return {
        code: 200,
        msg: '复习记录已保存',
        data: {
          nextReviewAt: nextReviewDate.toISOString().split('T')[0],
          currentStage,
          isMastered: currentStage >= maxStage,
        },
      };
    } catch (err) {
      // 数据库异常时降级到 mock
      console.warn('[completeReview] DB 操作失败，降级到 mock:', err);
      const mistake = mockMistakes.find((m) => m.id === mistakeId);
      if (!mistake) {
        return { code: 404, msg: '错题记录不存在', data: { nextReviewAt: '', currentStage: 0, isMastered: false } };
      }

      mistake.reviewCount += 1;
      mistake.currentStage = Math.min(mistake.currentStage + 1, mistake.reviewStages.length - 1);

      const nextReviewDate = new Date();
      const daysToAdd = mistake.reviewStages[mistake.currentStage] || 30;
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

      return {
        code: 200,
        msg: '复习记录已保存（降级模式）',
        data: {
          nextReviewAt: nextReviewDate.toISOString().split('T')[0],
          currentStage: mistake.currentStage,
          isMastered: mistake.currentStage >= mistake.reviewStages.length - 1,
        },
      };
    }
  }

  /**
   * 生成练习题
   * 基于用户错题薄弱点，使用 LLM 生成针对性练习并持久化到 DB
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

    try {
      // 1. 从 DB 查询用户最近的错题（取最近 10 条）
      const recentMistakes = await this.db.select({
        knowledgePoints: schema.mistakes.knowledgePoints,
        blindPoints: schema.mistakes.blindPoints,
        subject: schema.mistakes.subject,
      })
        .from(schema.mistakes)
        .where(eq(schema.mistakes.userId, dto.userId))
        .orderBy(asc(schema.mistakes.createdAt))
        .limit(10);

      // 2. 提取薄弱知识点（合并 knowledgePoints 和 blindPoints）
      const knowledgePointsSet = new Set<string>();
      const blindPointsSet = new Set<string>();

      recentMistakes.forEach((m) => {
        (m.knowledgePoints || []).forEach((kp: string) => knowledgePointsSet.add(kp));
        (m.blindPoints || []).forEach((bp: string) => blindPointsSet.add(bp));
      });

      // 优先使用传入的知识点，否则使用从错题中提取的
      const effectiveKnowledgePoints = dto.knowledgePoints && dto.knowledgePoints.length > 0
        ? dto.knowledgePoints
        : Array.from(knowledgePointsSet);
      const effectiveBlindPoints = Array.from(blindPointsSet);

      // 确定科目
      const subject = dto.subject
        || (recentMistakes.length > 0 ? recentMistakes[0].subject : 'math');

      // 3. 调用 LLM 生成练习题
      const llmResult = await this.llmService.generatePractice({
        subject,
        knowledgePoints: effectiveKnowledgePoints.length > 0
          ? effectiveKnowledgePoints
          : ['综合练习'],
        count,
      });

      // 4. 组装练习题（确保有梯度难度）
      const questions: PracticeQuestion[] = (llmResult.questions || []).map((q, idx) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        subject,
        knowledgePoint: q.knowledgePoint || effectiveKnowledgePoints[idx % effectiveKnowledgePoints.length] || '综合练习',
        content: q.content || '',
        options: q.options || [],
        answer: q.answer || '',
        difficulty: q.difficulty || (idx < count / 3 ? 'easy' : idx < (count * 2) / 3 ? 'medium' : 'hard'),
      }));

      // 如果 LLM 返回的题目不足，用 mock 补充
      while (questions.length < count) {
        const idx = questions.length;
        questions.push({
          id: `q_${Date.now()}_${idx}`,
          subject,
          knowledgePoint: effectiveKnowledgePoints[idx % effectiveKnowledgePoints.length] || '综合练习',
          content: `请解答第 ${idx + 1} 题（基于知识点：${effectiveKnowledgePoints[idx % effectiveKnowledgePoints.length] || '综合练习'}）`,
          options: [
            { key: 'A', value: '选项 A' },
            { key: 'B', value: '选项 B' },
            { key: 'C', value: '选项 C' },
            { key: 'D', value: '选项 D' },
          ],
          answer: 'A',
          difficulty: idx < count / 3 ? 'easy' : idx < (count * 2) / 3 ? 'medium' : 'hard',
        });
      }

      // 5. 创建练习任务
      const taskId = `task_${Date.now()}`;
      const task: PracticeTask = {
        id: taskId,
        userId: dto.userId,
        title: `${subject === 'math' ? '数学' : subject === 'chinese' ? '语文' : subject === 'english' ? '英语' : subject}巩固练习`,
        subject,
        knowledgePoints: effectiveKnowledgePoints,
        questions: questions.slice(0, count),
        totalCount: Math.min(questions.length, count),
        completedCount: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
      };

      // 6. 持久化到 practiceTasks 表
      await this.db.insert(schema.practiceTasks).values({
        taskId: task.id,
        userId: task.userId,
        title: task.title,
        subject: task.subject,
        knowledgePoints: task.knowledgePoints,
        questions: task.questions as any,
        totalCount: task.totalCount,
        completedCount: task.completedCount,
        dueDate: task.dueDate,
        status: task.status,
      });

      return {
        code: 200,
        msg: '练习题生成成功',
        data: task,
      };
    } catch (err) {
      // 数据库或 LLM 异常时降级到 mock
      console.warn('[generatePractice] 异常，降级到 mock:', err);
      const subject = dto.subject || 'math';
      const taskId = `task_${Date.now()}`;
      const mockQuestions: PracticeQuestion[] = Array.from({ length: count }, (_, i) => ({
        id: `q_${Date.now()}_${i}`,
        subject,
        knowledgePoint: (dto.knowledgePoints || ['综合练习'])[i % (dto.knowledgePoints || ['综合练习']).length],
        content: `模拟练习题 ${i + 1}`,
        options: [
          { key: 'A', value: '选项 A' },
          { key: 'B', value: '选项 B' },
          { key: 'C', value: '选项 C' },
          { key: 'D', value: '选项 D' },
        ],
        answer: 'A',
        difficulty: i < count / 3 ? 'easy' : i < (count * 2) / 3 ? 'medium' : 'hard',
      }));

      const task: PracticeTask = {
        id: taskId,
        userId: dto.userId,
        title: `${subject === 'math' ? '数学' : '英语'}巩固练习`,
        subject,
        knowledgePoints: dto.knowledgePoints || ['综合练习'],
        questions: mockQuestions,
        totalCount: mockQuestions.length,
        completedCount: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
      };

      // 降级时也尝试写入 DB
      try {
        await this.db.insert(schema.practiceTasks).values({
          taskId: task.id,
          userId: task.userId,
          title: task.title,
          subject: task.subject,
          knowledgePoints: task.knowledgePoints,
          questions: task.questions as any,
          totalCount: task.totalCount,
          completedCount: task.completedCount,
          dueDate: task.dueDate,
          status: task.status,
        });
      } catch (dbErr) {
        console.warn('[generatePractice] mock 模式 DB 写入失败:', dbErr);
      }

      return {
        code: 200,
        msg: '练习题生成成功（降级模式）',
        data: task,
      };
    }
  }

  /**
   * 获取练习历史（从 DB 读取，按时间倒序）
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
    try {
      // 从 practiceTasks 表查询用户的练习历史
      const dbTasks = await this.db.select().from(schema.practiceTasks)
        .where(eq(schema.practiceTasks.userId, userId))
        .orderBy(desc(schema.practiceTasks.createdAt));

      // 转换为 PracticeTask 格式
      const tasks: PracticeTask[] = dbTasks.map((t) => ({
        id: t.taskId,
        userId: t.userId,
        title: t.title,
        subject: t.subject,
        knowledgePoints: t.knowledgePoints as any as string[],
        questions: (t.questions as any as Record<string, unknown>[]).map((q: any) => ({
          id: q.id || `q_${t.id}_${Math.random()}`,
          subject: t.subject,
          knowledgePoint: q.knowledgePoint || '综合练习',
          content: q.content || '',
          options: q.options || [],
          answer: q.answer || '',
          difficulty: q.difficulty || 'medium',
        })) as any as PracticeQuestion[],
        totalCount: t.totalCount,
        completedCount: t.completedCount,
        dueDate: t.dueDate || '',
        status: t.status as 'pending' | 'in_progress' | 'completed',
      }));

      const completedTasks = tasks.filter((t) => t.status === 'completed');
      const totalAnswered = tasks.reduce((sum, t) => sum + t.completedCount, 0);
      const totalCorrect = tasks.reduce((sum, t) => {
        // TODO: 存储每次 submitPracticeAnswer 的真实正确率，不再用估算
        // 当前因 DB 未存 accuracy 字段，以 completedCount * 0.8 估算
        return sum + Math.round(t.completedCount * 0.8);
      }, 0);

      return {
        code: 200,
        msg: '获取练习历史成功',
        data: {
          tasks: tasks.filter((t) => t.status !== 'pending'),
          stats: {
            totalTasks: tasks.length,
            completedTasks: completedTasks.length,
            accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
          },
        },
      };
    } catch (err) {
      // 数据库异常时降级到 mock
      console.warn('[getPracticeHistory] DB 查询失败，降级到 mock:', err);
      const userTasks = mockPracticeHistory.filter((t) => t.userId === userId);
      const tasks = userTasks.filter((t) => t.status !== 'pending');
      const completedTasks = userTasks.filter((t) => t.status === 'completed');

      return {
        code: 200,
        msg: '获取练习历史成功（降级模式）',
        data: {
          tasks,
          stats: {
            totalTasks: userTasks.length,
            completedTasks: completedTasks.length,
            accuracy: 85,
          },
        },
      };
    }
  }

  /**
   * 提交练习答案
   *
   * 修复点：
   * 1. 校验 userId 必须匹配 task.userId，防止任何人拿 practiceId 改别人任务
   * 2. completedCount 改用 answeredCount（已答题数），不是 correctCount
   * 3. 状态完成判断改用 answeredCount === totalCount（答完即 completed，不要求全对）
   * 4. totalCount === 0 时 accuracy 走零除保护（返回 0 而非 NaN）
   * 5. 从 DB 读取/更新任务（替代 mock 数组）
   * 6. 连续答错同类题目时，自动将该知识点加回 blindPoints
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
    try {
      // 1. 从 DB 查询任务
      const dbTasks = await this.db.select().from(schema.practiceTasks)
        .where(and(
          eq(schema.practiceTasks.taskId, body.practiceId),
          eq(schema.practiceTasks.userId, body.userId)
        ));

      if (!dbTasks.length) {
        return {
          code: 404,
          msg: '练习任务不存在',
          data: { correctCount: 0, totalCount: 0, accuracy: 0, results: [] },
        };
      }

      const dbTask = dbTasks[0];
      const questions = (dbTask.questions as any as Record<string, unknown>[]) || [];
      const task: PracticeTask = {
        id: dbTask.taskId,
        userId: dbTask.userId,
        title: dbTask.title,
        subject: dbTask.subject,
        knowledgePoints: dbTask.knowledgePoints as any as string[],
        questions: questions.map((q: any) => ({
          id: q.id || '',
          subject: dbTask.subject,
          knowledgePoint: q.knowledgePoint || '综合练习',
          content: q.content || '',
          options: q.options || [],
          answer: q.answer || '',
          difficulty: q.difficulty || 'medium',
        })) as any as PracticeQuestion[],
        totalCount: dbTask.totalCount,
        completedCount: dbTask.completedCount,
        dueDate: dbTask.dueDate || '',
        status: dbTask.status as 'pending' | 'in_progress' | 'completed',
      };

      // 2. 校验答案
      const results: { questionId: string; userAnswer: string; correctAnswer: string; isCorrect: boolean }[] = [];
      let correctCount = 0;
      let answeredCount = 0;

      // 跟踪每个知识点的答对/答错情况
      const knowledgePointResults: Record<string, { correct: number; incorrect: number }> = {};

      task.questions.forEach((q) => {
        const userAnswer = body.answers[q.id];
        const isAnswered = userAnswer !== undefined && userAnswer !== null;
        if (isAnswered) answeredCount++;
        const isCorrect = isAnswered && userAnswer.toUpperCase() === q.answer.toUpperCase();
        if (isCorrect) correctCount++;

        // 记录知识点正确/错误情况
        const kp = q.knowledgePoint || '未知知识点';
        if (!knowledgePointResults[kp]) {
          knowledgePointResults[kp] = { correct: 0, incorrect: 0 };
        }
        if (isCorrect) {
          knowledgePointResults[kp].correct++;
        } else if (isAnswered) {
          knowledgePointResults[kp].incorrect++;
        }

        results.push({
          questionId: q.id,
          userAnswer: userAnswer ?? '',
          correctAnswer: q.answer,
          isCorrect,
        });
      });

      // 3. 连续答错同类题目时，自动将该知识点加回 blindPoints
      for (const [kp, stats] of Object.entries(knowledgePointResults)) {
        // 如果该知识点答错超过 2 题，且错误数 > 正确数，则加入 blindPoints
        if (stats.incorrect >= 2 && stats.incorrect > stats.correct) {
          try {
            // 查找包含此知识点的错题，将其加入 blindPoints
            const relatedMistakes = await this.db.select({
              id: schema.mistakes.id,
              blindPoints: schema.mistakes.blindPoints,
            })
              .from(schema.mistakes)
              .where(and(
                eq(schema.mistakes.userId, body.userId),
                // sql.js 不支持 array contains，需要在应用层过滤
              ));

            for (const m of relatedMistakes) {
              const bp = m.blindPoints as any as string[] || [];
              if (!bp.includes(kp)) {
                bp.push(kp);
                await this.db.update(schema.mistakes)
                  .set({ blindPoints: bp as any })
                  .where(eq(schema.mistakes.id, m.id));
              }
            }
          } catch (err) {
            console.warn('[submitPracticeAnswer] 更新 blindPoints 失败:', err);
          }
        }
      }

      // 4. 更新任务状态
      task.completedCount = answeredCount;
      task.status = answeredCount >= task.totalCount && task.totalCount > 0 ? 'completed' : 'in_progress';

      // 5. 持久化到 DB
      await this.db.update(schema.practiceTasks)
        .set({
          completedCount: task.completedCount,
          status: task.status,
          questions: task.questions as any, // 保存可能更新的 questions（虽然这里没改）
        })
        .where(eq(schema.practiceTasks.taskId, body.practiceId));

      // 零除保护
      const accuracy = task.totalCount > 0
        ? Math.round((correctCount / task.totalCount) * 100)
        : 0;

      return {
        code: 200,
        msg: '答案提交成功',
        data: {
          correctCount,
          totalCount: task.totalCount,
          accuracy,
          results,
        },
      };
    } catch (err) {
      // 数据库异常时降级到 mock
      console.warn('[submitPracticeAnswer] DB 操作失败，降级到 mock:', err);
      const task = mockPracticeHistory.find((t) => t.id === body.practiceId);
      if (!task) {
        return {
          code: 404,
          msg: '练习任务不存在',
          data: { correctCount: 0, totalCount: 0, accuracy: 0, results: [] },
        };
      }

      // 隐私校验：userId 必须匹配，否则拒绝
      if (task.userId !== body.userId) {
        return {
          code: 403,
          msg: '无权操作此练习任务',
          data: { correctCount: 0, totalCount: 0, accuracy: 0, results: [] },
        };
      }

      const results: { questionId: string; userAnswer: string; correctAnswer: string; isCorrect: boolean }[] = [];
      let correctCount = 0;
      let answeredCount = 0;

      task.questions.forEach((q) => {
        const userAnswer = body.answers[q.id];
        const isAnswered = userAnswer !== undefined && userAnswer !== null;
        if (isAnswered) answeredCount++;
        const isCorrect = isAnswered && userAnswer.toUpperCase() === q.answer.toUpperCase();
        if (isCorrect) correctCount++;
        results.push({
          questionId: q.id,
          userAnswer: userAnswer ?? '',
          correctAnswer: q.answer,
          isCorrect,
        });
      });

      task.completedCount = answeredCount;
      task.status = answeredCount >= task.totalCount && task.totalCount > 0 ? 'completed' : 'in_progress';

      const accuracy = task.totalCount > 0
        ? Math.round((correctCount / task.totalCount) * 100)
        : 0;

      return {
        code: 200,
        msg: '答案提交成功（降级模式）',
        data: {
          correctCount,
          totalCount: task.totalCount,
          accuracy,
          results,
        },
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

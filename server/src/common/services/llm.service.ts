import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// LLM Provider类型
export type LLMProvider = 'coze' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// 科目识别结果
export interface SubjectResult {
  subject: 'chinese' | 'math' | 'english';
  confidence: number;
}

// 作业检查问题结果
export interface ProblemCheckResult {
  id: string;
  status: 'correct' | 'incorrect' | 'unclear';
  correctAnswer: string;
  analysis: string;
  hint?: string;
  position?: { x: number; y: number; width: number; height: number };
}

// 错题分析结果
export interface MistakeAnalysisResult {
  title: string;
  correctAnswer: string;
  knowledgePoints: string[];
  blindPoints: string[];
  analysis: string;
}

// 练习题
export interface PracticeQuestion {
  id: string;
  knowledgePoint: string;
  content: string;
  options?: { key: string; value: string }[];
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// 练习生成结果
export interface PracticeGenerateResult {
  questions: PracticeQuestion[];
}

@Injectable()
export class LLMService {
  private config: LLMConfig;
  private mockMode: boolean = true;

  constructor(private configService: ConfigService) {
    // 从环境变量读取配置
    const provider = this.configService.get<LLMProvider>('LLM_PROVIDER', 'coze');
    const cozeApiKey = this.configService.get<string>('COZE_API_KEY', '');
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY', '');

    if (provider === 'openai' && openaiApiKey) {
      this.config = {
        provider: 'openai',
        apiKey: openaiApiKey,
        baseUrl: this.configService.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
      };
      this.mockMode = false;
    } else if (provider === 'coze' && cozeApiKey) {
      this.config = {
        provider: 'coze',
        apiKey: cozeApiKey,
        baseUrl: this.configService.get<string>('COZE_API_ENDPOINT', 'https://api.coze.cn/v1'),
        model: 'coze-dev',
      };
      this.mockMode = false;
    } else {
      this.mockMode = true;
      console.log('[LLMService] Running in MOCK mode - no API key configured');
    }
  }

  /**
   * 检测作业科目
   */
  async detectSubject(imageUrl: string): Promise<SubjectResult> {
    if (this.mockMode) {
      // Mock实现：随机返回
      const subjects: ('chinese' | 'math' | 'english')[] = ['chinese', 'math', 'english'];
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      return {
        subject: randomSubject,
        confidence: Math.floor(Math.random() * 30) + 70,
      };
    }

    try {
      if (this.config.provider === 'coze') {
        return await this.cozeDetectSubject(imageUrl);
      } else {
        return await this.openaiDetectSubject(imageUrl);
      }
    } catch (error) {
      console.error('[LLMService] detectSubject failed:', error);
      // 失败时返回默认值
      return { subject: 'math', confidence: 0 };
    }
  }

  /**
   * 检查作业完成情况
   */
  async checkHomework(imageUrl: string, subject: string): Promise<{
    problems: ProblemCheckResult[];
  }> {
    if (this.mockMode) {
      return this.mockCheckHomework(subject);
    }

    try {
      if (this.config.provider === 'coze') {
        return await this.cozeCheckHomework(imageUrl, subject);
      } else {
        return await this.openaiCheckHomework(imageUrl, subject);
      }
    } catch (error) {
      console.error('[LLMService] checkHomework failed:', error);
      return this.mockCheckHomework(subject);
    }
  }

  /**
   * 分析错题
   */
  async analyzeMistake(imageUrl: string, subject: string): Promise<MistakeAnalysisResult> {
    if (this.mockMode) {
      return this.mockAnalyzeMistake(subject);
    }

    try {
      if (this.config.provider === 'coze') {
        return await this.cozeAnalyzeMistake(imageUrl, subject);
      } else {
        return await this.openaiAnalyzeMistake(imageUrl, subject);
      }
    } catch (error) {
      console.error('[LLMService] analyzeMistake failed:', error);
      return this.mockAnalyzeMistake(subject);
    }
  }

  /**
   * 生成练习题
   */
  async generatePractice(params: {
    subject: string;
    knowledgePoints: string[];
    count: number;
  }): Promise<PracticeGenerateResult> {
    if (this.mockMode) {
      return this.mockGeneratePractice(params);
    }

    try {
      if (this.config.provider === 'coze') {
        return await this.cozeGeneratePractice(params);
      } else {
        return await this.openaiGeneratePractice(params);
      }
    } catch (error) {
      console.error('[LLMService] generatePractice failed:', error);
      return this.mockGeneratePractice(params);
    }
  }

  // ==================== Coze API Implementation ====================

  private async cozeDetectSubject(imageUrl: string): Promise<SubjectResult> {
    const prompt = `分析这张作业图片，判断是哪个科目。只需要返回JSON格式的答案，不需要其他文字：
{"subject": "chinese"或"math"或"english", "confidence": 0-100的置信度}
- 语文：包含汉字、拼音、中文句子
- 数学：包含数字、运算符、几何图形
- 英语：包含英文字母、英文单词、英文句子`;

    const response = await this.callCozeAPI(prompt, imageUrl);
    const result = JSON.parse(response);

    return {
      subject: result.subject,
      confidence: result.confidence || 80,
    };
  }

  private async cozeCheckHomework(imageUrl: string, subject: string): Promise<{ problems: ProblemCheckResult[] }> {
    const subjectNames: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
    };

    const prompt = `这是一张${subjectNames[subject] || subject}作业的图片。
请识别图片中的每一道题目，判断每道题目的正确/错误状态，并给出正确答案和简要分析。
直接返回JSON数组格式：
[{"id": "1", "status": "correct/incorrect/unclear", "correctAnswer": "正确答案", "analysis": "简要分析", "hint": "提示"}]`;

    const response = await this.callCozeAPI(prompt, imageUrl);
    // 尝试解析为JSON数组
    try {
      const problems = JSON.parse(response);
      return { problems: Array.isArray(problems) ? problems : [] };
    } catch {
      return this.mockCheckHomework(subject);
    }
  }

  private async cozeAnalyzeMistake(imageUrl: string, subject: string): Promise<MistakeAnalysisResult> {
    const subjectNames: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
    };

    const prompt = `这是一道${subjectNames[subject] || subject}错题的图片。
请分析这道错题：
1. 给出题目名称/标题
2. 给出正确答案
3. 列出涉及的知识点
4. 列出知识盲点（学生容易犯错的地方）
5. 给出详细的解题分析

直接返回JSON格式：
{"title": "标题", "correctAnswer": "正确答案", "knowledgePoints": ["知识点1", "知识点2"], "blindPoints": ["盲点1", "盲点2"], "analysis": "详细分析"}`;

    const response = await this.callCozeAPI(prompt, imageUrl);
    try {
      return JSON.parse(response);
    } catch {
      return this.mockAnalyzeMistake(subject);
    }
  }

  private async cozeGeneratePractice(params: {
    subject: string;
    knowledgePoints: string[];
    count: number;
  }): Promise<PracticeGenerateResult> {
    const subjectNames: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
    };

    const kpText = params.knowledgePoints.length > 0
      ? params.knowledgePoints.join('、')
      : '综合练习';

    const prompt = `请为${subjectNames[params.subject] || params.subject}科目生成${params.count}道练习题。
知识点范围：${kpText}
每道题需要有：
1. 题目内容
2. 4个选项（A、B、C、D）
3. 正确答案
4. 难度等级（easy/medium/hard）

直接返回JSON格式：
{"questions": [{"id": "1", "knowledgePoint": "知识点", "content": "题目", "options": [{"key": "A", "value": "选项"}, ...], "answer": "B", "difficulty": "medium"}]}`;

    const response = await this.callCozeAPI(prompt);
    try {
      const result = JSON.parse(response);
      return { questions: result.questions || [] };
    } catch {
      return this.mockGeneratePractice(params);
    }
  }

  private async callCozeAPI(prompt: string, imageUrl?: string): Promise<string> {
    const body: any = {
      model: 'coze-dev',
      messages: [
        {
          role: 'user',
          content: imageUrl
            ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }]
            : prompt,
        },
      ],
    };

    const response = await fetch(`${this.config.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`Coze API error: ${data.msg}`);
    }

    // 提取AI回复内容
    return data.messages?.[0]?.content || '{}';
  }

  // ==================== OpenAI API Implementation ====================

  private async openaiDetectSubject(imageUrl: string): Promise<SubjectResult> {
    const prompt = `分析这张作业图片，判断是哪个科目。只需要返回JSON格式的答案，不需要其他文字：
{"subject": "chinese"或"math"或"english", "confidence": 0-100的置信度}
- 语文：包含汉字、拼音、中文句子
- 数学：包含数字、运算符、几何图形
- 英语：包含英文字母、英文单词、英文句子`;

    const response = await this.callOpenAIAPI(prompt, imageUrl);
    const result = JSON.parse(response);

    return {
      subject: result.subject,
      confidence: result.confidence || 80,
    };
  }

  private async openaiCheckHomework(imageUrl: string, subject: string): Promise<{ problems: ProblemCheckResult[] }> {
    const subjectNames: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
    };

    const prompt = `这是一张${subjectNames[subject] || subject}作业的图片。
请识别图片中的每一道题目，判断每道题目的正确/错误状态，并给出正确答案和简要分析。
直接返回JSON数组格式：
[{"id": "1", "status": "correct/incorrect/unclear", "correctAnswer": "正确答案", "analysis": "简要分析", "hint": "提示"}]`;

    const response = await this.callOpenAIAPI(prompt, imageUrl);
    try {
      const problems = JSON.parse(response);
      return { problems: Array.isArray(problems) ? problems : [] };
    } catch {
      return this.mockCheckHomework(subject);
    }
  }

  private async openaiAnalyzeMistake(imageUrl: string, subject: string): Promise<MistakeAnalysisResult> {
    const subjectNames: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
    };

    const prompt = `这是一道${subjectNames[subject] || subject}错题的图片。
请分析这道错题：
1. 给出题目名称/标题
2. 给出正确答案
3. 列出涉及的知识点
4. 列出知识盲点（学生容易犯错的地方）
5. 给出详细的解题分析

直接返回JSON格式：
{"title": "标题", "correctAnswer": "正确答案", "knowledgePoints": ["知识点1", "知识点2"], "blindPoints": ["盲点1", "盲点2"], "analysis": "详细分析"}`;

    const response = await this.callOpenAIAPI(prompt, imageUrl);
    try {
      return JSON.parse(response);
    } catch {
      return this.mockAnalyzeMistake(subject);
    }
  }

  private async openaiGeneratePractice(params: {
    subject: string;
    knowledgePoints: string[];
    count: number;
  }): Promise<PracticeGenerateResult> {
    const subjectNames: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
    };

    const kpText = params.knowledgePoints.length > 0
      ? params.knowledgePoints.join('、')
      : '综合练习';

    const prompt = `请为${subjectNames[params.subject] || params.subject}科目生成${params.count}道练习题。
知识点范围：${kpText}
每道题需要有：
1. 题目内容
2. 4个选项（A、B、C、D）
3. 正确答案
4. 难度等级（easy/medium/hard）

直接返回JSON格式：
{"questions": [{"id": "1", "knowledgePoint": "知识点", "content": "题目", "options": [{"key": "A", "value": "选项"}, ...], "answer": "B", "difficulty": "medium"}]}`;

    const response = await this.callOpenAIAPI(prompt);
    try {
      const result = JSON.parse(response);
      return { questions: result.questions || [] };
    } catch {
      return this.mockGeneratePractice(params);
    }
  }

  private async callOpenAIAPI(prompt: string, imageUrl?: string): Promise<string> {
    const messages: any[] = [
      {
        role: 'user',
        content: imageUrl
          ? [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ]
          : prompt,
      },
    ];

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o',
        messages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    return data.choices?.[0]?.message?.content || '{}';
  }

  // ==================== Mock Implementations ====================

  private mockDetectSubject(): SubjectResult {
    const subjects: ('chinese' | 'math' | 'english')[] = ['chinese', 'math', 'english'];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    return {
      subject: randomSubject,
      confidence: Math.floor(Math.random() * 30) + 70,
    };
  }

  private mockCheckHomework(subject: string): { problems: ProblemCheckResult[] } {
    const problems: ProblemCheckResult[] = [];
    const count = Math.floor(Math.random() * 3) + 3; // 3-5题

    for (let i = 0; i < count; i++) {
      const isCorrect = Math.random() > 0.4;
      problems.push({
        id: String(i + 1),
        status: isCorrect ? 'correct' : 'incorrect',
        correctAnswer: isCorrect ? '' : this.getMockAnswer(subject, i),
        analysis: isCorrect ? '' : this.getMockAnalysis(subject, i),
        hint: isCorrect ? '' : this.getMockHint(subject, i),
      });
    }

    return { problems };
  }

  private mockAnalyzeMistake(subject: string): MistakeAnalysisResult {
    const mockData: Record<string, MistakeAnalysisResult> = {
      math: {
        title: '有余数的除法',
        correctAnswer: '24 ÷ 5 = 4 …… 4',
        knowledgePoints: ['有余数除法', '除法竖式计算', '余数概念'],
        blindPoints: ['余数必须小于除数', '商的位置确定'],
        analysis: '这道题考查了学生对有余数除法的理解。学生错误地将余数写成了大于除数的形式，说明对余数的概念理解不够清晰。',
      },
      chinese: {
        title: '形近字辨析',
        correctAnswer: '已、己',
        knowledgePoints: ['形近字识别', '汉字结构分析'],
        blindPoints: ['"已"表示已经，"己"表示自己'],
        analysis: '这道题考查了学生对形近字的辨析能力。"已"开门的已，"己"是天干第二位，两字形状相似但意思完全不同。',
      },
      english: {
        title: '一般现在时',
        correctAnswer: 'She plays tennis every day.',
        knowledgePoints: ['一般现在时', '第三人称单数动词变化'],
        blindPoints: ['动词第三人称单数要加s或es'],
        analysis: '这道题考查了学生对一般现在时第三人称单数形式的掌握。在一般现在时中，当主语是第三人称单数时，动词要变为第三人称单数形式，即在词尾加s或es。',
      },
    };

    return mockData[subject] || mockData.math;
  }

  private mockGeneratePractice(params: {
    subject: string;
    knowledgePoints: string[];
    count: number;
  }): PracticeGenerateResult {
    const questions: PracticeQuestion[] = [];

    // 使用预定义的题目库
    const questionBank = this.getQuestionBank(params.subject);

    // 随机选择题目
    const shuffled = [...questionBank].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(params.count, shuffled.length));

    selected.forEach((q, i) => {
      questions.push({
        id: `q_${Date.now()}_${i}`,
        ...q,
      });
    });

    return { questions };
  }

  private getQuestionBank(subject: string): Omit<PracticeQuestion, 'id'>[] {
    const banks: Record<string, Omit<PracticeQuestion, 'id'>[]> = {
      math: [
        {
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
          knowledgePoint: '有余数除法',
          content: '用竖式计算：45 ÷ 6 = ?',
          options: [
            { key: 'A', value: '7 …… 3' },
            { key: 'B', value: '7 …… 5' },
            { key: 'C', value: '8 …… 3' },
            { key: 'D', value: '6 …… 9' },
          ],
          answer: 'A',
          difficulty: 'easy',
        },
        {
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
      ],
      chinese: [
        {
          knowledgePoint: '形近字',
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
          knowledgePoint: '同音字',
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
      english: [
        {
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
          knowledgePoint: '可数名词',
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
    };

    return banks[subject] || banks.math;
  }

  private getMockAnswer(subject: string, index: number): string {
    const answers: Record<string, string[]> = {
      math: ['商5余3', '84', '43'],
      chinese: ['已', '在再'],
      english: ['plays', 'books'],
    };
    const subjectAnswers = answers[subject] || answers.math;
    return subjectAnswers[index % subjectAnswers.length];
  }

  private getMockAnalysis(subject: string, index: number): string {
    const analyses: Record<string, string[]> = {
      math: ['注意检查计算步骤', '仔细审题'],
      chinese: ['注意区分形近字', '再表示又一次，在表示存在'],
      english: ['第三人称单数动词要加s', 'book的复数是books'],
    };
    const subjectAnalyses = analyses[subject] || analyses.math;
    return subjectAnalyses[index % subjectAnalyses.length];
  }

  private getMockHint(subject: string, index: number): string {
    const hints: Record<string, string[]> = {
      math: ['重新计算一下', '检查除法竖式'],
      chinese: ['看看字的组成部分', '联系词语意思'],
      english: ['动词要变复数形式', '注意可数名词复数'],
    };
    const subjectHints = hints[subject] || hints.math;
    return subjectHints[index % subjectHints.length];
  }
}

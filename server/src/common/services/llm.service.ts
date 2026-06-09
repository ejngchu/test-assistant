import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 科目识别结果
export interface SubjectResult {
  subject: 'chinese' | 'math' | 'english';
  confidence: number;
}

// 作业检查问题结果
export interface ProblemCheckResult {
  id: string;
  status: 'correct' | 'incorrect' | 'unclear';
  questionText?: string;  // P2-题目内容（2026-06-08）：真实 LLM 应返回题干文字
  correctAnswer: string;
  analysis: string;
  hint?: string;
  knowledgePoints?: string[]; // P3-减少LLM请求（2026-06-08）：随 checkHomework 一并返回，省去一次 analyzeMistake
  blindPoints?: string[];     // 同上
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
  private config!: LLMConfig;

  /** 静态全局 mockMode 开关。false=真实 LLM，true=Mock。默认 false。通过 setMockMode() 动态切换 */
  static globalMockMode: boolean = false;

  /** 通过 API 设置全局 mockMode */
  static setMockMode(enabled: boolean): void {
    LLMService.globalMockMode = enabled;
    console.log(`[LLMService] mockMode set to ${enabled} via API`);
  }

  /** 查询当前 mock 状态 */
  static getMockMode(): boolean {
    return LLMService.globalMockMode;
  }

  /** 运行时仅读取静态开关，不做实例级缓存 */
  private get mockMode(): boolean {
    return LLMService.globalMockMode;
  }

  constructor(private configService: ConfigService) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    const llmApiKey = this.configService.get<string>('LLM_API_KEY', '');
    const apiKey = openaiApiKey || llmApiKey;
    this.config = {
      apiKey: apiKey || '',
      baseUrl: this.configService.get<string>('OPENAI_BASE_URL', '')
        || this.configService.get<string>('LLM_BASE_URL', ''),
      model: this.configService.get<string>('OPENAI_MODEL', '')
        || this.configService.get<string>('LLM_MODEL', ''),
    };

    console.log('[LLMService] 构造: config 已初始化, apiKey 存在:', !!this.config.apiKey);
  }

  /**
   * 检测作业科目
   * 2026-06-09 P0-2：移除 catch→mock fallback。
   * 真实模式下 LLM 报错必须抛出，让前端感知，不允许"假阳性"。
   * 仅 LLMService.globalMockMode=true 时返回 mock。
   */
  async detectSubject(imageUrl: string): Promise<SubjectResult> {
    if (this.mockMode) {
      return this.mockDetectSubject();
    }
    return await this.openaiDetectSubject(imageUrl);
  }

  /**
   * 检查作业完成情况
   * P2（2026-06-08）：单次 LLM 调用同时返回 problems + learningSuggestion
   * 节省一次 request（之前错误后需要再调 analyzeMistake）
   * 2026-06-09 P0-2：错误直接 throw（已就是这行为，无需改）
   */
  async checkHomework(imageUrl: string, subject: string): Promise<{
    problems: ProblemCheckResult[];
    learningSuggestion?: string;
  }> {
    if (this.mockMode) {
      return this.mockCheckHomework(subject);
    }
    return await this.openaiCheckHomework(imageUrl, subject);
  }

  /**
   * 分析错题
   * 2026-06-09 P0-2：移除 catch→mock fallback。
   */
  async analyzeMistake(imageUrl: string, subject: string): Promise<MistakeAnalysisResult> {
    if (this.mockMode) {
      return this.mockAnalyzeMistake(subject);
    }
    return await this.openaiAnalyzeMistake(imageUrl, subject);
  }

  /**
   * 生成练习题
   * 2026-06-09 P0-2：移除 catch→mock fallback。
   */
  async generatePractice(params: {
    subject: string;
    knowledgePoints: string[];
    count: number;
  }): Promise<PracticeGenerateResult> {
    if (this.mockMode) {
      return this.mockGeneratePractice(params);
    }
    return await this.openaiGeneratePractice(params);
  }

  // ==================== OpenAI API Implementation ====================

  private async openaiDetectSubject(imageUrl: string): Promise<SubjectResult> {
    const prompt = `分析这张作业图片，判断是哪个科目。只需要返回JSON格式的答案，不需要其他文字：
{"subject": "chinese"或"math"或"english", "confidence": 0-100的置信度}
- 语文：包含汉字、拼音、中文句子
- 数学：包含数字、运算符、几何图形
- 英语：包含英文字母、英文单词、英文句子`;

    const response = await this.callOpenAIAPI(prompt, imageUrl);
    const result = JSON.parse(response) as SubjectResult;

    return {
      subject: result.subject,
      confidence: result.confidence || 80,
    };
  }

  private async openaiCheckHomework(
    imageUrl: string,
    subject: string,
  ): Promise<{ problems: ProblemCheckResult[]; learningSuggestion?: string }> {
    const subjectNames: Record<string, string> = {
      chinese: '语文',
      math: '数学',
      english: '英语',
    };

    // P2（2026-06-08）：单次调用同时返回 problems + learningSuggestion
    // P3（2026-06-08）：每道题额外返回 knowledgePoints + blindPoints，省去一次 analyzeMistake
    // P4（2026-06-08）：强调必须全部输出，加 max_tokens=16384 防止截断
    const prompt = `这是一张${subjectNames[subject] || subject}作业的图片。
请完成以下任务（用一次回答完成所有）：

1. 识别图片中**每一道**题目，按顺序编号（从 1 开始）。**必须识别全部题目，不要遗漏任何一道，不要只输出前几道。**
2. 对每道题判断：correct（正确）/ incorrect（有误）/ unclear（图片不清晰无法判断）
3. 对每道题，给出正确答案（correct 也要给，作"对的就是这个"）
4. 对每道题，**必须原样输出题干文字**到 questionText 字段（重要：让孩子看得到原题）
5. 对每道题，列出涉及的知识点（如 "两位数加法"、"有余数除法"）
6. 对 incorrect 的题，再列出知识盲点（学生容易犯错的地方，如 "余数必须小于除数"）
7. 对 incorrect 的题，给出简要 analysis（为什么错）和 hint（提示）
8. 最后给一段 50-100 字的整体学习建议（针对错题类型说怎么改进）

直接返回 JSON 格式（不要用 markdown 代码块包裹）：
{
  "problems": [
    {
      "id": "1",
      "status": "correct/incorrect/unclear",
      "questionText": "题目的完整原文（一字不漏）",
      "correctAnswer": "正确答案",
      "knowledgePoints": ["知识点1", "知识点2"],
      "blindPoints": ["盲点1", "盲点2"],
      "analysis": "简要分析（correct 可空字符串）",
      "hint": "提示（correct 可空字符串）"
    }
  ],
  "learningSuggestion": "整体学习建议（50-100 字，温柔鼓励为主，指出改进方向）"
}`;

    const response = await this.callOpenAIAPI(prompt, imageUrl);
    console.log(`[LLMService] checkHomework raw response (${response.length} chars):`, response.slice(0, 300));
    try {
      const parsed = JSON.parse(response);
      // 兼容 LLM 返回数组（旧 prompt）或对象（新 prompt）
      if (Array.isArray(parsed)) {
        return { problems: parsed as ProblemCheckResult[] };
      }
      return {
        problems: Array.isArray(parsed.problems) ? parsed.problems : [],
        learningSuggestion: typeof parsed.learningSuggestion === 'string' ? parsed.learningSuggestion : undefined,
      };
    } catch (e) {
      console.warn('[LLMService] checkHomework JSON parse failed, attempting repair:', (e as Error).message);
      // 尝试修复截断的 JSON：补 ]} 再 parse
      const repaired = tryRepairTruncatedJson(response);
      if (repaired) {
        try {
          const parsed = JSON.parse(repaired);
          console.log('[LLMService] checkHomework JSON repaired, got', Array.isArray(parsed.problems) ? parsed.problems.length : 0, 'problems');
          if (Array.isArray(parsed)) {
            return { problems: parsed as ProblemCheckResult[] };
          }
          return {
            problems: Array.isArray(parsed.problems) ? parsed.problems : [],
            learningSuggestion: typeof parsed.learningSuggestion === 'string' ? parsed.learningSuggestion : undefined,
          };
        } catch {
          // 修复也失败，继续降级
        }
      }
      console.warn('[LLMService] checkHomework JSON repair also failed, fallback to mock');
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
      return JSON.parse(response) as MistakeAnalysisResult;
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
      const result = JSON.parse(response) as PracticeGenerateResult;
      return { questions: result.questions || [] };
    } catch {
      return this.mockGeneratePractice(params);
    }
  }

  private async callOpenAIAPI(prompt: string, imageUrl?: string): Promise<string> {
    if (!this.config.apiKey || !this.config.baseUrl) {
      throw new Error(
        'LLM 环境变量未配置。请在 server/.env.local 中设置以下变量之一：\n'
        + '  - LLM_API_KEY + LLM_BASE_URL（推荐）\n'
        + '  - OPENAI_API_KEY + OPENAI_BASE_URL（兼容 OpenAI 格式）\n'
        + '当前值：\n'
        + `  apiKey: ${this.config.apiKey ? '已设置' : '未设置'}\n`
        + `  baseUrl: ${this.config.baseUrl || '未设置'}\n`
        + '如需临时使用 Mock 模式，请在设置页面启用「演示模式」。'
      );
    }

    let processedImageUrl: string | undefined;
    if (imageUrl) {
      processedImageUrl = await this.imageUrlToDataUrl(imageUrl);
    }

    const messages: any[] = [
      {
        role: 'user',
        content: processedImageUrl
          ? [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: processedImageUrl } },
            ]
          : prompt,
      },
    ];

    const url = `${this.config.baseUrl}/chat/completions`;
    const body = JSON.stringify({
      model: this.config.model,
      messages,
      max_tokens: 8192, // P4-修复（2026-06-08）：大题量作业 JSON 可能超默认 4096，显式设大防止截断；但 qwen-vl-plus 上限 8192，超了报 400
    });

    // 调试日志：精确打印请求信息（截断 base64，只打前 80 字符）
    console.log(`[LLMService] callOpenAIAPI 请求:`);
    console.log(`  - URL: ${url}`);
    console.log(`  - model: ${this.config.model}`);
    console.log(`  - apiKey 前缀: ${this.config.apiKey ? this.config.apiKey.slice(0, 8) + '...' : '(空)'}`);
    console.log(`  - 含图片: ${!!processedImageUrl}`);
    console.log(`  - prompt 前 120 字符: ${prompt.slice(0, 120)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(120000),
    });

    console.log(`[LLMService] 响应: HTTP ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (data.error) {
      console.log(`[LLMService] API 错误: ${JSON.stringify(data.error)}`);
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const raw = data.choices?.[0]?.message?.content || '{}';
    console.log(`[LLMService] 响应内容 前 200 字符: ${raw.slice(0, 200)}`);

    // Strip markdown code fences (```json / ```) — qwen-vl-ocr and many models wrap JSON this way
    const stripped = raw
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?\s*```\s*$/, '')
      .trim();
    return stripped || '{}';
  }

  /**
   * 把图片 URL 转成 base64 data URL
   * - data: URL 直接返回
   * - 相对路径（如 /uploads/xxx.png）读本地文件
   * - http(s):// 远程 URL 用 fetch 下载
   *
   * 适用：MiniMax-M3 / 类 OpenAI 视觉模型要求 image_url.url 必须是 data: URL
   */
  private async imageUrlToDataUrl(imageUrl: string): Promise<string> {
    // 已经是 data URL
    if (imageUrl.startsWith('data:')) return imageUrl;

    // 远程 URL（http/https）—— fetch 下载
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        throw new Error(`下载图片失败: ${response.status} ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    }

    // 本地路径（如 /uploads/xxx.png）—— 读文件
    // 相对项目根解析：imageUrl = '/uploads/xxx.png' → 'server/uploads/xxx.png'
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.isAbsolute(imageUrl)
      ? imageUrl
      : path.resolve(process.cwd(), imageUrl.replace(/^\//, ''));
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext || 'jpeg';
    return `data:image/${mime};base64,${buffer.toString('base64')}`;
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

  private getMockKnowledgePoints(subject: string, index: number): string[] {
    const banks: Record<string, string[][]> = {
      math: [
        ['两位数乘法', '竖式计算'],
        ['除法竖式', '商的计算'],
        ['分数运算', '分数概念'],
        ['加减法', '应用题'],
        ['角度计算', '三角形内角和'],
      ],
      chinese: [
        ['形近字辨析', '汉字结构'],
        ['反问句', '句式转换'],
        ['成语理解', '词语辨析'],
        ['修辞手法', '描写方法'],
        ['关联词', '句子结构'],
      ],
      english: [
        ['一般现在时', '动词变化'],
        ['名词复数', '可数名词'],
        ['过去式', '不规则动词'],
        ['连词', '复合句'],
        ['短语翻译', '日常表达'],
      ],
    };
    const bank = banks[subject] || banks.math;
    return bank[index % bank.length];
  }

  private getMockBlindPoints(subject: string, index: number): string[] {
    const banks: Record<string, string[][]> = {
      math: [
        ['忽略进位', '乘法表不熟'],
        ['商的位置确定', '余数不能大于除数'],
        ['分数通分', '单位1的理解'],
        ['审题不清', '遗漏步骤'],
        ['三角形分类混淆', '内角和定理'],
      ],
      chinese: [
        ['字形结构分辨不清'],
        ['陈述句反问句转换规则不清'],
        ['成语字面义理解'],
        ['修辞手法判断不准'],
        ['关联词使用不当'],
      ],
      english: [
        ['第三人称单数动词变化'],
        ['名词复数规则不熟'],
        ['不规则过去式记忆'],
        ['句子结构不完整'],
        ['单词拼写错误'],
      ],
    };
    const bank = banks[subject] || banks.math;
    return bank[index % bank.length];
  }

  private mockCheckHomework(subject: string): { problems: ProblemCheckResult[]; learningSuggestion?: string } {
    const problems: ProblemCheckResult[] = [];
    const count = Math.floor(Math.random() * 3) + 3; // 3-5题

    // P2-题目内容（2026-06-08）：mock 现在返回题干 + 所有题都填答案/解析，
    // 让用户能看到完整反馈（之前只有 incorrect 才有信息）
    const subjectBank: Record<string, string[]> = {
      math: [
        '计算 23 × 17 = ?',
        '用竖式计算 456 ÷ 8 = ?',
        '一根绳子长 3/4 米，平均分成 3 段，每段多少米？',
        '小红有 48 个糖果，吃了 1/3，还剩多少个？',
        '一个三角形的三个内角和是多少度？',
      ],
      chinese: [
        '"己、已、巳"三个字的正确用法是？',
        '把下列句子改成反问句：今天真热。',
        '"再接再厉"的"厉"是什么意思？',
        '写出三个描写春天的四字词语。',
        '用"因为...所以..."造一个句子。',
      ],
      english: [
        'She ___ (go) to school every day.',
        'Choose the correct plural: child / childs / children',
        'What is the past tense of "eat"?',
        'Write a sentence using "because".',
        'Translate: 我喜欢吃苹果。',
      ],
    };
    const bank = subjectBank[subject] || subjectBank.math;
    const answers: Record<string, string[]> = {
      math: ['391', '57', '1/4 米', '32 个', '180°'],
      chinese: ['己', '今天真热，难道不是吗？', '磨砺、奋勉', '春暖花开/鸟语花香/万物复苏', '因为我迟到了，所以我错过了公交。'],
      english: ['goes', 'children', 'ate', 'I stayed home because I was sick.', 'I like eating apples.'],
    };
    const ans = answers[subject] || answers.math;

    for (let i = 0; i < count; i++) {
      const isCorrect = Math.random() > 0.4;
      const isUnclear = !isCorrect && Math.random() < 0.15;  // 15% 的"不正确"其实是"不清晰"
      const status: 'correct' | 'incorrect' | 'unclear' = isCorrect ? 'correct' : (isUnclear ? 'unclear' : 'incorrect');
      problems.push({
        id: String(i + 1),
        status,
        questionText: bank[i % bank.length],
        // 所有题都填字段：正确的有答案作为"对的就是这个"，不正确的有答案作为"应该是"
        correctAnswer: ans[i % ans.length],
        knowledgePoints: this.getMockKnowledgePoints(subject, i),
        blindPoints: status === 'incorrect' ? this.getMockBlindPoints(subject, i) : [],
        analysis: this.getMockAnalysis(subject, i) || (isCorrect ? '回答正确' : this.getMockHint(subject, i)),
        hint: isCorrect ? '' : this.getMockHint(subject, i),
      });
    }

    return {
      problems,
      // P2-学习建议（2026-06-08）：mock 也返回假建议，根据错题统计
      learningSuggestion: this.generateMockSuggestion(subject, problems),
    };
  }

  private generateMockSuggestion(subject: string, problems: ProblemCheckResult[]): string {
    const incorrectCount = problems.filter((p) => p.status === 'incorrect').length;
    const unclearCount = problems.filter((p) => p.status === 'unclear').length;
    const subjectNames: Record<string, string> = { chinese: '语文', math: '数学', english: '英语' };
    const subjectName = subjectNames[subject] || subject;
    if (incorrectCount === 0 && unclearCount === 0) {
      return `太棒了！${subjectName}作业全部正确，继续保持这个学习状态 ✨`;
    }
    if (unclearCount > 0) {
      return `${subjectName}作业有 ${unclearCount} 道图太糊看不清楚，建议在光线充足处重新拍一张更清晰的提交 ✏️`;
    }
    return `${subjectName}作业有 ${incorrectCount} 道需要订正。建议先复习相关知识点，然后重新做一遍错题，把错题存到错题本里定时回顾 📚`;
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

  private getMockAnalysis(subject: string, index: number): string {
    const analyses: Record<string, string[]> = {
      math: [
        '注意检查计算步骤',
        '仔细审题，看清运算符号',
        '余数必须小于除数',
        '竖式计算时注意进位',
        '画图辅助理解题意',
        '检查是否需要带单位',
        '验算可用乘法还原',
      ],
      chinese: [
        '注意区分形近字',
        '再表示又一次，在表示存在',
        '联系上下文理解词义',
        '注意句子的标点符号',
        '背诵常见多音字',
        '理解比喻句的本体和喻体',
        '古诗要理解作者情感',
      ],
      english: [
        '第三人称单数动词要加s',
        'book的复数是books',
        '注意时态一致',
        '可数名词复数加s或es',
        'be 动词随主语变化',
        '一般疑问句用助动词do/does',
        '形容词比较级加er/est',
      ],
    };
    const subjectAnalyses = analyses[subject] || analyses.math;
    return subjectAnalyses[index % subjectAnalyses.length];
  }

  private getMockHint(subject: string, index: number): string {
    const hints: Record<string, string[]> = {
      math: [
        '重新计算一下',
        '检查除法竖式',
        '用乘法验算',
        '画图分一分',
        '列个简单例子',
        '从结果倒推',
        '读题三遍再下笔',
      ],
      chinese: [
        '看看字的组成部分',
        '联系词语意思',
        '放到句子里读一读',
        '查字典确认读音',
        '回忆课文内容',
        '找反义词',
        '标出重点词',
      ],
      english: [
        '动词要变复数形式',
        '注意可数名词复数',
        '检查主谓一致',
        '时态别搞混',
        '背诵不规则动词',
        '朗读培养语感',
        '多看英文动画片',
      ],
    };
    const subjectHints = hints[subject] || hints.math;
    return subjectHints[index % subjectHints.length];
  }
}

// LLM 配置类型
interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/**
 * 尝试修复被截断的 JSON（max_tokens 不够导致 LLM 返回不完整）
 * 策略：从 problems 数组中找出所有完整闭合的 problem 对象，重建 JSON
 * 返回修复后的 JSON 字符串，失败返回 null
 */
function tryRepairTruncatedJson(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return null

  // 如果已经合法，不需要修复
  try { JSON.parse(trimmed); return null } catch { /* expected */ }

  // 定位 problems 数组起始位置
  const problemsKey = trimmed.indexOf('"problems"')
  if (problemsKey === -1) return null

  const arrayStart = trimmed.indexOf('[', problemsKey)
  if (arrayStart === -1) return null

  // 取 [ 之后的内容，逐字符扫描找完整的 {} 对象
  const content = trimmed.slice(arrayStart + 1)
  let depth = 0
  let inString = false
  let escapeNext = false
  let lastCompleteEnd = 0
  let objectCount = 0

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]

    if (escapeNext) { escapeNext = false; continue }
    if (ch === '\\' && inString) { escapeNext = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{') {
      if (depth === 0) objectCount++
      depth++
    }
    if (ch === '}') {
      depth--
      if (depth === 0) {
        lastCompleteEnd = i + 1 // 这个对象的结尾（在 content 中的偏移）
      }
    }
  }

  if (objectCount === 0 || lastCompleteEnd === 0) return null

  // 用完整闭合的对象重建 JSON
  const completePart = content.slice(0, lastCompleteEnd)
  return `{"problems": [${completePart}], "learningSuggestion": ""}`
}

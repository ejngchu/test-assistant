import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMService } from '../llm.service';

// 每次测试前设为 true（mock 模式），因为测试环境没有配置 LLM 环境变量
beforeEach(() => {
  LLMService.globalMockMode = true;
});

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<LLMService>(LLMService);
  });

  describe('mock mode (static)', () => {
    it('should start in mock mode when no API keys configured', () => {
      expect(LLMService.getMockMode()).toBe(true);
    });

    it('should toggle mock mode via setMockMode', () => {
      LLMService.setMockMode(false);
      expect(LLMService.getMockMode()).toBe(false);

      LLMService.setMockMode(true);
      expect(LLMService.getMockMode()).toBe(true);
    });

    it('should reflect runtime toggle on instantiated service', () => {
      // 通过 API 关闭 mockMode
      LLMService.setMockMode(false);
      const result = service['mockMode']; // getter - 应走 globalMockMode
      expect(result).toBe(false);
    });
  });

  describe('detectSubject', () => {
    it('should return a valid subject result in mock mode', async () => {
      const result = await service.detectSubject('http://example.com/img.jpg');
      expect(['chinese', 'math', 'english']).toContain(result.subject);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('generatePractice', () => {
    it('should return requested number of questions in mock mode', async () => {
      const result = await service.generatePractice({
        subject: 'math',
        knowledgePoints: ['除法'],
        count: 2,
      });
      expect(result.questions.length).toBe(2);
      expect(result.questions[0].id).toBeDefined();
      expect(result.questions[0].content).toBeDefined();
    });

    it('should return at most questionBank size', async () => {
      const result = await service.generatePractice({
        subject: 'math',
        knowledgePoints: [],
        count: 999,
      });
      // math 题库有 3 道题
      expect(result.questions.length).toBe(3);
    });
  });

  // P0-2（2026-06-09）：真实模式 + LLM 报错时不允许 fallback 到 mock
  describe('real mode (P0-2 mock marginalization)', () => {
    it('detectSubject should NOT fallback to mock when openai throws', async () => {
      LLMService.setMockMode(false);
      // 强制让底层 openaiDetectSubject 抛错
      jest
        .spyOn(service as any, 'openaiDetectSubject')
        .mockRejectedValue(new Error('upstream LLM 5xx'));

      await expect(service.detectSubject('http://x.png')).rejects.toThrow(/upstream LLM/);

      // 验证：返回的不是 mock 的低 confidence，而是错误被抛出
      // （如果回退到 mock，会返回 { subject: ..., confidence: 30 }，不抛错）
    });

    it('analyzeMistake should NOT fallback to mock when openai throws', async () => {
      LLMService.setMockMode(false);
      jest
        .spyOn(service as any, 'openaiAnalyzeMistake')
        .mockRejectedValue(new Error('vision model timeout'));

      await expect(
        service.analyzeMistake('http://x.png', 'math'),
      ).rejects.toThrow(/vision model timeout/);
    });

    it('generatePractice should NOT fallback to mock when openai throws', async () => {
      LLMService.setMockMode(false);
      jest
        .spyOn(service as any, 'openaiGeneratePractice')
        .mockRejectedValue(new Error('rate limit exceeded'));

      await expect(
        service.generatePractice({ subject: 'math', knowledgePoints: ['除法'], count: 5 }),
      ).rejects.toThrow(/rate limit/);
    });

    it('checkHomework should NOT fallback to mock when openai throws', async () => {
      LLMService.setMockMode(false);
      jest
        .spyOn(service as any, 'openaiCheckHomework')
        .mockRejectedValue(new Error('context length exceeded'));

      await expect(
        service.checkHomework('http://x.png', 'math'),
      ).rejects.toThrow(/context length/);
    });

    it('mock mode 开启时仍然返回 mock（手动调试模式仍可用）', async () => {
      LLMService.setMockMode(true);
      // 不 spy openai 方法 — 应该走 mock 分支，根本不调 LLM
      const result = await service.detectSubject('http://x.png');
      expect(result.confidence).toBeGreaterThan(0);
      expect(['chinese', 'math', 'english']).toContain(result.subject);
    });
  });
});

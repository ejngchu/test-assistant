import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { StudyService } from './study.service';
import { CheckHomeworkDto, AnalyzeMistakeDto, GeneratePracticeDto } from './dto/study.dto';

@Controller('study')
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  /**
   * 作业检查接口
   * POST /api/study/homework/check
   * 接收作业图片，AI分析作业完成情况
   */
  @Post('homework/check')
  async checkHomework(@Body() dto: CheckHomeworkDto) {
    console.log('=== 作业检查接口调用 ===');
    console.log('Method: POST');
    console.log('URL: /api/study/homework/check');
    console.log('Body:', JSON.stringify(dto, null, 2));
    
    const result = await this.studyService.checkHomework(dto);
    
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 错题分析接口
   * POST /api/study/mistake/analyze
   * 接收错题图片，AI分析知识点和知识盲点
   */
  @Post('mistake/analyze')
  async analyzeMistake(@Body() dto: AnalyzeMistakeDto) {
    console.log('=== 错题分析接口调用 ===');
    console.log('Method: POST');
    console.log('URL: /api/study/mistake/analyze');
    console.log('Body:', JSON.stringify(dto, null, 2));
    
    const result = await this.studyService.analyzeMistake(dto);
    
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 获取复习计划接口
   * GET /api/study/review/plan
   * 获取基于艾宾浩斯记忆曲线的复习计划
   */
  @Get('review/plan')
  async getReviewPlan(@Query('userId') userId: string) {
    console.log('=== 获取复习计划接口调用 ===');
    console.log('Method: GET');
    console.log('URL: /api/study/review/plan');
    console.log('Query params:', { userId });
    
    const result = await this.studyService.getReviewPlan(userId);
    
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 记录复习完成接口
   * POST /api/study/review/complete
   * 记录用户完成复习，更新记忆曲线进度
   */
  @Post('review/complete')
  async completeReview(@Body() body: { mistakeId: string; userId: string }) {
    console.log('=== 记录复习完成接口调用 ===');
    console.log('Method: POST');
    console.log('URL: /api/study/review/complete');
    console.log('Body:', JSON.stringify(body, null, 2));
    
    const result = await this.studyService.completeReview(body.mistakeId, body.userId);
    
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 生成练习题接口
   * POST /api/study/practice/generate
   * 基于用户的薄弱知识点生成针对性练习
   */
  @Post('practice/generate')
  async generatePractice(@Body() dto: GeneratePracticeDto) {
    console.log('=== 生成练习题接口调用 ===');
    console.log('Method: POST');
    console.log('URL: /api/study/practice/generate');
    console.log('Body:', JSON.stringify(dto, null, 2));
    
    const result = await this.studyService.generatePractice(dto);
    
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 获取练习历史接口
   * GET /api/study/practice/history
   * 获取用户的练习历史记录
   */
  @Get('practice/history')
  async getPracticeHistory(@Query('userId') userId: string) {
    console.log('=== 获取练习历史接口调用 ===');
    console.log('Method: GET');
    console.log('URL: /api/study/practice/history');
    console.log('Query params:', { userId });
    
    const result = await this.studyService.getPracticeHistory(userId);
    
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 提交练习答案接口
   * POST /api/study/practice/submit
   * 提交用户练习答案，返回批改结果
   */
  @Post('practice/submit')
  async submitPracticeAnswer(@Body() body: { 
    practiceId: string; 
    answers: Record<string, string>;
    userId: string;
  }) {
    console.log('=== 提交练习答案接口调用 ===');
    console.log('Method: POST');
    console.log('URL: /api/study/practice/submit');
    console.log('Body:', JSON.stringify(body, null, 2));
    
    const result = await this.studyService.submitPracticeAnswer(body);
    
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  }
}

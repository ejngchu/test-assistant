import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CheckHomeworkDto {
  @IsString()
  subject: string;

  @IsString()
  imageUrl: string;
}

export class AnalyzeMistakeDto {
  @IsString()
  subject: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  userAnswer?: string;
}

export class GeneratePracticeDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsArray()
  knowledgePoints?: string[];

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsString()
  userId: string;
}

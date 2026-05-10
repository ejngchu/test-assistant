import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { StudyModule } from '@/study/study.module';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CommonModule,
    StudyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

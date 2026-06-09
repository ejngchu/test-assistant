/**
 * P0-1 修复回归测试
 *
 * 验证 StudyService.saveMistake：
 * 1. 完整 payload 走通
 * 2. knowledgePoints/blindPoints 空数组正常（之前是 NOT NULL 风险点）
 * 3. questionImage 为 undefined 时不会因 null/'' 不匹配而崩
 * 4. Drizzle 抛错时返回业务可读的错误码，而不是 500
 * 5. Drizzle NOT NULL / UNIQUE 错误映射成 400 而不是 500
 */
import { StudyService } from '@/study/study.service';

type MistakeInsertValues = Record<string, unknown>;
type ReviewInsertValues = Record<string, unknown>;

interface FakeDrizzleOptions {
  /** 第一次 insert 时抛错，模拟 DB 错误 */
  failMistakeInsertWith?: Error;
  /** 让 mistake insert 返回空数组，模拟没拿到行 */
  returnEmptyMistake?: boolean;
  /** review insert 时抛错 */
  failReviewInsertWith?: Error;
}

const makeFakeDb = (opts: FakeDrizzleOptions = {}) => {
  const insertedReviews: ReviewInsertValues[] = [];
  const insertedMistakes: MistakeInsertValues[] = [];

  // 返回一个 thenable query builder，让 service 可以：
  //   await db.insert(t).values(v).returning(c)
  //   await db.insert(t).values(v)  // 不调 returning
  const buildQuery = (vals: any) => {
    let isMistake = 'knowledgePoints' in vals || 'blindPoints' in vals;
    let isReview = 'stage' in vals || 'nextReviewAt' in vals;

    const execInsert = () => {
      if (isMistake) {
        if (opts.failMistakeInsertWith) throw opts.failMistakeInsertWith;
        if (opts.returnEmptyMistake) return [];
        const nextId = 42 + insertedMistakes.length;
        insertedMistakes.push(vals);
        return [{ id: nextId }];
      }
      if (isReview) {
        if (opts.failReviewInsertWith) throw opts.failReviewInsertWith;
        insertedReviews.push(vals);
        return [{ id: 1 }];
      }
      return [];
    };

    const query: any = {};
    query.returning = async () => execInsert();
    // thenable：await 时直接执行 insert
    query.then = (resolve: any, reject: any) => {
      try {
        resolve(execInsert());
      } catch (e) {
        reject(e);
      }
    };
    return query;
  };

  return {
    insertedMistakes,
    insertedReviews,
    db: {
      insert: (_table: any) => ({
        values: (vals: any) => buildQuery(vals),
      }),
    },
  };
};

const makeService = (db: any) =>
  new StudyService(
    // LLMService 不参与 save 流程，传 mock 即可
    { detectSubject: async () => ({ subject: 'math' as const, confidence: 100 }) } as any,
    db,
  );

const fullPayload = {
  userId: 'user1',
  subject: 'math',
  questionImage: 'http://example.com/x.png',
  title: '有余数除法',
  correctAnswer: '5',
  knowledgePoints: ['除法', '余数'],
  blindPoints: ['余数<除数'],
  analysis: '需要复习余数',
  questionText: '23 ÷ 5 = ?',
  status: 'incorrect' as const,
  hint: '商为 4 余 3',
  learningSuggestion: '多练',
};

describe('StudyService.saveMistake (P0-1)', () => {
  test('完整 payload 走通并返回 id', async () => {
    const fake = makeFakeDb();
    const svc = makeService(fake.db);
    const res = await svc.saveMistake(fullPayload);
    expect(res.code).toBe(200);
    expect(res.data.id).toBe(42);
    expect(fake.insertedMistakes).toHaveLength(1);
    expect(fake.insertedReviews).toHaveLength(1);
    // 复习计划 stage 0 + nextReviewAt 1 天后
    expect(fake.insertedReviews[0].stage).toBe(0);
    expect(typeof fake.insertedReviews[0].nextReviewAt).toBe('string');
  });

  test('knowledgePoints / blindPoints 空数组正常（NOT NULL + JSON 序列化）', async () => {
    const fake = makeFakeDb();
    const svc = makeService(fake.db);
    const res = await svc.saveMistake({
      ...fullPayload,
      knowledgePoints: [],
      blindPoints: [],
    });
    expect(res.code).toBe(200);
    expect(res.data.id).toBe(42);
    expect(fake.insertedMistakes[0].knowledgePoints).toEqual([]);
    expect(fake.insertedMistakes[0].blindPoints).toEqual([]);
  });

  test('questionImage 为 undefined 时使用空字符串默认值', async () => {
    const fake = makeFakeDb();
    const svc = makeService(fake.db);
    const res = await svc.saveMistake({
      ...fullPayload,
      questionImage: undefined as any,
    });
    // DTO 会先在校验阶段拒绝 undefined，但 service 这一层兜底
    // 我们想确认：即使绕过 DTO 到达 service，传 undefined 也不会崩
    expect(res.code).toBe(200);
    expect(fake.insertedMistakes[0].questionImage).toBe('');
  });

  test('分析、状态、提示、建议等可选字段为 undefined 时存 null', async () => {
    const fake = makeFakeDb();
    const svc = makeService(fake.db);
    const res = await svc.saveMistake({
      userId: 'user1',
      subject: 'math',
      questionImage: '',
      title: 't',
      correctAnswer: '5',
      knowledgePoints: [],
      blindPoints: [],
    });
    expect(res.code).toBe(200);
    expect(fake.insertedMistakes[0].analysis).toBeNull();
    expect(fake.insertedMistakes[0].questionText).toBeNull();
    expect(fake.insertedMistakes[0].status).toBeNull();
    expect(fake.insertedMistakes[0].hint).toBeNull();
    expect(fake.insertedMistakes[0].learningSuggestion).toBeNull();
  });

  test('Drizzle 抛 NOT NULL 错误时返回 400 而不是 500', async () => {
    const fake = makeFakeDb({
      failMistakeInsertWith: new Error('NOT NULL constraint failed: mistakes.title'),
    });
    const svc = makeService(fake.db);
    const res = await svc.saveMistake(fullPayload);
    expect(res.code).toBe(400);
    expect(res.msg).toMatch(/必填字段缺失|NOT NULL/);
  });

  test('Drizzle 抛 UNIQUE 错误时返回 400', async () => {
    const fake = makeFakeDb({
      failMistakeInsertWith: new Error('UNIQUE constraint failed: mistakes.id'),
    });
    const svc = makeService(fake.db);
    const res = await svc.saveMistake(fullPayload);
    expect(res.code).toBe(400);
    expect(res.msg).toMatch(/重复/);
  });

  test('Drizzle 抛其他错误时返回 500 + 错误消息（不再裸露 throw）', async () => {
    const fake = makeFakeDb({
      failMistakeInsertWith: new Error('database is locked'),
    });
    const svc = makeService(fake.db);
    const res = await svc.saveMistake(fullPayload);
    expect(res.code).toBe(500);
    expect(res.msg).toMatch(/database is locked/);
  });

  test('mistake insert 返回空数组时返回 500（业务失败）', async () => {
    const fake = makeFakeDb({ returnEmptyMistake: true });
    const svc = makeService(fake.db);
    const res = await svc.saveMistake(fullPayload);
    expect(res.code).toBe(500);
    expect(res.msg).toMatch(/未返回行/);
  });

  test('review insert 失败时不回滚 mistake（已知 gap，但前端能拿到 mistakeId）', async () => {
    const fake = makeFakeDb({
      failReviewInsertWith: new Error('FK constraint failed'),
    });
    const svc = makeService(fake.db);
    const res = await svc.saveMistake(fullPayload);
    // 当前设计：mistake 已插入，review 失败 → 整体 500 让前端感知
    // TODO(V-01 错题权重系统阶段)：改成事务
    expect(res.code).toBe(500);
    expect(res.msg).toMatch(/FK constraint failed/);
  });
});

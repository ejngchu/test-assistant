import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { CircleCheck, CircleX, CircleAlert, RotateCcw, House, BookOpen, LoaderCircle, Check, Pencil } from 'lucide-react-taro'
import { subjectInfo, useAppStore, MistakeItem, parseSubject } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getHomeworkResultCache,
  deleteHomeworkResultCache,
  CachedHomeworkResult,
  HomeworkCheckResult
} from '@/lib/cache/homework-result-cache'
import { WARM_GRADIENT_BG, SUBJECT_OPTIONS } from '@/constants'
import './index.css'

export default function HomeworkResultPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<HomeworkCheckResult | null>(null)
  const [subject, setSubject] = useState('')
  const [imagePath, setImagePath] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  // P1-选择题（2026-06-07）：默认勾选所有"有误"题目，用户可手动增删
  const [selectedProblemIds, setSelectedProblemIds] = useState<Set<string>>(() => new Set())
  // P2-学科修正（2026-06-08）：LLM 识别错的科目，用户可在此手动覆盖
  const [showSubjectEdit, setShowSubjectEdit] = useState(false)
  // P2-快速操作选中态（2026-06-08）：仅错题/全选/清空 三选一高亮
  // P3（2026-06-08）：增加 'incorrect' 态，区分仅错题 vs 全选
  const [selectedAction, setSelectedAction] = useState<'incorrect' | 'all' | 'none' | null>(null)
  const { addMistake } = useAppStore()

  const router = useRouter<{ resultId?: string }>()

  // 安全解析 Subject（兜底 fallback 防止 undefined）
  const safeSubject = parseSubject(subject)

  // 切换某道题的勾选状态
  const toggleProblem = (id: string) => {
    setSelectedProblemIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 全选 / 仅错题 / 清空 快捷操作 + 同步高亮态
  const selectAll = () => {
    if (!result) return
    setSelectedProblemIds(new Set(result.problems.map(p => p.id)))
    setSelectedAction('all')
  }
  const selectNone = () => {
    setSelectedProblemIds(new Set())
    setSelectedAction('none')
  }
  const selectOnlyIncorrect = () => {
    if (!result) return
    setSelectedProblemIds(new Set(result.problems.filter(p => p.status === 'incorrect').map(p => p.id)))
    setSelectedAction('incorrect')
  }

  // 保存选中的题目到错题本
  const saveMistakesToBook = async () => {
    if (!result || !subject) return

    const selectedProblems = result.problems.filter(p => selectedProblemIds.has(p.id))
    if (selectedProblems.length === 0) {
      Taro.showToast({ title: '请先勾选要保存的题目', icon: 'none' })
      return
    }

    setIsSaving(true)

    for (let i = 0; i < selectedProblems.length; i++) {
      const problem = selectedProblems[i]
      const newMistake: MistakeItem = {
        id: `mistake_${Date.now()}_${i}`,
        subject: safeSubject || 'chinese',
        title: `${subjectInfo[safeSubject || 'chinese']?.name || subject}作业错题 - 第${problem.id}题`,
        questionImage: imagePath,
        correctAnswer: problem.correctAnswer || problem.hint || '请查看正确答案',
        knowledgePoints: problem.knowledgePoints || [],  // P3-减少LLM请求：来自 checkHomework 同一次调用
        blindPoints: problem.blindPoints || [],           // 同上
        createdAt: new Date().toISOString().split('T')[0],
        reviewCount: 0,
        date: new Date().toISOString().split('T')[0],
        mastered: false,
        analysis: problem.analysis
      }

      addMistake(newMistake)
    }

    setSavedCount(selectedProblems.length)
    setIsSaving(false)
    Taro.showToast({
      title: `已保存 ${selectedProblems.length} 道题到错题本`,
      icon: 'success'
    })
    // 延迟跳转，让用户看到 toast 提示
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/mistakes/index' })
    }, 1200)
  }

  useEffect(() => {
    // 从全局缓存按 resultId 取出结果（取代旧的 URLSearchParams 传大对象，避免小程序端被截断）
    const resultId = router.params.resultId
    const cached: CachedHomeworkResult | null = resultId ? getHomeworkResultCache(resultId) : null

    // 初始化默认勾选：所有"有误"题目自动勾上
    const initSelection = (r: HomeworkCheckResult) => {
      const initial = new Set<string>()
      r.problems.forEach(p => {
        if (p.status === 'incorrect') initial.add(p.id)
      })
      setSelectedProblemIds(initial)
    }

    if (cached) {
      setSubject(cached.subject)
      setImagePath(cached.image)
      if (cached.result) {
        setResult(cached.result)
        initSelection(cached.result)
      }
      // 读完即删，避免长时间占内存
      if (resultId) deleteHomeworkResultCache(resultId)
      setIsLoading(false)
      return
    }

    // 没拿到缓存（直接进入或被清理了）：回退到默认 mock 结果
    console.warn('[homework-result] resultId 缓存未命中，使用默认结果', { resultId })
    const fallback: HomeworkCheckResult = {
      completed: true,
      totalProblems: 5,
      correctCount: 3,
      incorrectCount: 1,
      unclearCount: 1,
      problems: [
        { id: '1', status: 'correct', questionText: '计算 23 × 17 = ?', correctAnswer: '391', analysis: '回答正确' },
        { id: '2', status: 'correct', questionText: '用竖式计算 456 ÷ 8 = ?', correctAnswer: '57', analysis: '回答正确' },
        { id: '3', status: 'incorrect', questionText: '一根绳子长 3/4 米，平均分成 3 段，每段多少米？', correctAnswer: '1/4 米', analysis: '分数除法需要将被除数乘以除数的倒数', hint: '请检查计算步骤' },
        { id: '4', status: 'correct', questionText: '小红有 48 个糖果，吃了 1/3，还剩多少个？', correctAnswer: '32 个', analysis: '回答正确' },
        { id: '5', status: 'unclear', questionText: '一个三角形的三个内角和是多少度？', correctAnswer: '180°', hint: '图片不清晰' }
      ]
    }
    setResult(fallback)
    initSelection(fallback)
    setIsLoading(false)
  }, [])

  // 返回首页
  const goHome = () => {
    Taro.switchTab({ url: '/pages/index/index' })
  }

  // 重新拍照
  const retake = () => {
    Taro.navigateBack()
  }

  // 获取状态信息
  const getStatusInfo = (status: 'correct' | 'incorrect' | 'unclear') => {
    switch (status) {
      case 'correct':
        return { icon: CircleCheck, color: '#22C55E', bgColor: '#F0FDF4', textColor: '#166534', mutedColor: '#15803D', bgClass: 'bg-success bg-opacity-10', text: '已完成' }
      case 'incorrect':
        return { icon: CircleX, color: '#EF4444', bgColor: '#FEF2F2', textColor: '#991B1B', mutedColor: '#B91C1C', bgClass: 'bg-error bg-opacity-10', text: '有误' }
      case 'unclear':
        return { icon: CircleAlert, color: '#F59E0B', bgColor: '#FFFBEB', textColor: '#92400E', mutedColor: '#B45309', bgClass: 'bg-warning bg-opacity-10', text: '不清晰' }
    }
  }

  if (isLoading) {
    return (
      <View className="min-h-screen bg-background flex flex-col items-center justify-center">
        <View className="w-16 h-16 rounded-full border-4 border-primary bg-opacity-20 border-t-primary animate-spin mb-4" />
        <Text className="block text-base text-gray-600">正在分析作业...</Text>
        <Text className="block text-sm text-gray-400 mt-2">请稍候</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background pb-24">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white">
        <View className="flex items-center justify-between">
          <Text className="block text-lg font-semibold text-foreground">作业检查结果</Text>
          <View
            className="flex items-center gap-2"
            onClick={() => setShowSubjectEdit((v) => !v)}
          >
            <Badge
              className="text-xs px-2 py-1"
              style={{
                backgroundColor: safeSubject ? subjectInfo[safeSubject].bgColor : '#E5E7EB',
                color: safeSubject ? subjectInfo[safeSubject].color : '#6B7280',
              }}
            >
              {safeSubject ? subjectInfo[safeSubject].name : subject}
              {showSubjectEdit ? null : <Pencil size={10} color={safeSubject ? subjectInfo[safeSubject].color : '#6B7280'} className="ml-1" />}
            </Badge>
          </View>
        </View>
      </View>

      {/* P2-学科修正（2026-06-08）：识别错的科目手动覆盖 */}
      {showSubjectEdit && (
        <View className="px-4 py-3 bg-orange-50 border-b border-orange-100">
          <Text className="block text-xs text-orange-700 mb-2">识别错误？手动选择正确科目：</Text>
          <View className="grid grid-cols-3 gap-2">
            {SUBJECT_OPTIONS.map((opt) => {
              const isActive = safeSubject === opt.key
              const info = subjectInfo[opt.key]
              return (
                <View
                  key={opt.key}
                  className="py-2 rounded-xl flex items-center justify-center border-2"
                  style={{
                    borderColor: isActive ? info.color : 'transparent',
                    backgroundColor: isActive ? info.color : '#FFFFFF',
                  }}
                  onClick={() => {
                    setSubject(opt.key)
                    setShowSubjectEdit(false)
                    Taro.showToast({ title: `已改为${opt.name}`, icon: 'success' })
                  }}
                >
                  <Text
                    className="block text-sm font-medium"
                    style={{ color: isActive ? '#FFFFFF' : info.color }}
                  >
                    {opt.name}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* 图片展示区域 */}
      {imagePath && (
        <View className="px-4 py-3">
          <Text className="block text-sm font-medium text-foreground mb-2">作业图片</Text>
          <View className="rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={imagePath}
              mode="aspectFit"
              className="w-full h-64"
            />
          </View>
          {/* 图例 */}
          <View className="flex items-center gap-4 mt-2">
            {result && result.incorrectCount > 0 && (
              <View className="flex items-center gap-1">
                <View className="w-3 h-3 rounded-full bg-error" />
                <Text className="block text-xs text-gray-500">有误 ({result.incorrectCount})</Text>
              </View>
            )}
            {result && result.unclearCount > 0 && (
              <View className="flex items-center gap-1">
                <View className="w-3 h-3 rounded-full bg-warning" />
                <Text className="block text-xs text-gray-500">不清晰 ({result.unclearCount})</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 总体结果 */}
      <View className="px-4 py-4">
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-0">
            {/* 统计概览 */}
            <View className="p-4" style={{ background: WARM_GRADIENT_BG }}>
              <View className="flex items-center justify-around">
                <View className="text-center">
                  <Text className="block text-3xl font-bold text-success">{result?.correctCount}</Text>
                  <Text className="block text-xs text-gray-500 mt-1">完成</Text>
                </View>
                <View className="w-px h-12 bg-gray-200" />
                <View className="text-center">
                  <Text className="block text-3xl font-bold text-error">{result?.incorrectCount}</Text>
                  <Text className="block text-xs text-gray-500 mt-1">有误</Text>
                </View>
                <View className="w-px h-12 bg-gray-200" />
                <View className="text-center">
                  <Text className="block text-3xl font-bold text-warning">{result?.unclearCount}</Text>
                  <Text className="block text-xs text-gray-500 mt-1">不清晰</Text>
                </View>
              </View>
              
              {/* 进度条 */}
              <View className="mt-4">
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                  {result && (
                    <>
                      <View 
                        className="bg-success h-full" 
                        style={{ width: `${(result.correctCount / result.totalProblems) * 100}%` }} 
                      />
                      <View 
                        className="bg-error h-full" 
                        style={{ width: `${(result.incorrectCount / result.totalProblems) * 100}%` }} 
                      />
                      <View 
                        className="bg-warning h-full" 
                        style={{ width: `${(result.unclearCount / result.totalProblems) * 100}%` }} 
                      />
                    </>
                  )}
                </View>
              </View>
            </View>

{/* 问题列表 - P1 选择题版（2026-06-07） */}
              <View className="p-4">
                <View className="flex items-center justify-between mb-3">
                  <Text className="block text-sm font-medium text-foreground">选择要保存的题目</Text>
                  <Text className="block text-xs text-gray-500">
                    已选 {selectedProblemIds.size} / {result?.problems.length || 0}
                  </Text>
                </View>

                {/* 批量操作 — P3 简化选中态（2026-06-08）：每种按钮有自己的选中颜色，未选中统一灰色 */}
<View className="flex gap-2 mb-3">
  <View
    className="px-3 py-1 rounded-full"
    style={{
      backgroundColor: selectedAction === 'incorrect' ? '#F59E0B' : '#F3F4F6',
    }}
    onClick={selectOnlyIncorrect}
  >
    <Text
      className="block text-xs font-semibold"
      style={{
        color: selectedAction === 'incorrect' ? '#FFFFFF' : '#374151',
      }}
    >
      仅错题
    </Text>
  </View>
  <View
    className="px-3 py-1 rounded-full"
    style={{
      backgroundColor: selectedAction === 'all' ? '#3B82F6' : '#F3F4F6',
    }}
    onClick={selectAll}
  >
    <Text
      className="block text-xs font-semibold"
      style={{
        color: selectedAction === 'all' ? '#FFFFFF' : '#374151',
      }}
    >
      全选
    </Text>
  </View>
  <View
    className="px-3 py-1 rounded-full"
    style={{
      backgroundColor: selectedAction === 'none' ? '#6B7280' : '#F3F4F6',
    }}
    onClick={selectNone}
  >
    <Text
      className="block text-xs font-semibold"
      style={{
        color: selectedAction === 'none' ? '#FFFFFF' : '#374151',
      }}
    >
      清空
    </Text>
  </View>
</View>

                <View className="space-y-2">
                  {result?.problems.map((problem, idx) => {
                    const info = getStatusInfo(problem.status)
                    const isSelected = selectedProblemIds.has(problem.id)
                    return (
                      <View
                        key={problem.id}
                        className="p-3 rounded-xl border-2"
                        style={{
                          backgroundColor: isSelected ? info.bgColor : '#F9FAFB',
                          borderColor: isSelected ? info.color : 'transparent',
                        }}
                        onClick={() => toggleProblem(problem.id)}
                      >
                        <View className="flex items-center gap-3">
                          {/* 复选框 */}
                          <View
                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: isSelected ? info.color : '#D1D5DB',
                              backgroundColor: isSelected ? info.color : 'transparent',
                            }}
                          >
                            {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                          </View>

                          {/* 状态图标 */}
                          <View
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: info.color }}
                          >
                            <info.icon size={16} color="#FFFFFF" />
                          </View>

                          <Text className="block text-sm font-medium text-foreground">
                            第 {idx + 1} 题
                          </Text>
                          <View className="flex-1" />
                          <Text className="block text-xs" style={{ color: info.color }}>
                            {info.text}
                          </Text>
                        </View>

                        {/* P2-题目内容 + 详情（2026-06-08）：所有题都显示题干 + 正确答案/解析
                         * 修复：颜色按题目状态动态着色（正确=绿，有误=红，不清晰=橙）
                         */}
                        <View className="mt-2 pt-2 border-t border-gray-200 ml-11">
                          {problem.questionText ? (
                            <Text className="block text-xs mb-2" style={{ color: '#6B7280', lineHeight: 1.6 }}>
                              <Text className="block text-xs mb-0.5" style={{ color: '#6B7280' }}>题目：</Text>
                              {problem.questionText}
                            </Text>
                          ) : (
                            <Text className="block text-xs mb-2 italic" style={{ color: '#9CA3AF' }}>
                              第 {idx + 1} 题（题目文字未识别到）
                            </Text>
                          )}
                          {problem.correctAnswer && (
                            <Text className="block text-xs mb-1 font-medium" style={{ color: info.textColor }}>
                              正确答案：{problem.correctAnswer}
                            </Text>
                          )}
                          {problem.analysis && (
                            <Text className="block text-xs" style={{ color: info.mutedColor, lineHeight: 1.5 }}>
                              解析：{problem.analysis}
                            </Text>
                          )}
                          {problem.hint && (
                            <Text className="block text-xs mt-1" style={{ color: info.mutedColor }}>
                              提示：{problem.hint}
                            </Text>
                          )}
                          {!problem.correctAnswer && !problem.analysis && (
                            <Text className="block text-xs italic" style={{ color: info.mutedColor }}>
                              暂无详细解析（请查看原题）
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
          </CardContent>
        </Card>

        {/* 学习建议 - P1 选择题版（2026-06-07） */}
        {(() => {
          const selectedCount = selectedProblemIds.size
          const incorrectCount = result?.incorrectCount ?? 0
          const hasAnyIssue = incorrectCount > 0 || (result?.unclearCount ?? 0) > 0

          if (!hasAnyIssue && savedCount === 0) {
            // 全部正确：显示绿色庆祝
            return (
              <Card className="bg-green-50 border border-green-200 mt-4">
                <CardContent className="p-4">
                  <View className="flex items-center gap-3">
                    <CircleCheck size={24} color="#22C55E" />
                    <View className="flex-1">
                      <Text className="block text-sm font-medium text-foreground">太棒了，全部正确！🎉</Text>
                      <Text className="block text-xs text-gray-600 mt-1">继续保持，错题本今天不用新增。</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            )
          }

          return (
            <Card className="bg-warning bg-opacity-5 border border-warning bg-opacity-20 mt-4">
              <CardContent className="p-4">
                <View className="flex items-start gap-3">
                  <CircleAlert size={20} color="#F59E0B" className="flex-shrink-0" />
                  <View className="flex-1">
                    <Text className="block text-sm font-medium text-foreground mb-1">学习建议</Text>
                    {result?.learningSuggestion ? (
                      <Text className="block text-sm text-gray-600 leading-relaxed">
                        {result.learningSuggestion}
                      </Text>
                    ) : (
                      <Text className="block text-sm text-gray-600 leading-relaxed">
                        {selectedCount > 0
                          ? `已选 ${selectedCount} 道题，可保存到错题本中方便后续复习。`
                          : '请在上方勾选要保存到错题本的题目。'}
                      </Text>
                    )}

                    {savedCount > 0 ? (
                      <View className="mt-3 px-3 py-2 bg-success bg-opacity-10 rounded-lg flex items-center gap-2">
                        <CircleCheck size={16} color="#22C55E" />
                        <Text className="block text-sm text-success font-medium">已成功保存 {savedCount} 道到错题本</Text>
                      </View>
                    ) : (
                      <View
                        className="mt-3 px-3 py-2 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: selectedCount > 0 ? '#F59E0B' : '#D1D5DB',
                        }}
                        onClick={selectedCount > 0 && !isSaving ? saveMistakesToBook : undefined}
                      >
                        {isSaving ? (
                          <View className="flex items-center gap-2">
                            <LoaderCircle size={16} color="#FFFFFF" className="animate-spin" />
                            <Text className="block text-sm text-white font-medium">保存中...</Text>
                          </View>
                        ) : (
                          <View className="flex items-center gap-2">
                            <BookOpen size={16} color="#FFFFFF" />
                            <Text className="block text-sm text-white font-medium">
                              {selectedCount > 0
                                ? `保存 ${selectedCount} 道到错题本`
                                : '请先勾选题目'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </CardContent>
            </Card>
          )
        })()}
      </View>

      {/* 底部操作 */}
      <View
        className="bg-white border-t border-gray-100 p-4 pb-6"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <View className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary"
            onClick={retake}
          >
            <RotateCcw size={16} color="#F59E0B" className="mr-1" />
            重新拍照
          </Button>
          {savedCount === 0 && selectedProblemIds.size > 0 && (
            <Button
              variant="outline"
              className="flex-1 border-orange-500 text-orange-600"
              onClick={saveMistakesToBook}
            >
              <BookOpen size={16} color="#F59E0B" className="mr-1" />
              保存 {selectedProblemIds.size} 道
            </Button>
          )}
          {savedCount > 0 && (
            <Button
              variant="outline"
              className="flex-1 border-green-500 text-green-600"
              disabled
            >
              <CircleCheck size={16} color="#22C55E" className="mr-1" />
              已保存 {savedCount} 道
            </Button>
          )}
          <Button
            className="flex-1 bg-primary hover:bg-primary bg-opacity-90 text-white"
            onClick={goHome}
          >
            <House size={16} color="#FFFFFF" className="mr-1" />
            返回首页
          </Button>
        </View>
      </View>
    </View>
  )
}

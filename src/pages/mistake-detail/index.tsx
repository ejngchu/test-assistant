import { useEffect, useState, useRef } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { ArrowLeft, CircleAlert, BookOpen, Brain, CircleCheck, Camera, Lightbulb, Target, Zap, Calendar } from 'lucide-react-taro'
// 插图已上传到 COS（避免 inline 进 WeApp 主包超 2MB 限制）
const loadingAnalyzeImg = 'https://venus-mate-1426731873.cos.ap-guangzhou.myqcloud.com/illustrations/loading-analyze.png'
import { Network } from '@/network'
  import { useAppStore, MistakeItem, subjectInfo } from '@/store/appStore'
  import { Card, CardContent } from '@/components/ui/card'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Progress } from '@/components/ui/progress'
import './index.css'

export default function MistakeDetailPage() {
  const router = useRouter<{ id?: string; mode?: string; image?: string; subject?: string }>()
  const [mistake, setMistake] = useState<MistakeItem | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isNewMode, setIsNewMode] = useState(false)
  const [savedMistakeId, setSavedMistakeId] = useState<number | null>(null)
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false)
  const { mistakes, userId, fetchAll } = useAppStore()
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      // 清理分析定时器，避免在已卸载组件上 setState
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current)
        analyzeTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const { id, mode, image, subject } = router.params

    if (mode === 'add') {
      setIsNewMode(true)
      const imagePath = image ? decodeURIComponent(image) : ''
      setMistake({
        id: 'new',
        subject: (subject as MistakeItem['subject']) || 'math',
        title: '新错题',
        questionImage: imagePath,
        correctAnswer: '',
        knowledgePoints: [],
        blindPoints: [],
        createdAt: new Date().toISOString().split('T')[0],
        date: new Date().toISOString().split('T')[0],
        mastered: false,
        reviewCount: 0
      })
    } else if (id) {
      const found = mistakes.find(m => m.id === id)
      if (found) {
        setMistake(found)
        setSavedMistakeId(Number(id) || null)
      }
    }
  }, [mistakes])

  // 调用后端 /api/study/mistake/analyze 做错题分析
  const analyzeMistake = async () => {
    if (!mistake) return

    setIsAnalyzing(true)

    try {
      const res = await Network.request({
        url: '/api/study/mistake/analyze',
        method: 'POST',
        data: {
          subject: mistake.subject,
          imageUrl: mistake.questionImage
        }
      })

      if (res.data?.code !== 200 || !res.data?.data) {
        throw new Error(res.data?.msg || '分析失败')
      }

      const { title, correctAnswer, knowledgePoints, blindPoints, analysis } = res.data.data

      setMistake(prev => prev ? {
        ...prev,
        title: title || prev.title,
        correctAnswer: correctAnswer || prev.correctAnswer,
        knowledgePoints: knowledgePoints || [],
        blindPoints: blindPoints || [],
        analysis: analysis || ''
      } : null)

      Taro.showToast({ title: '分析完成', icon: 'success' })

      // 分析完成 → 自动保存到 DB（V2 单入口全自动）
      await saveMistake()
    } catch (err) {
      const message = err instanceof Error ? err.message : '分析失败，请稍后重试'
      Taro.showToast({ title: message, icon: 'error' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 保存错题到 DB（自动从分析结果保存）
  const saveMistake = async () => {
    if (!mistake || isSaving) return
    setIsSaving(true)
    try {
      const res = await Network.request({
        url: '/api/study/mistake/save',
        method: 'POST',
        data: {
          userId,
          subject: mistake.subject,
          questionImage: mistake.questionImage,
          title: mistake.title,
          correctAnswer: mistake.correctAnswer,
          knowledgePoints: mistake.knowledgePoints,
          blindPoints: mistake.blindPoints,
          analysis: mistake.analysis
        }
      })
      if (res.data?.code === 200 && res.data.data?.id) {
        setSavedMistakeId(res.data.data.id)
        // 刷新复习计划（"今日复习"数变化）
        void fetchAll()
        Taro.showToast({ title: '已加入复习计划', icon: 'success' })
      } else {
        throw new Error(res.data?.msg || '保存失败')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败'
      Taro.showToast({ title: message, icon: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  // 生成针对性练习 → 跳转到答题页
  const startPractice = async () => {
    if (!mistake || isGeneratingPractice) return
    if (mistake.knowledgePoints.length === 0) {
      Taro.showToast({ title: '请先做 AI 分析', icon: 'none' })
      return
    }
    setIsGeneratingPractice(true)
    try {
      const res = await Network.request({
        url: '/api/study/practice/generate',
        method: 'POST',
        data: {
          userId,
          subject: mistake.subject,
          knowledgePoints: mistake.knowledgePoints,
          count: 5
        }
      })
      if (res.data?.code === 200 && res.data.data?.id) {
        Taro.navigateTo({ url: `/pages/practice-answer/index?taskId=${res.data.data.id}` })
      } else {
        throw new Error(res.data?.msg || '生成练习失败')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成练习失败'
      Taro.showToast({ title: message, icon: 'error' })
    } finally {
      setIsGeneratingPractice(false)
    }
  }

  // 从相册选择
  const chooseImage = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (res) => {
        const imagePath = res.tempFilePaths[0]
        setMistake(prev => prev ? {
          ...prev,
          questionImage: imagePath
        } : null)

        // 自动触发分析（带 ref 清理，防止卸载后 setState）
        if (isNewMode) {
          analyzeTimeoutRef.current = setTimeout(() => {
            analyzeTimeoutRef.current = null
            analyzeMistake()
          }, 500)
        }
      }
    })
  }

  // 返回上一页
  const goBack = () => {
    Taro.navigateBack()
  }

  // 标记为已掌握
  const markAsMastered = () => {
    setMistake(prev => prev ? { ...prev, mastered: !prev.mastered } : null)
    Taro.showToast({ 
      title: mistake?.mastered ? '已取消掌握' : '已掌握', 
      icon: 'success' 
    })
  }

  // 复习错题
  // (已合并到 review 列表页面入口)

  if (!mistake) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="block text-gray-500">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background pb-6">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white sticky top-0 z-10">
        <View className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full bg-gray-100"
            onClick={goBack}
          >
            <ArrowLeft size={20} color="#4B5563" />
          </Button>
          <Text className="block text-lg font-semibold text-foreground">错题详情</Text>
        </View>
      </View>

      <View className="px-4 py-4 space-y-4">
        {/* 错题图片 */}
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-0">
            {mistake.questionImage ? (
              <View>
                <Image
                  src={mistake.questionImage}
                  className="w-full"
                  mode="widthFix"
                  onClick={chooseImage}
                />
                <View className="p-3 bg-gray-50">
                  <Text className="block text-center text-sm text-gray-500">
                    点击图片可重新上传
                  </Text>
                </View>
              </View>
            ) : (
              <View
                className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center"
                onClick={chooseImage}
              >
                <Camera size={48} color="#D1D5DB" />
                <Text className="block text-sm text-gray-400 mt-2">点击上传错题图片</Text>
                <Text className="block text-xs text-gray-400 mt-1">支持拍照或从相册选择</Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* 错题信息 */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-3">
              <Badge
                className="text-xs px-2 py-1"
                style={{
                  backgroundColor: subjectInfo[mistake.subject].bgColor,
                  color: subjectInfo[mistake.subject].color
                }}
              >
                {subjectInfo[mistake.subject].name}
              </Badge>
              <Badge className={`text-xs px-2 py-1 ${
                mistake.mastered ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'
              }`}
              >
                {mistake.mastered ? '已掌握' : '学习中'}
              </Badge>
              {mistake.analysis && (
                <Badge className="text-xs px-2 py-1 bg-primary bg-opacity-10 text-primary">
                  已分析
                </Badge>
              )}
            </View>
            
            <Text className="block text-base font-semibold text-foreground mb-2">
              {mistake.title || '错题标题'}
            </Text>
            
            {mistake.correctAnswer && (
              <View className="mt-3 p-3 bg-success bg-opacity-5 rounded-xl">
                <View className="flex items-center gap-2 mb-2">
                  <CircleCheck size={16} color="#10B981" />
                  <Text className="block text-xs font-medium text-gray-700">正确答案</Text>
                </View>
                <Text className="block text-sm font-medium text-success">
                  {mistake.correctAnswer}
                </Text>
              </View>
            )}

            {/* 掌握进度 */}
            {mistake.analysis && (
              <View className="mt-3 p-3 bg-gray-50 rounded-xl">
                <View className="flex items-center justify-between mb-2">
                  <Text className="block text-xs font-medium text-gray-700">掌握进度</Text>
                  <Text className="block text-xs text-primary">65%</Text>
                </View>
                <Progress value={65} className="w-full h-2" />
                <View className="flex items-center gap-1 mt-2">
                  <Lightbulb size={14} color="#F59E0B" />
                  <Text className="block text-xs text-gray-600">建议重点复习：余数概念</Text>
                </View>
              </View>
            )}
          </CardContent>
        </Card>

        {/* 错误分析 */}
        {mistake.analysis && (
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-3">
                <Brain size={18} color="#F59E0B" />
                <Text className="block text-sm font-semibold text-foreground">错误分析</Text>
              </View>
              <View className="p-3 bg-primary bg-opacity-5 rounded-xl">
                <Text className="block text-sm text-gray-700 leading-relaxed">
                  {mistake.analysis}
                </Text>
              </View>

              {/* 相关概念 */}
              <View className="mt-3">
                <Text className="block text-xs font-medium text-gray-500 mb-2">相关概念</Text>
                <View className="flex flex-wrap gap-2">
                  {['除法 basics', '整除概念', '余数性质'].map((concept, idx) => (
                    <View key={idx} className="px-3 py-2 bg-blue-50 rounded-full">
                      <Text className="block text-xs text-blue-600">{concept}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 学习建议 */}
              <View className="mt-3 p-3 bg-green-50 rounded-xl">
                <View className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} color="#10B981" />
                  <Text className="block text-xs font-medium text-green-800">学习建议</Text>
                </View>
                <Text className="block text-xs text-green-700 leading-relaxed">
                  建议先复习除法的基本概念，理解&ldquo;被除数 = 除数 × 商 + 余数&rdquo;的关系，然后通过练习巩固。
                </Text>
              </View>

              {/* 学习路径 */}
              <View className="mt-3 p-3 bg-blue-50 rounded-xl">
                <View className="flex items-center gap-2 mb-2">
                  <Target size={16} color="#3B82F6" />
                  <Text className="block text-xs font-medium text-blue-800">推荐学习路径</Text>
                </View>
                <View className="space-y-2">
                  {['1. 复习除法基本概念和术语', '2. 理解"被除数 = 除数 × 商 + 余数"', '3. 通过例子理解余数小于除数', '4. 练习有余数除法竖式', '5. 完成专项练习'].map((step, idx) => (
                    <View key={idx} className="flex items-start gap-2">
                      <View className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                        <Text className="block text-xs text-blue-800">{idx + 1}</Text>
                      </View>
                      <Text className="block text-xs text-blue-700 flex-1">{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 知识点分析 */}
        {mistake.knowledgePoints.length > 0 && (
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-3">
                <BookOpen size={18} color="#F59E0B" />
                <Text className="block text-sm font-semibold text-foreground">涉及的知识点</Text>
              </View>
              <View className="flex flex-wrap gap-2">
                {mistake.knowledgePoints.map((point, idx) => (
                  <View key={idx} className="px-3 py-2 bg-primary bg-opacity-10 rounded-full">
                    <Text className="block text-xs text-primary">{point}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* 知识盲点 */}
        {mistake.blindPoints.length > 0 && (
          <Card className="bg-white border border-red-200">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-3">
                <Target size={18} color="#EF4444" />
                <Text className="block text-sm font-semibold text-foreground">知识盲点</Text>
              </View>
              <View className="space-y-2">
                {mistake.blindPoints.map((point, idx) => (
                  <View key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                    <View className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <Text className="block text-sm text-gray-700 flex-1">{point}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* 分析按钮 — P3（2026-06-08）：如果有 knowledgePoints（来自 homework check），跳过 */}
        {isNewMode && mistake.knowledgePoints.length === 0 && (
          <View>
            {isAnalyzing && (
              // F-03 插画版 loading
              <View className="flex flex-col items-center py-4">
                <Image
                  src={loadingAnalyzeImg}
                  className="w-32 h-32 mb-3"
                  mode="aspectFit"
                />
                <Text className="text-sm text-gray-500">AI 正在分析中...</Text>
              </View>
            )}
            <Button
              className="w-full bg-primary text-white"
              disabled={isAnalyzing}
              onClick={analyzeMistake}
            >
            {isAnalyzing ? (
              <>
                <View className="w-4 h-4 rounded-full border-2 border-white border-opacity-30 border-t-transparent animate-spin mr-2" />
                正在分析...
              </>
            ) : (
              <>
                <CircleAlert size={16} color="#FFFFFF" className="mr-1" />
                智能分析错题
              </>
            )}
          </Button>
          </View>
        )}

        {/* 操作按钮（V2: 一键开始练习 + 已加入复习提示） */}
        <View className="space-y-3">
          {/* 开始练习 - 主操作 — P3（2026-06-08）：数据已存在时直接可用 */}
          <Button
            className="w-full bg-primary text-white"
            disabled={isGeneratingPractice || mistake.knowledgePoints.length === 0}
            onClick={startPractice}
          >
            {isGeneratingPractice ? (
              <>
                <View className="w-4 h-4 rounded-full border-2 border-white border-opacity-30 border-t-transparent animate-spin mr-2" />
                生成中...
              </>
            ) : (
              <>
                <Zap size={16} color="#FFFFFF" className="mr-1" />
                {mistake.knowledgePoints.length === 0 ? '请先做 AI 分析' : '开始练习'}
              </>
            )}
          </Button>

          {/* 已加入复习 - 灰显提示（V2: 自动加入） */}
          {savedMistakeId !== null && (
            <View className="w-full bg-success bg-opacity-5 rounded-xl p-3 flex items-center gap-2">
              <Calendar size={16} color="#10B981" />
              <Text className="block text-sm text-success font-medium">已加入复习计划</Text>
              <Text className="block text-xs text-gray-500 ml-auto">按艾宾浩斯曲线自动安排</Text>
            </View>
          )}

          {/* 标记掌握 - 次要操作 */}
          <Button
            variant="outline"
            className="w-full border-primary text-primary"
            onClick={markAsMastered}
          >
            <CircleCheck size={16} color="#F59E0B" className="mr-1" />
            {mistake?.mastered ? '取消掌握' : '标记掌握'}
          </Button>
        </View>
      </View>
    </View>
  )
}

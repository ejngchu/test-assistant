import { useState, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { ArrowLeft, CircleX, CircleCheck, CircleAlert } from 'lucide-react-taro'
import { useAppStore, subjectInfo, PracticeQuestion } from '@/store/appStore'
import { playSound } from '@/lib/sound'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import './index.css'

// Fallback: 当 URL 没传 id（用户直接进入）或 store 里找不到 task 时使用
const FALLBACK_QUESTIONS: PracticeQuestion[] = [
  {
    id: '1',
    subject: 'math',
    knowledgePoint: '有余数除法',
    content: '小明有23颗糖果，平均分给4个小朋友，每个小朋友能分到几颗糖果？还剩几颗？',
    options: [
      { key: 'A', value: '5颗，剩3颗' },
      { key: 'B', value: '6颗，剩0颗' },
      { key: 'C', value: '5颗，剩2颗' },
      { key: 'D', value: '6颗，剩1颗' }
    ],
    answer: 'A',
    difficulty: 'medium'
  },
  {
    id: '2',
    subject: 'math',
    knowledgePoint: '有余数除法',
    content: '用竖式计算：45 ÷ 6 = ?',
    options: [
      { key: 'A', value: '7 …… 3' },
      { key: 'B', value: '7 …… 5' },
      { key: 'C', value: '8 …… 3' },
      { key: 'D', value: '6 …… 9' }
    ],
    answer: 'A',
    difficulty: 'easy'
  },
  {
    id: '3',
    subject: 'math',
    knowledgePoint: '有余数除法',
    content: '一个数除以5，商是8，余数是3，这个数是（ ）。',
    options: [
      { key: 'A', value: '38' },
      { key: 'B', value: '43' },
      { key: 'C', value: '40' },
      { key: 'D', value: '45' }
    ],
    answer: 'B',
    difficulty: 'medium'
  }
]
const FALLBACK_TITLE = '除法巩固练习'

export default function PracticeAnswerPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isCompleted, setIsCompleted] = useState(false)

  const router = useRouter<{ id?: string }>()
  const practiceTasks = useAppStore(s => s.practiceTasks)

  // 从 URL 解析 task；如果 task 带 questions 就用它，否则用 fallback
  const { questions, title } = useMemo(() => {
    const id = router.params.id
    const task = id ? practiceTasks.find(t => t.id === id) : undefined
    if (task && task.questions && task.questions.length > 0) {
      return { questions: task.questions, title: task.title }
    }
    return { questions: FALLBACK_QUESTIONS, title: FALLBACK_TITLE }
  }, [router.params.id, practiceTasks])

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length

  // 选择答案
  const selectAnswer = (key: string) => {
    if (showResult) return
    setSelectedAnswer(key)
  }

  // 提交答案
  const submitAnswer = () => {
    if (!selectedAnswer) {
      Taro.showToast({ title: '请选择答案', icon: 'none' })
      return
    }

    const correct = selectedAnswer === currentQuestion.answer
    setIsCorrect(correct)
    setShowResult(true)
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedAnswer }))
    // F-04: 答对/答错音效
    playSound(correct ? 'correct' : 'wrong')
  }

  // 下一题 / 完成练习
  const nextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer('')
      setShowResult(false)
      setIsCorrect(false)
    } else {
      // 最后一题答完：进入完成页
      setIsCompleted(true)
      setShowResult(false)
    }
  }

  // 返回列表
  const goBack = () => {
    Taro.navigateBack()
  }

  // 计算正确率（基于解析后的 questions）
  const getAccuracy = () => {
    if (totalQuestions === 0) return 0
    const correctCount = Object.entries(answers).filter(([qId, ans]) => {
      const q = questions.find(qq => qq.id === qId)
      return q && ans === q.answer
    }).length
    return Math.round((correctCount / totalQuestions) * 100)
  }

  // 获取难度样式
  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { bg: 'bg-success bg-opacity-10', color: 'text-success', text: '简单' }
      case 'medium': return { bg: 'bg-warning bg-opacity-10', color: 'text-warning', text: '中等' }
      case 'hard': return { bg: 'bg-error bg-opacity-10', color: 'text-error', text: '困难' }
      default: return { bg: 'bg-gray-100', color: 'text-gray-500', text: '未知' }
    }
  }

  // 练习完成页面
  if (isCompleted) {
    const accuracy = getAccuracy()
    const correctCount = Object.entries(answers).filter(([qId, ans]) => {
      const q = questions.find(qq => qq.id === qId)
      return q && ans === q.answer
    }).length

    return (
      <View className="min-h-screen bg-background flex flex-col">
        <View className="flex-1 flex flex-col items-center justify-center px-6">
          <View className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
            accuracy >= 80 ? 'bg-success bg-opacity-20' : accuracy >= 60 ? 'bg-warning bg-opacity-20' : 'bg-error bg-opacity-20'
          }`}
          >
            {accuracy >= 80 ? (
              <CircleCheck size={40} color="#22C55E" />
            ) : accuracy >= 60 ? (
              <CircleAlert size={40} color="#F59E0B" />
            ) : (
              <CircleX size={40} color="#EF4444" />
            )}
          </View>
          
          <Text className="block text-2xl font-bold text-foreground mb-2">
            {accuracy >= 80 ? '太棒了！' : accuracy >= 60 ? '还不错！' : '继续加油！'}
          </Text>
          
          <Text className="block text-base text-gray-500 mb-8">
            {accuracy >= 80 ? '继续保持这个水平！' : '多练习一定能进步！'}
          </Text>
          
          <View className="w-full bg-white rounded-2xl p-4 mb-6">
            <View className="flex justify-around">
              <View className="text-center">
                <Text className="block text-3xl font-bold text-primary">{accuracy}%</Text>
                <Text className="block text-sm text-gray-500 mt-1">正确率</Text>
              </View>
              <View className="text-center">
                <Text className="block text-3xl font-bold text-success">{correctCount}</Text>
                <Text className="block text-sm text-gray-500 mt-1">答对</Text>
              </View>
              <View className="text-center">
                <Text className="block text-3xl font-bold text-error">{totalQuestions - correctCount}</Text>
                <Text className="block text-sm text-gray-500 mt-1">答错</Text>
              </View>
            </View>
          </View>
          
          <View className="w-full space-y-3">
            <Button
              className="w-full bg-primary text-white"
              onClick={() => {
                setCurrentIndex(0)
                setSelectedAnswer('')
                setShowResult(false)
                setIsCorrect(false)
                setAnswers({})
                setIsCompleted(false)
              }}
            >
              再练一次
            </Button>
            <Button
              variant="outline"
              className="w-full border-primary text-primary"
              onClick={goBack}
            >
              返回练习中心
            </Button>
          </View>
        </View>
      </View>
    )
  }

  // 安全兜底：当前题目不存在（异常场景）
  if (!currentQuestion) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center px-6">
        <View className="text-center">
          <Text className="block text-lg text-gray-500 mb-4">题目加载失败</Text>
          <Button variant="outline" onClick={goBack}>返回练习中心</Button>
        </View>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background pb-6">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white sticky top-0 z-10">
        <View className="flex items-center justify-between mb-3">
          <View className="flex items-center gap-3">
            <View 
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              onClick={goBack}
            >
              <ArrowLeft size={20} color="#4B5563" />
            </View>
            <Text className="block text-base font-semibold text-foreground">{title}</Text>
          </View>
          <View className="px-3 py-1 bg-primary bg-opacity-10 rounded-full">
            <Text className="block text-sm font-medium text-primary">
              {currentIndex + 1}/{totalQuestions}
            </Text>
          </View>
        </View>
        
        {/* 进度条 */}
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <View 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </View>
      </View>

      {/* 题目内容 */}
      <View className="px-4 py-4">
        {/* 题目信息 */}
        <View className="flex items-center gap-2 mb-3">
          <Badge 
            className="text-xs px-2 py-1"
            style={{
              backgroundColor: subjectInfo[currentQuestion.subject].bgColor,
              color: subjectInfo[currentQuestion.subject].color
            }}
          >
            {subjectInfo[currentQuestion.subject].name}
          </Badge>
          <Badge className={`text-xs px-2 py-1 ${getDifficultyStyle(currentQuestion.difficulty).bg} ${getDifficultyStyle(currentQuestion.difficulty).color}`}>
            {getDifficultyStyle(currentQuestion.difficulty).text}
          </Badge>
          <Badge className="text-xs px-2 py-1 bg-gray-100 text-gray-500">
            {currentQuestion.knowledgePoint}
          </Badge>
        </View>

        {/* 题目 */}
        <Card className="bg-white mb-4">
          <CardContent className="p-4">
            <Text className="block text-base font-medium text-foreground leading-relaxed">
              {currentQuestion.content}
            </Text>
          </CardContent>
        </Card>

        {/* 选项 */}
        <View className="space-y-3">
          {currentQuestion.options?.map((option) => {
            const isSelected = selectedAnswer === option.key
            const isCorrectAnswer = option.key === currentQuestion.answer
            const showCorrect = showResult && isCorrectAnswer
            const showWrong = showResult && isSelected && !isCorrectAnswer
            
            return (
              <View
                key={option.key}
                className={`bg-white rounded-xl p-4 flex items-center gap-3 transition-all ${
                  showCorrect ? 'border-2 border-success bg-success bg-opacity-5' :
                  showWrong ? 'border-2 border-error bg-error bg-opacity-5' :
                  isSelected ? 'border-2 border-primary bg-primary bg-opacity-5' :
                  'border border-gray-100'
                }`}
                onClick={() => selectAnswer(option.key)}
              >
                <View className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-medium ${
                  showCorrect ? 'bg-success text-white' :
                  showWrong ? 'bg-error text-white' :
                  isSelected ? 'bg-primary text-white' :
                  'bg-gray-100 text-gray-600'
                }`}
                >
                  {showCorrect ? (
                    <CircleCheck size={16} color="#FFFFFF" />
                  ) : showWrong ? (
                    <CircleX size={16} color="#FFFFFF" />
                  ) : (
                    option.key
                  )}
                </View>
                <Text className={`block text-sm font-medium flex-1 ${
                  showCorrect ? 'text-success' :
                  showWrong ? 'text-error' :
                  'text-foreground'
                }`}
                >
                  {option.value}
                </Text>
              </View>
            )
          })}
        </View>

        {/* 解析（答错后显示） */}
        {showResult && !isCorrect && (
          <Card className="bg-warning bg-opacity-5 border border-warning border-opacity-20 mt-4">
            <CardContent className="p-4">
              <View className="flex items-start gap-3">
                <CircleAlert size={18} color="#F59E0B" className="flex-shrink-0 mt-1" />
                <View>
                  <Text className="block text-sm font-medium text-foreground mb-1">解题思路</Text>
                  <Text className="block text-sm text-gray-600 leading-relaxed">
                    正确答案是 {currentQuestion.answer}。{currentQuestion.knowledgePoint}需要多加练习，加油！
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}
      </View>

      {/* 底部按钮 */}
      <View
        className="bg-white border-t border-gray-100 p-4 pb-6"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }}
      >
        {!showResult ? (
          <Button
            className="w-full bg-primary text-white"
            disabled={!selectedAnswer}
            onClick={submitAnswer}
          >
            确认答案
          </Button>
        ) : (
          <Button
            className="w-full bg-primary text-white"
            onClick={nextQuestion}
          >
            {currentIndex < totalQuestions - 1 ? '下一题' : '完成练习'}
          </Button>
        )}
      </View>
    </View>
  )
}

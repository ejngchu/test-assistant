import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { CircleCheck, CircleX, CircleAlert, RotateCcw, House } from 'lucide-react-taro'
import { subjectInfo } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import './index.css'

interface ProblemResult {
  id: string
  status: 'correct' | 'incorrect' | 'unclear'
  hint?: string
  position?: { x: number; y: number; width: number; height: number }
}

interface AnalysisResult {
  completed: boolean
  totalProblems: number
  correctCount: number
  incorrectCount: number
  unclearCount: number
  problems: ProblemResult[]
}

export default function HomeworkResultPage() {
  const [, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [subject, setSubject] = useState('')

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params || {}
    const { subject: s, image } = params
    if (s) setSubject(s)
    if (image) setImageUrl(decodeURIComponent(image))
    
    // 模拟AI分析
    setTimeout(() => {
      setIsLoading(false)
      // 模拟结果
      setResult({
        completed: true,
        totalProblems: 5,
        correctCount: 3,
        incorrectCount: 1,
        unclearCount: 1,
        problems: [
          { id: '1', status: 'correct' },
          { id: '2', status: 'correct' },
          { id: '3', status: 'incorrect', hint: '请检查第3题的答案' },
          { id: '4', status: 'correct' },
          { id: '5', status: 'unclear', hint: '图片不清晰，请重新拍摄' }
        ]
      })
    }, 1500)
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
        return { icon: CircleCheck, color: '#22C55E', bg: 'bg-success bg-opacity-10', text: '已完成' }
      case 'incorrect': 
        return { icon: CircleX, color: '#EF4444', bg: 'bg-error bg-opacity-10', text: '有误' }
      case 'unclear': 
        return { icon: CircleAlert, color: '#F59E0B', bg: 'bg-warning bg-opacity-10', text: '不清晰' }
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
    <View className="min-h-screen bg-background pb-6">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white">
        <View className="flex items-center justify-between">
          <Text className="block text-lg font-semibold text-foreground">作业检查结果</Text>
          <Badge 
            className="text-xs px-2 py-1"
            style={{
              backgroundColor: subjectInfo[subject as keyof typeof subjectInfo]?.bgColor || '#E5E7EB',
              color: subjectInfo[subject as keyof typeof subjectInfo]?.color || '#6B7280'
            }}
          >
            {subjectInfo[subject as keyof typeof subjectInfo]?.name || subject}
          </Badge>
        </View>
      </View>

      {/* 总体结果 */}
      <View className="px-4 py-4">
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-0">
            {/* 统计概览 */}
            <View className="p-4" style={{ background: 'linear-gradient(to right, rgba(245, 158, 11, 0.1), rgba(34, 197, 94, 0.1))' }}>
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

            {/* 问题列表 */}
            <View className="p-4">
              <Text className="block text-sm font-medium text-foreground mb-3">作业完成情况</Text>
              <View className="space-y-2">
                {result?.problems.map((problem, idx) => {
                  const info = getStatusInfo(problem.status)
                  return (
                    <View 
                      key={problem.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${info.bg}`}
                    >
                      <View className="flex items-center gap-3">
                        <View 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: info.color }}
                        >
                          <info.icon size={16} color="#FFFFFF" />
                        </View>
                        <Text className="block text-sm font-medium text-foreground">
                          第 {idx + 1} 题
                        </Text>
                      </View>
                      <View className="flex items-center gap-2">
                        <Text className="block text-xs" style={{ color: info.color }}>
                          {info.text}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 建议 */}
        {(result?.incorrectCount ?? 0) > 0 && (
          <Card className="bg-warning bg-opacity-5 border border-warning bg-opacity-20 mt-4">
            <CardContent className="p-4">
              <View className="flex items-start gap-3">
                <CircleAlert size={20} color="#F59E0B" className="flex-shrink-0" />
                <View>
                  <Text className="block text-sm font-medium text-foreground mb-1">学习建议</Text>
                  <Text className="block text-sm text-gray-600 leading-relaxed">
                    有 {result?.incorrectCount} 道题目需要订正，建议将这些错题保存到错题本中，方便后续复习。
                  </Text>
                  <View 
                    className="mt-3 px-3 py-2 bg-white rounded-lg"
                    onClick={() => Taro.navigateTo({ url: '/pages/mistakes/index' })}
                  >
                    <Text className="block text-sm text-primary font-medium">保存到错题本</Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        )}
      </View>

      {/* 底部操作 */}
      <View className="px-4 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6">
        <View className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary"
            onClick={retake}
          >
            <RotateCcw size={16} color="#F59E0B" className="mr-1" />
            重新拍照
          </Button>
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
